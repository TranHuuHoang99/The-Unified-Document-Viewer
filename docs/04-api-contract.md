# API Contract

REST contract for the aggregation API and the two mocked upstream dealership systems,
exactly as implemented in `backend/src/`.

> **Ports** — Aggregation API `4444` · Sales mock `4445` · Service mock `4446`.
> The frontend (Vite, `5555`) proxies `/api` to the aggregation API, so all `curl`
> examples below target the aggregation API directly.

---

## 1. Aggregation API

### 1.1 `GET /api/documents`

Unified search. Streams one JSON frame per dealership system as it answers.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/documents` |
| **Query** | `vin` — required, exactly 17 characters `[A-HJ-NPR-Z0-9]` (I/O/Q excluded). Case-insensitive; normalised to upper-case. |
| **Headers (required)** | `Accept: application/x-ndjson` |
| **Success** | `200 OK`, `Content-Type: application/x-ndjson` |
| **Other headers** | `Cache-Control: no-cache`, `X-Accel-Buffering: no` |
| **Body** | 1–2 newline-delimited JSON frames (≤ 2, one per source), then the connection closes |
| **Timeout** | Each upstream call is bounded by `UPSTREAM_TIMEOUT_MS` (default 3 000 ms) |

#### Frame schema

```ts
interface IDocumentSearchResponse {
  success: true;
  message: string;                 // human-readable, per source
  vin: string;                     // normalised (upper-case)
  source: 'SALES' | 'SERVICE';     // which system produced this frame
  documents: IUnifiedDocument[];   // always present; [] for empty/error
  sources: {
    status: 'ok' | 'empty' | 'error';
    count: number;
    error?: string;                // only when status === 'error'
  };
}

interface IUnifiedDocument {
  id: string;
  source: 'SALES' | 'SERVICE';
  documentType: string;
  date: string | null;             // ISO date
  amount: number | null;
  status: string;
  fileUrl: string;
  details: Record<string, string | number | null>;   // source-specific fields
}
```

`details` keys per source:

| Source | `details` keys |
|---|---|
| `SALES` | `customerName`, `customerId`, `salesperson` |
| `SERVICE` | `customerName`, `customerId`, `serviceAdvisor`, `technician`, `odometer` |

Documents are ordered newest-first by `date`; documents with a null date sink to the bottom.

#### Examples

**Happy path**

```bash
curl -N -s \
  -H "Accept: application/x-ndjson" \
  "http://localhost:4444/api/documents?vin=1HGCR2F83HA000001"
```

```json
{"success":true,"message":"1 document found.","vin":"1HGCR2F83HA000001","source":"SALES","documents":[{"id":"SAL-2026-007","source":"SALES","documentType":"Insurance_Policy","date":"2026-02-18","amount":36830,"status":"Completed","fileUrl":"https://sales.mock007.pdf","details":{"customerName":"Jane Smith","customerId":"CUST-SAL-1006","salesperson":"Alex Smith"}}],"sources":{"status":"ok","count":1}}
{"success":true,"message":"3 documents found.","vin":"1HGCR2F83HA000001","source":"SERVICE","documents":[{"id":"SRV-2026-022","source":"SERVICE","documentType":"Warranty_Claim","date":"2026-05-04","amount":968,"status":"Closed","fileUrl":"https://service.mock006-2.pdf","details":{"customerName":"Jane Smith","customerId":"CUST-SRV-2005","serviceAdvisor":"Michael Scott","technician":"Tom Fixer","odometer":8176}},{"id":"SRV-2026-021","source":"SERVICE","documentType":"Warranty_Claim","date":"2026-05-03","amount":968,"status":"Closed","fileUrl":"https://service.mock006-1.pdf","details":{"customerName":"Jane Smith","customerId":"CUST-SRV-2005","serviceAdvisor":"Michael Scott","technician":"Tom Fixer","odometer":8176}},{"id":"SRV-2026-006","source":"SERVICE","documentType":"Warranty_Claim","date":"2026-05-02","amount":968,"status":"Closed","fileUrl":"https://service.mock006.pdf","details":{"customerName":"Jane Smith","customerId":"CUST-SRV-2005","serviceAdvisor":"Michael Scott","technician":"Tom Fixer","odometer":8176}}],"sources":{"status":"ok","count":3}}
```

This VIN is a useful demo case: one sales document and **three** service documents,
which exercises newest-first sorting and the `1 document` vs `N documents` message.

> `-N` disables curl buffering so frames print as they arrive. Frames are emitted in
> **whichever order the sources answer** — do not assume SALES first.

**One source unavailable**

```json
{"success":true,"message":"SERVICE system is unreachable","vin":"1HGCR2F83HA000002","source":"SERVICE","documents":[],"sources":{"status":"error","count":0,"error":"SERVICE system is unreachable"}}
```

> On Node ≥ 18, an aborted/timed-out `fetch` rejects with a `TypeError('fetch failed')`
> whose `cause` is the `AbortError`. `BaseHttpClient` inspects `error.name`, which never
> matches `'AbortError'` for a wrapped error, so **timeouts and connection failures are
> both reported as "unreachable"**. The 3 s deadline itself is enforced (verified).

**No documents in one source** — search a sales-only VIN (e.g. `…000017`):

```json
{"success":true,"message":"No documents found for this VIN.","vin":"1HGCR2F83HA000017","source":"SERVICE","documents":[],"sources":{"status":"empty","count":0}}
```

#### Error responses

| Status | When | Body |
|---|---|---|
| `400` | `vin` missing | `{"success":false,"message":"Missing required query parameter: vin"}` |
| `400` | `vin` fails the 17-char regex | `{"success":false,"message":"Invalid VIN. A VIN must be exactly 17 alphanumeric characters (I, O and Q are not allowed)."}` |
| `406` | `Accept` is not exactly `application/x-ndjson` | plain text: `Docs search only support request x-ndjson` |
| `500` | Unexpected server fault (should never be an upstream failure) | `{"success":false,"message":"Internal Server Error"}` |

> Note: the `406` response is plain text by design (the handler calls `res.send`), not JSON.

---

### 1.2 `GET /api/suggestions`

VIN autocomplete: returns VINs known to **either** dealership system that start with
the given prefix.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/suggestions` |
| **Query** | `vin` — required, the typed prefix. Any alphanumeric string (no spaces/special chars). Case-insensitive. |
| **Headers (required)** | `Accept: application/json` |
| **Success** | `200 OK`, `Content-Type: application/json` |
| **Body** | `{ "data": ["VIN…", "VIN…"] }` |
| **Complexity** | `O(|prefix| + k · 17)` — Trie prefix walk + DFS, `k` = number of matches |

