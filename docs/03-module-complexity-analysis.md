# Module Complexity Analysis

Time and space complexity for **every module** in the repository, derived from the
actual implementations (not from the intent). Complexity is expressed in terms of the
size of the data being processed at that point, not in terms of database size, unless
stated.

## Notation

| Symbol | Meaning |
|---|---|
| `n` | number of documents returned by **one** upstream system for a VIN |
| `N` | total number of VINs loaded for autocomplete (`= |V_sales ∪ V_service|`) |
| `m` | length of a VIN = **17** (constant in practice) |
| `p` | length of the typed search prefix (`p ≤ 17`) |
| `k` | number of VINs matching a prefix (suggestions returned) |
| `f` | number of JSON frames = **2** (SALES, SERVICE) |
| `L` | total bytes of the NDJSON response |
| `c` | number of columns in a table (`12` for both fixtures) |
| `S` | number of sources being aggregated (`2` today) |

> Because `m` is fixed at 17 and `f`/`S` are fixed at 2, most "linear in length" steps
> below are effectively **O(1)**. They are shown symbolically so the analysis remains
> correct if those constants ever change (e.g. a longer identifier format).

---

## 1. Summary table

| Module | Function | Time | Space | Notes |
|---|---|---|---|---|
| `middlewares/validation` | `validateVin` | **O(m)** | O(m) | regex over ≤17 chars |
| | `validateIfAnySpecialChar` | **O(m)** | O(m) | regex over ≤17 chars |
| `controllers/document` | `searchDocs` | **O(T_sales ∥ T_service + Σ nᵢ log nᵢ)** | O(Σ nᵢ) | streamed; time dominated by upstreams |
| | `_buildMessage` | O(1) | O(1) | |
| `services/document` | `searchDocs` | **O(max(T_sales, T_service) + n_s log n_s + n_v log n_v)** | O(n_s + n_v) | parallel fan-out |
| | `_fetchSource` | **O(n log n)** compute, O(T) wall | O(n) | per source |
| `adapters` | `mapSalesDocument` / `mapServiceDocument` | **O(1)** | O(1) | fixed number of fields |
| | `sortDocuments` | **O(n log n)** | O(n) | copy + `Array.sort` |
| `clients/base` | `getDocuments` | **O(n · c)** parse | O(n · c) | `response.json()` |
| | `instance` | O(1) avg | O(#classes) | `Map` lookup |
| `clients/sales`, `clients/service` | `fetchDocuments` / `fetchVins` | O(m) setup + network | O(m) | |
| `services/suggestion` | `VinTrie.insert` | **O(m)** | **O(m)** | one node per char |
| | `VinTrie.query` | **O(p + k·m)** | **O(p + k·m)** | DFS from prefix node |
| | `_fetchAllVinId` | **O(N·m)** | **O(N·m)** | build once at startup |
| `database/sqlite.config` | `inferColumns` | **O(R · c)** | O(c) | R = rows in fixture |
| | `buildDatabaseFromJson` | **O(R · c)** + I/O | O(R · c) | one transaction |
| | `findByVin` | **O(log R + n)** | O(n) | indexed `vin` lookup¹ |
| | `loadAllVin` | **O(R)** | **O(R)** | full scan + full transfer |
| `mocks/*.server` | `/docs` handler | **O(n)** + optional delay | O(n) | |
| | `/vin` handler | **O(R)** | O(R) | |
| `frontend` | `SearchSuggestionComp` debounce | O(1) per keystroke | O(1) | timer reset |
| | `SearchBar.submit` | O(m) | O(m) | regex validation |
| | `DocumentViewerContainer.toggleRow` | **O(|expanded|)** per toggle | **O(#expanded)** | Set copy each toggle |
| | `DocumentTable` render | **O(n)** per source | O(n) | |
| | `formatDate` / `formatAmount` / `formatDocumentType` / `formatOdometer` | **O(1)** (O(len) string) | O(1) | |
| | `useVehicleDocuments` state update | **O(f)** overall | O(Σ nᵢ) | one object spread per frame |
| | `fetchDocumentsByVin` (stream reader) | **O(L)** | **O(L)** worst, O(line) typical | `buffer.slice` per line² |

¹ SQLite only auto-indexes `PRIMARY KEY` and `UNIQUE`; `vin` is a plain column in the
generated schema, so `findByVin` is actually **O(R)** today. See §7.
² Each `buffer.slice(newlineIndex + 1)` copies the remaining buffer — see §8.

---

## 2. Backend — request path

### 2.1 `validateVin` — `backend/src/middlewares/validation.middleware.ts`

```
trim (O(len)) → toUpperCase (O(len)) → /^[A-HJ-NPR-Z0-9]{17}$/.test (O(len))
```
- **Time:** O(m) = O(17), i.e. **O(1)**.
- **Space:** O(m) for the normalised string.
- Called before **any** I/O, so invalid input costs no upstream work.

### 2.2 `DocumentController.searchDocs` — `controllers/document.controller.ts`

Work per request:
1. Header checks: O(1).
2. `res.write(JSON.stringify(body))` per frame: `JSON.stringify` is **O(size of frame) = O(n)**.
3. Total across frames: **O(Σ nᵢ)** serialisation + stream I/O.
4. Awaiting `searchDocs`: dominated by upstream latency, not this controller.

- **Time:** `O(T_sales ∥ T_service) + O(Σ nᵢ log nᵢ)` (the sort happens inside the service).
- **Space:** O(Σ nᵢ) for the per-frame payloads (documents are sent one source at a time,
  so peak memory is the larger single frame, not the sum, on the writing side; the
  service itself holds both outcomes).
- **Constant-time work:** `res.status()`, `res.setHeader()` ×3, `res.flushHeaders()`,
  `res.on('close')`, `res.off(...)` — each O(1).

### 2.3 `DocumentService.searchDocs` — `services/document.service.ts`

```ts
await Promise.all([
  this._fetchSource(SALES …).then(onChunk),
  this._fetchSource(SERVICE …).then(onChunk),
]);
```

- **Time:** `max(T_sales, T_service) + Σᵢ O(nᵢ log nᵢ)`.
  - The two fetches run **concurrently**; the wall-clock cost is the *slower* one, not the sum.
  - Each source's processing (map → sort) happens as soon as its fetch resolves, so
    sorting overlaps the other source's network wait.
- **Space:** O(n_s + n_v) for both result sets + cache entries.
- **Bound:** `Tᵢ ≤ UPSTREAM_TIMEOUT_MS` (3 s), so worst-case time is bounded by
  `min(max(T_i), 3 s) + sort`.

### 2.4 `DocumentService._fetchSource`

| Step | Complexity |
|---|---|
| `AbortSignal.timeout(...)` | O(1) |
| `fetchRaw(signal)` → network | `O(T)` wall, O(1) CPU |
| `m_cache.get(cacheKey)` — `Map` hash lookup on `${VIN}-${SOURCE}` | **O(m)** to build key, O(1) expected lookup |
| `rawDocs.map(adapt)` | **O(n)** |
| `sortDocuments(...)` | **O(n log n)** |
| `m_cache.set(...)` | O(1) expected |
| **Total** | **O(n log n)** time, **O(n)** space |

Defensive behaviour worth noting: the `try/catch` converts *any* thrown error into a
resolved `error` frame in O(1), so the surrounding `Promise.all` has complexity
`max(...)` and can never reject.

### 2.5 Adapters — `adapters/document.adapters.ts`

- `mapSalesDocument`, `mapServiceDocument`: fixed field list — **O(1)** time, **O(1)** space
  (the `details` object has 3–5 keys regardless of input size).
- `sortDocuments`: **O(n log n)** time (Timsort / V8 hybrid sort, worst case O(n log n)),
  **O(n)** space because of `[...documents]` (non-mutating copy).
  - Comparator is **O(1)** amortised — `localeCompare` on two ≤10-character ISO dates,
    nulls handled first.

### 2.6 Clients — `clients/*.client.ts`

`BaseHttpClient.getDocuments`:
- `fetch(url, {signal})`: network-bound.
- `await response.json()`: parse cost **O(n · c)** where `c` = fields per document.
- Validation (`Array.isArray`, `body.success`): O(1).
- **Total:** O(n · c) time, O(n · c) space (the response must be materialised).
- `BaseHttpClient.instance()` uses a static `Map` keyed by class — **O(1)** expected;
  one entry per subclass, **O(#subclasses)** total space.

`SalesClient.fetchDocuments` / `ServiceClient.fetchDocuments`:
- Build `URL`, set two query params: O(m).
- Delegate to `getDocuments`: O(n · c).

---

## 3. Backend — autocomplete path

### 3.1 `VinTrie.insert(vin)`

```
for each char of upper-cased vin (m chars):
    Map.has → Map.get / Map.set     // O(1) expected each
```
- **Time:** **O(m)** = O(17).
- **Space:** **O(m)** nodes in the worst case (shared prefixes reduce this).

### 3.2 `VinTrie.query(prefix)`

Phase 1 — descend the prefix: **O(p)**.
Phase 2 — DFS from that node, yielding every terminal descendant:

```
for each matching terminal:
    yield currentPrefix        // currentPrefix + char concatenated per edge
```

- Number of nodes visited ≈ O(k · m) in the worst case (k results, each up to m deep;
  shared prefixes reduce this).
- String concatenation `currentPrefix + char` copies the path (**O(m)** per step).
- **Time:** **O(p + k · m)**.
- **Space:** O(p + k · m) output + O(depth) generator stack per branch.
- With `m = 17` this is effectively **O(p + k)** — far better than the
  **O(N)** scan per keystroke of a naïve approach.

### 3.3 `SuggestionService._fetchAllVinId`

```
Promise.allSettled([sales.fetchVins, service.fetchVins])     // concurrent: max(T_s, T_v)
for item of sales.value:      m_vins.add(item.vin)           // O(V_s)
for item of service.value:    m_vins.add(item.vin)           // O(V_v)
for str of m_vins:            trie.insert(str)               // O(N · m)
```
- **Time:** `max(T_s, T_v) + O(N · m)`, run **once at construction**.
- **Space:** O(N) `Set` + **O(N · m)** Trie.
- De-duplication via `Set` is why shared VINs (the generator makes 80 % overlap) are
  inserted once.

### 3.4 `SuggestionController.loadSuggestion`

- `Array.from(generator)` materialises all k results: **O(k)** (plus the DFS cost above).
- **Time:** O(p + k · m), **Space:** O(k).

---

## 4. Backend — data layer (development tooling + mocks)

### 4.1 `inferColumns(rows, PK)` — `database/sqlite.config.ts`

```
for row of rows:            // R rows
    for [key, value] of entries(row)   // c columns
```
- **Time:** **O(R · c)**, **Space:** O(c) (column map is bounded by number of distinct keys).

### 4.2 `buildDatabaseFromJson`

- `fs.readFile` + `JSON.parse`: **O(R · c)** time and space.
- `inferColumns`: O(R · c).
- `CREATE TABLE`, `prepare`: O(c).
- Insert loop: R × (prepare bound values O(c) + SQLite insert O(log R) with PK index) =
  **O(R · (c + log R))**.
- One `BEGIN … COMMIT`: removes per-row fsync, turning R transactions into 1.
- **Time:** **O(R · (c + log R))**; **Space:** O(R · c) (parsed JSON + statement).
- Runs only from `npm run db:generate`, never on the request path.

### 4.3 `DocumentStore.findByVin`

```sql
SELECT * FROM sales_documents WHERE vin = ? ORDER BY sale_date DESC
```
- **Time:** **O(R)** with today's schema — `vin` is **not indexed**, so SQLite does a
  full scan; `ORDER BY` on `sale_date` (also unindexed) adds `O(n log n)` on the
  matching rows.
- With `PRIMARY KEY`-only indexing, `document_id` lookups would be O(log R); a `CREATE INDEX
  ON …(vin, sale_date) ON` would make it **O(log R + n)** (see §7).
- **Space:** O(n) for the result set.
- `loadAllVin`: **O(R)** time, **O(R)** transfer.

### 4.4 Mock servers — `mocks/*.server.ts`

- `/api/{sales,service}/docs`: `findByVin` (see above) + `JSON.stringify(rows)`
  **O(n · c)**. Optional `setTimeout` latency is O(1) scheduled, O(delay) wall.
- `/api/{sales,service}/vin`: `loadAllVin` **O(R)** + serialise **O(R · c)**.
- Each mock is a single Node process with one read-only SQLite connection; HTTP
  concurrency is handled by the event loop (I/O-bound queries do not block the CPU
  beyond JSON parsing).

---

## 5. Frontend

### 5.1 `SearchBar` / `SearchSuggestionComp`

| Step | Complexity |
|---|---|
| Keypress: `toUpperCase`, `setKeyword`, `updateQuery` | O(len) = O(1) |
| Debounce timer reset | O(1) per keystroke; one fetch per 300 ms of quiet |
| Abort previous request | O(1) (cancels network, frees pending stream) |
| `submit`: `isValidVin` (same 17-char regex) | O(m) |
| Suggestion render: `suggestions.map(...)` | **O(k)** |

The **debounce + abort** pair is what keeps the autocomplete cost from growing with
typing speed: without it, each keystroke would cost O(p + k · m) server-side.

### 5.2 `useVehicleDocuments`

- Initial state: O(1).
- On each frame: `setSources(current => ({...current, [frame.source]: {...}}))` —
  shallow copy of a 2-key object: **O(f)** = O(1) per frame, **O(f)** total.
- `documents` for one source are replaced wholesale (no per-document merge), so no
  O(n₁ · n₂) work.
- Aborts previous stream on VIN change: prevents a stale stream from writing into the
  new state (correctness), and stops wasted network/server work (performance).
- **Space:** **O(Σ nᵢ)** for the documents rendered.

### 5.3 `fetchDocumentsByVin` — NDJSON stream reader

```
loop: reader.read()                    // O(chunk bytes)
      buffer += decode(chunk)          // O(buffer) — string concat
      while '\n' in buffer:
          line = buffer.slice(0, i)    // O(line)
          buffer = buffer.slice(i+1)   // O(remaining)
          JSON.parse(line)             // O(line)
```

- **Time:** **O(L)** where L = total streamed bytes.
- **Space:** O(largest frame) for the parsed document array of one source; the buffer
  holds at most one partial line (plus a chunk).
- **Caveat (§8):** for a response of `f` frames the buffer is small, but the
  `buffer.slice()` per line is a copy — I/O-complexity is fine because `f` is 2, and
  each frame is parsed once. For a stream of many small frames, this would be
  quadratic; a chunk-splitting approach using offsets avoids the copy.

### 5.4 `DocumentViewerContainer` / `DocumentTable`

- `toggleRow`: copies the expanded `Set` — **O(|expanded|)** per toggle, **O(#toggles · |expanded|)** per session. Bounded by the number of documents. A `Set` copy is required to trigger React state updates immutably.
- `DocumentViewerContainer` renders `Object.keys(SOURCE_LABEL).map(...)`: **O(S)** = O(2).
- `SourceSection` chooses loading / error / table / empty: **O(1)** branch.
- `DocumentTable` row map: **O(n)** per source per render; expanded row adds a 7-column
  details row whose `Object.entries(doc.details)` is **O(1)** (fixed keys).
- Whole result page render: **O(n_s + n_v)**.

### 5.5 Formatters — `utils/formatters.ts`

All are **O(1)** in the size of the data (cost proportional to the output string length,
bounded by ~30 chars):
- `formatDate`: `new Date` + `toLocaleDateString` (constant-width for a fixed locale).
- `formatAmount`: one `Intl.NumberFormat` construction per call — constructing an
  `Intl` formatter is comparatively expensive; at O(n) rows this adds an O(n) constant
  that a pre-built formatter instance would remove. Still linear overall.
- `formatDocumentType`: `replace(/_/g, ' ')` — O(len).
- `formatOdometer`: `Number(...).toLocaleString` — O(len).

---

## 6. End-to-end complexity

| Scenario | Time | Space |
|---|---|---|
| Valid search, both upstreams healthy | `max(T_s, T_v) + O(n_s log n_s + n_v log n_v) + O(L)` | O(n_s + n_v) per request |
| One upstream times out | `max(T_ok, 3 s) + O(n_ok log n_ok)` | O(n_ok) |
| Both upstreams down | O(3 s) — bounded by timeout | O(1) |
| Invalid VIN | O(m) — rejected pre-I/O | O(1) |
| Autocomplete keystroke (after debounce) | O(p + k · m) server + O(k) render | O(k) |
| Autocomplete cold start | O(N · m) one-off | O(N · m) |
| Client disconnects mid-stream | O(1) — `res.end()`; upstream fetch aborted by signal | — |

Aggregator is **stateless per request** apart from the cache and Trie, so throughput
scales linearly with instances and is bounded only by upstream capacity.

---

## 7. Recommended improvements (complexity-motivated)

| # | Current | Complexity today | Complexity after fix |
|---|---|---|---|
| 1 | `findByVin` full-scans `vin` | O(R) | **O(log R + n)** — `CREATE INDEX idx_xxx_vin ON table(vin, date)` |
| 2 | Cache checked after fetch | pays upstream latency every search | **O(1)** on a TTL hit (saves `T`: 0 ms upstream wait) |
| 3 | In-flight deduplication missing | c concurrent identical searches → c upstream calls | coalesce to 1 upstream call (`Map<key, Promise>`) |
| 4 | `Intl` formatter constructed per row | O(n) × construct-cost | hoist module-level `Intl.NumberFormat` |
| 5 | `formatOdometer` etc. inline per row | O(n) | acceptable; memoise if O(M) rows with heavy rerenders |
| 6 | Trie built per instance, no refresh | O(N · m) per process | refresh on TTL; share one instance |

---

## 8. Complexity caveats found while documenting

These are places where the *asymptotics* are acceptable at today's scale but the
implementation has a hidden factor worth knowing:

1. **NDJSON buffer `slice`** (`services/api.ts`): each line consumes
   `buffer = buffer.slice(i + 1)`, copying the remainder. With `f = 2` frames this is
   negligible; it would become **O(f · L)** for a stream of many frames. Track a read
   offset instead of re-slicing.
2. **VIN is not indexed** in the generated SQLite schema: `inferColumns` + the
   `CREATE TABLE` statement assign `PRIMARY KEY` only to `document_id` (confirmed with
   `PRAGMA index_list` — only `sqlite_autoindex_*` on the PK exists). `findByVin` is
   therefore O(R) per request. At the fixture scale (≈20 rows) this is invisible; at
   dealership scale (millions of rows) it is the first bottleneck.
3. **Cache check ordering** (`document.service.ts`): the cache is read *after*
   `await fetchRaw(...)`, so TTL caching currently never avoids the upstream call.
   This is an intentional trade-off (a cached frame never masks a live outage), but
   it means the cache contributes **no** latency improvement — documented in the
   System Design §11.
4. **Trie rebuild on each `SuggestionService` construction**: the service is
   instantiated by the controller, so construction triggers a full `fetchVins` on the
   startup path. The `Promise` is not awaited in the constructor — which is also the
   cause of a race during the first few seconds (documented in the sequence-diagram
   review).
5. **`buffer` string concatenation** in the stream reader (`buffer += chunk`) creates
   a new string each time; with two frames this is constant work, but note it for
   future streams.
