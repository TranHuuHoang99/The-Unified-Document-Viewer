# Sequence Diagrams

Runtime interaction diagrams for every flow in the Unified Document Viewer.
All diagrams are [Mermaid](https://mermaid.js.org/) and render natively on GitHub.

## Index

| # | Diagram | Type | Purpose |
|---|---|---|---|
| 1 | Startup & seeding | sequence | DB generation, mock bootstrap, aggregator boot |
| 2 | Happy-path search | sequence | end-to-end streamed aggregation |
| 3 | Degraded search (one upstream slow/down) | sequence | per-source isolation + timeout |
| 4 | Invalid / missing VIN | sequence | validation short-circuit |
| 5 | Client disconnect mid-stream | sequence | cancellation / resource cleanup |
| 6 | Autocomplete | sequence | debounce, Trie lookup, navigation |
| 7 | Cache behaviour | sequence | what the TTL cache actually does |
| 8 | Layer flow (alt view) | flowchart | request → response path by layer |

---

## 1. Startup & seeding

```mermaid
sequenceDiagram
    autonumber
    participant Dev as Developer
    participant Npm as npm run mock:all
    participant Gen as database/generate.ts
    participant Fs as gen_database/*.json
    participant Sql as database/sqlite.config.ts
    participant DB as database/{sales,service}.db
    participant M1 as Sales mock :4445
    participant M2 as Service mock :4446
    participant Agg as Aggregation API :4444
    participant Fe as Frontend :5555

    Dev->>Npm: npm run mock:all
    Npm->>Gen: npm run db:generate (pre-step)
    Gen->>Fs: read sales_data.json + service_data.json
    Gen->>Sql: buildDatabaseFromJson(sale…, 'sales_documents', 'document_id')
    Sql->>Sql: inferColumns(rows, PK)
    Sql->>DB: BEGIN · DROP · CREATE · INSERT × R · COMMIT
    Gen->>Sql: buildDatabaseFromJson(service…, 'service_documents', 'document_id')
    Sql->>DB: same for service.db
    Gen-->>Npm: “databases generated”
    Npm->>M1: startSalesMock() → DocumentStore.open(sales.db, READONLY)
    Npm->>M2: startServiceMock() → DocumentStore.open(service.db, READONLY)
    M1-->>Dev: listening on 4445
    M2-->>Dev: listening on 4446
    Dev->>Agg: (in backend/) npm run dev → tsx watch src/app.ts
    Agg->>Agg: dotenv → ENV
    Agg->>Agg: new App() → new ApiRoutes() → new SuggestionRoute() → new SuggestionService()
    Note over Agg,M2: SuggestionService constructor kicks off<br/>Promise.allSettled(fetchVins sales, fetchVins service)<br/>(not awaited — Trie fills shortly after boot)
    Agg->>M1: GET /api/sales/vin
    Agg->>M2: GET /api/service/vin
    M1-->>Agg: {documents:[{vin},…]}
    M2-->>Agg: {documents:[{vin},…]}
    Agg->>Agg: Set.add each vin → insert into VinTrie
    Agg-->>Dev: “Aggregation API running on http://localhost:4444”
    Dev->>Fe: (in frontend/) npm run dev
    Fe-->>Dev: Vite on 5555, proxy /api → 4444
```

---

## 2. Happy-path search

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant SB as SearchBar
    participant Rt as React Router
    participant VC as DocumentViewerContainer
    participant HK as useVehicleDocuments
    participant AP as services/api.ts
    participant VX as Vite proxy
    participant Ct as DocumentController
    participant Sv as DocumentService
    participant SC as SalesClient
    participant VC2 as ServiceClient
    participant SM as Sales mock
    participant VM as Service mock
    participant DT as DocumentTable

    U->>SB: types 1HGCR2F83HA000021 + Enter
    SB->>SB: isValidVin()
    SB->>Rt: navigate('/document-viewer?vin=1HGCR2F83HA000021')
    Rt->>VC: render with ?vin
    VC->>HK: useVehicleDocuments('1HGCR2F83HA000021')
    HK->>HK: setSources(all → loading), setError(null)
    HK->>AP: fetchDocumentsByVin(vin, onChunk, controller.signal)

    AP->>VX: GET /api/documents?vin=…  Accept: application/x-ndjson
    VX->>Ct: forward to :4444
    Ct->>Ct: Accept === 'application/x-ndjson' ? proceed : 406
    Ct->>Ct: res.status(200), x-ndjson, no-cache, X-Accel-Buffering:no
    Ct->>Ct: res.flushHeaders(); res.on('close', onClose)
    Ct->>Sv: searchDocs(vin, onChunk)

    par Concurrent fan-out
        Sv->>SC: fetchDocuments(vin, AbortSignal.timeout(3000))
        SC->>SM: GET /api/sales/docs?vin=…&delayMs=0
        SM->>SM: findByVin('sales_documents', vin, 'sale_date')
        SM-->>SC: 200 {success, count, documents}
        SC->>SC: res.json() → validate success + array
        SC-->>Sv: IRawSalesDocument[]
        Sv->>Sv: cache.get('VIN-SALES')
        Sv->>Sv: mapSalesDocument × n → sortDocuments
        Sv->>Sv: cache.set('VIN-SALES', outcome, TTL)
        Sv-->>Ct: outcome {source:SALES, status:ok, count}
        Ct->>Ct: _buildMessage → "3 documents found."
        Ct-->>AP: res.write(JSON + "\n")   ← frame 1
        AP->>HK: onChunk(frame SALES)
        HK->>HK: replace only sources.SALES
        HK-->>VC: re-render
        VC->>DT: <DocumentTable documents=SALES docs/>
    and
        Sv->>VC2: fetchDocuments(vin, AbortSignal.timeout(3000))
        VC2->>VM: GET /api/service/docs?vin=…&delayMs=0
        VM->>VM: findByVin('service_documents', vin, 'service_date')
        VM-->>VC2: 200 {success, count, documents}
        VC2-->>Sv: IRawServiceDocument[]
        Sv->>Sv: mapServiceDocument × n → sortDocuments → cache.set
        Sv-->>Ct: outcome {source:SERVICE, status:ok, count}
        Ct-->>AP: res.write(JSON + "\n")   ← frame 2
        AP->>HK: onChunk(frame SERVICE)
        HK-->>VC: re-render
        VC->>DT: <DocumentTable documents=SERVICE docs/>
    end

    Sv-->>Ct: Promise.all resolved
    Ct->>Ct: res.end(); res.off('close')
    AP->>AP: reader read() → done
    AP-->>HK: promise resolves
```

---

## 3. Degraded search — one upstream slow or down

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant HK as useVehicleDocuments
    participant AP as api.ts
    participant Ct as DocumentController
    participant Sv as DocumentService
    participant SM as Sales mock (healthy)
    participant VM as Service mock (delayMs=5000)

    rect rgb(232, 245, 233)
        Note over U,VM: Case A — Service is slow (exceeds UPSTREAM_TIMEOUT_MS)
        U->>HK: search
        HK->>AP: fetchDocumentsByVin
        AP->>Ct: GET /api/documents (stream)
        Ct->>Sv: searchDocs
        par
            Sv->>SM: GET /api/sales/docs
            SM-->>Sv: 200 rows (t ≈ 120 ms)
            Sv-->>Ct: frame {SALES, ok, count=3}
            Ct-->>AP: line 1
            AP->>HK: onChunk
            HK-->>U: ✅ Sales table rendered ~120 ms
        and
            Sv->>VM: GET /api/service/docs?delayMs=5000
            Note over VM: mock waits 5000 ms
            Note over Sv: AbortSignal.timeout(3000) fires at 3000 ms
            Note over Sv: Node 24 fetch surfaces this as TypeError('fetch failed')<br/>with an AbortError cause, NOT name==='AbortError' on the error itself
            Sv->>Sv: catch → UpstreamError('SERVICE', 'SERVICE system is unreachable')
            Sv->>Sv: console.error('[document-service] SERVICE upstream failure …')
            Sv-->>Ct: frame {SERVICE, error, error:'SERVICE system is unreachable'}
            Ct-->>AP: line 2
            AP->>HK: onChunk
            HK-->>U: ⚠️ “Service system is unavailable…” inline
        end
        Ct->>Ct: res.end()
    end

    rect rgb(255, 235, 238)
        Note over U,VM: Case B — Service returns HTTP 500 / bad payload
        Sv->>VM: GET /api/service/docs
        VM-->>Sv: 500 {success:false}
        Sv->>Sv: getDocuments → throw UpstreamError(statusCode=500)
        Sv-->>Ct: frame {SERVICE, error, 'SERVICE system responded with HTTP 500'}
        Ct-->>AP: line with error status
        AP->>HK: onChunk → HK shows error text for SERVICE only
    end

    rect rgb(255, 248, 225)
        Note over U,VM: Case C — Service has no documents for this VIN
        Sv->>VM: GET /api/service/docs
        VM-->>Sv: 200 {count:0, documents:[]}
        Sv->>Sv: documents.length === 0 → status 'empty', NOT cached
        Sv-->>Ct: frame {SERVICE, empty, count=0}
        Ct->>Ct: _buildMessage → "No documents found for this VIN."
        Ct-->>AP: line
        AP->>HK: onChunk → SourceSection shows empty message
    end
```

---

## 4. Invalid / missing VIN

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant SB as SearchBar
    participant Ct as DocumentController
    participant Vm as validateVin

    Note over U,SB: Client-side guard
    U->>SB: types "ABC" + Enter
    SB->>SB: isValidVin("ABC") === false
    SB--xU: no navigation, no request

    Note over U,Vm: Server-side guard (bypassing the UI, e.g. curl)
    U->>Ct: GET /api/documents?vin=ABC   (Accept: application/x-ndjson)
    Ct->>Vm: (middleware) trim + toUpperCase
    Vm-->>U: 400 {success:false, message:'Invalid VIN. A VIN must be exactly 17 …'}

    U->>Ct: GET /api/documents   (no vin)
    Ct->>Vm: raw === undefined → vin = ''
    Vm-->>U: 400 {success:false, message:'Missing required query parameter: vin'}

    U->>Ct: GET /api/documents?vin=<valid>   (Accept: application/json)
    Ct->>Ct: acceptHead !== 'application/x-ndjson'
    Ct-->>U: 406 “Docs search only support request x-ndjson”
```

---

## 5. Client disconnects mid-stream

```mermaid
sequenceDiagram
    autonumber
    participant HK as useVehicleDocuments
    participant U as User
    participant Ct as DocumentController
    participant Sv as DocumentService
    participant SM as Sales mock
    participant VM as Service mock

    U->>HK: navigates / changes VIN before both frames arrive
    HK->>HK: cleanup → controller.abort() (previous AbortController)
    HK->>HK: setSources(all → loading) for the new VIN
    Note over HK,Ct: aborted fetch closes the HTTP connection
    Ct->>Ct: 'close' event → onClose(): if (!res.writableEnded) res.end()
    Ct->>Ct: subsequent onChunk sees res.writableEnded → returns, no write
    Note over Sv,VM: In-flight upstream fetches still complete or time out;<br/>their outcomes are written to cache if successful.<br/>(Upstream AbortSignals are independent of the client one →<br/>planned improvement: propagate client abort to upstream signals)
    Sv-->>Ct: outcome(SALES) — dropped because writableEnded
    Sv-->>Ct: outcome(SERVICE) — dropped
    Ct->>Ct: finally: res.off('close', onClose)
    Note over HK: stale frames are also ignored:<br/>if (controller.signal.aborted) return;
```

---

## 6. Autocomplete

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant SB as SearchBar
    participant SS as SearchSuggestionComp
    participant Ct as SuggestionController
    participant Vm as validateIfAnySpecialChar
    participant Sg as SuggestionService
    participant Tri as VinTrie
    participant SM as Sales mock
    participant VM as Service mock

    Note over Sg,Tri: Boot (once)
    Sg->>Sg: Promise.allSettled(fetchVins ×2)
    SM-->>Sg: [{vin},…]
    VM-->>Sg: [{vin},…]
    Sg->>Sg: Set dedupe (80% VIN overlap)
    Sg->>Tri: insert × N

    U->>SB: types "1HG"
    SB->>SB: toUpperCase
    SB->>SS: updateQuery("1HG")
    SS->>SS: setLoading(true); clear previous 300 ms timer; abort previous request
    SS->>SS: setTimeout(300)
    U->>SB: continues typing "1HGCR2"
    SB->>SS: updateQuery("1HGCR2")
    SS->>SS: clear pending timer (first request never fires)
    SS->>SS: setTimeout(300)
    Note over SS: 300 ms of quiet …
    SS->>Ct: GET /api/suggestions?vin=1HGCR2  Accept: application/json
    Ct->>Vm: trim / upper / no special chars
    Vm-->>Ct: ok
    Ct->>Sg: queryVinSuggestion("1HGCR2")
    Sg->>Tri: walk 6 chars → node → DFS
    Tri-->>Sg: generator: "1HGCR2F83HA000001", "1HGCR2F83HA000002", …
    Sg-->>Ct: Iterable
    Ct->>Ct: Array.from(...)
    Ct-->>SS: 200 { data: [...] }
    SS->>SS: setSuggestions(list); setLoading(false)
    SS-->>U: dropdown list
    U->>SS: clicks "1HGCR2F83HA000002"
    SS->>SB: navigate('/document-viewer?vin=1HGCR2F83HA000002')
    SS->>SS: setSuggestions([])  → dropdown closes
    Note over SB,Ct: → diagram #2 begins
```

---

## 7. Cache behaviour (as implemented today)

```mermaid
sequenceDiagram
    autonumber
    participant HK as useVehicleDocuments
    participant Sv as DocumentService
    participant Cache as m_cache (Map)
    participant Up as Upstream

    rect rgb(236, 239, 241)
        Note over HK,Up: Search #1 — VIN 1HGCR2F83HA000021
        HK->>Sv: searchDocs(vin)
        Sv->>Sv: cacheKey = '1HGCR2F83HA000021-SALES'
        Sv->>Up: fetch  (cache is NOT consulted first)
        Up-->>Sv: documents
        Sv->>Cache: get(key) → miss
        Sv->>Sv: map + sort
        Sv->>Cache: set(key, outcome, now + 60 000)
        Sv-->>HK: frame
    end

    rect rgb(232, 245, 233)
        Note over HK,Up: Search #2 — same VIN within TTL
        HK->>Sv: searchDocs(vin)
        Sv->>Up: fetch again  ← cache still not consulted first
        Up-->>Sv: documents (live answer)
        Sv->>Cache: get(key) → hit, expiresAt > now
        Sv-->>HK: cached.outcome  (live response was discarded)
        Note right of Sv: The cache is never hit before a<br/>non-empty document set has been fetched once,<br/>and it is only read when documents.length > 0.<br/>Net effect: no upstream latency is saved today.
    end

    rect rgb(255, 235, 238)
        Note over HK,Up: Search #3 — upstream down after a cached success
        HK->>Sv: searchDocs(vin)
        Sv->>Up: fetch
        Up--xSv: timeout / 5xx
        Sv->>Sv: catch → error frame
        Sv-->>HK: {status:'error'}
        Note right of Sv: A cached frame never masks a live outage (by design).<br/>Planned fix: check cache first, on success only.
    end
```

---

## 8. Layer flow (alternative view)

```mermaid
flowchart LR
    Client["Browser"] -->|"GET /api/documents<br/>Accept: x-ndjson"| Log["Request logger"]
    Log --> Val["validateVin"]
    Val -->|invalid| E400["400"]
    Val --> Ctrl["DocumentController"]
    Ctrl -->|"not ndjson"| E406["406"]
    Ctrl -->|stream| Svc["DocumentService"]
    Svc -->|"parallel"| CS["SalesClient"]
    Svc -->|"parallel"| CV["ServiceClient"]
    CS -->|"fetch + AbortSignal"| MS["Sales mock → SQLite"]
    CV -->|"fetch + AbortSignal"| MV["Service mock → SQLite"]
    MS --> Adapt["Adapters → IUnifiedDocument"]
    MV --> Adapt
    Adapt --> Sort["sortDocuments"]
    Sort --> Frame["NDJSON frame"]
    Frame -->|"res.write"| Client
    Svc -.->|"unexpected throw"| Err["errorHandler"]
    Ctrl -.->|"stream write failure"| Err
    Err -->|500 JSON| Client
```

---

## Observations surfaced while drawing these sequences

These are behaviours visible only when tracing the actual call graph; they are noted
here and in the system-design limitations so they are not missed in code review:

1. **Cache ordering** (§7): the TTL cache is read after the upstream call, so it
   never avoids latency. The live response is discarded in favour of the cached
   outcome when the TTL has not expired.
2. **Autocomplete replacement** (diagram #6): nothing disposes the previous VIN-list
   fetch, and the Trie starts empty until it completes. A user who types and searches
   within the first seconds after boot gets `[]` for a valid VIN.
3. **Trie is per service instance** (diagram #1): `SuggestionService` is created by
   `SuggestionRoute`'s controller, so a new instance (and a new VIN fetch) is built per
   app boot. If the route were ever mounted per request, the Trie would be rebuilt per
   request — worth guarding with a singleton.
4. **Client disconnect does not cancel upstream work** (diagram #5): the controller
   stops writing, but the two upstream fetches continue until they finish or time out.
   Cancellation is the next efficiency win (chain an `AbortController` from
   `req.on('close')` into `searchDocs`).
5. **Duplicate route instances**: `DocumentController` constructs its own
   `DocumentService`, which constructs the `SalesClient`/`ServiceClient` singletons —
   the fan-out uses single shared clients, which is what makes the timeout/abort
   behaviour consistent.