```bash
curl -s -H "Accept: application/json" \
  "http://localhost:4444/api/suggestions?vin=1HGCR2F83HA00000"
```

```json
{"data":["1HGCR2F83HA000002","1HGCR2F83HA000005","1HGCR2F83HA000006"]}
```

(The real response contains every matching VIN; with the default fixtures a
`…0000`-style prefix returns 20+ entries, and the frontend caps the dropdown visually
with `maxHeight: 250px` / `overflowY: auto`.)
```

| Status | When | Body |
|---|---|---|
| `400` | `vin` missing **or** contains a non-alphanumeric character | `{"success":false,"message":"Missing required query parameter: vin"}` / `{... "Invalid VIN. Special characters, spaces, and accented letters are not allowed."}` |
| `406` | `Accept` is not exactly `application/json` | plain text: `Loading suggestion only support request json` |

> **Startup:** VINs are loaded **once** when the service is constructed (server boot)
> from both upstream `/vin` endpoints. New VINs are not picked up until restart, and
> the list is empty until the boot-time fetch completes.

---

### 1.3 `GET /health`

Liveness probe for the aggregation process (does **not** report upstream health).

```bash
curl -s http://localhost:4444/health
# {"status":"OK","timestamp":"2026-01-01T00:00:00.000Z"}
```

---

## 2. Upstream mock systems

Both mocks share the same shape; only the path prefix, table and date column differ.

### 2.1 `GET /api/sales/docs` · `GET /api/service/docs`

| | |
|---|---|
| **Query** | `vin` (required), `delayMs` (optional, 0–10 000 — artificial latency for demoing timeouts) |
| **Success** | `200` → `{ "success": true, "vin": "...", "count": n, "documents": [...] }` |
| **Errors** | `400` missing `vin`; `500` database error |

Raw shapes (`interfaces/document.interface.ts`):

```ts
interface IRawSalesDocument {
  document_id: string; vin: string; customer_id: string; customer_name: string;
  document_type: string; salesperson_name: string; sale_date: string;
  total_amount: number; status: string; file_url: string;
}

interface IRawServiceDocument {
  document_id: string; vin: string; customer_id: string; customer_name: string;
  document_type: string; service_advisor: string; technician_name: string;
  service_date: string; mileage_odometer: number; total_cost: number;
  status: string; file_url: string;
}
```

### 2.2 `GET /api/sales/vin` · `GET /api/service/vin`

Returns every row's `vin` for the upstream, wrapped in the same envelope:

```json
{"success":true,"count":20,"documents":[{"vin":"1HGCR2F83HA000002"}, …]}
```

> This is the shape `SuggestionService` consumes (`item.vin`), **not** a bare string array.

### 2.3 `GET /health` (each mock)

```json
{"system":"sales-mock","status":"OK","timestamp":"2026-01-01T00:00:00.000Z"}
```

---

## 3. Timeouts & fault injection

| Setting (`backend/.env`) | Default | Effect |
|---|---|---|
| `UPSTREAM_TIMEOUT_MS` | `3000` | Per-source `AbortSignal.timeout` in `DocumentService._fetchSource` |
| `CACHE_TTL_MS` | `60000` | TTL written after a successful, non-empty fetch |
| `SALE_LATENCY_MS` | `0` | Passed as `delayMs` to the Sales mock on every docs call |
| `SERVICE_LATENCY_MS` | `0` | Same for Service |

To reproduce the degraded path:

```bash
# backend/.env
SALE_LATENCY_MS=5000     # > UPSTREAM_TIMEOUT_MS → Sales frame becomes an error
```

Restart the aggregation API (the env is read at boot) and search again: the Service
table renders immediately, the Sales section shows "Sales system is unavailable.
SALES system timed out".

---

## 4. Error-model summary

```
fetch() rejects
  ├─ error.name === 'AbortError' ───────────────► UpstreamError '… timed out'
  └─ anything else (incl. wrapped aborts) ──────► UpstreamError '… is unreachable'
        └─ in practice on Node ≥ 18, timeouts land here (see note above)
HTTP 2xx?          ── no: 4xx/5xx ─────────────► UpstreamError '… responded with HTTP n'
Envelope valid?    ── no: !success / !Array ────► UpstreamError '… unexpected payload'
Array empty?       ── yes ─────────────────────► frame status 'empty'   (not cached)
Array non-empty?   ── yes ─────────────────────► map + sort, cache, frame status 'ok'
```

Every branch above becomes a resolvable **error frame** (`status: 'error'`,
`documents: []`) — never a rejected promise — so one unavailable source cannot affect
the frame of the other.
