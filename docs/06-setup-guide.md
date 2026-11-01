# Setup & Run Guide

How to run the Unified Document Viewer locally. Everything runs with `npm` and
Node.js (≥ 20 recommended — native `fetch` and `AbortSignal.timeout` are required).

## Processes

| Process | Port | Start command | Directory |
|---|---|---|---|
| Sales system (mock) | `4445` | `npm run mock:all` (starts both mocks) | `backend/` |
| Service system (mock) | `4446` | `npm run mock:all` | `backend/` |
| Aggregation API | `4444` | `npm run dev` | `backend/` |
| Frontend | `5555` | `npm run dev` | `frontend/` |

The mocked dealership systems are **separate processes** from the aggregation API,
exactly as the scenario describes ("each with its own API and database").

## 1. Install

```bash
cd backend  && npm install
cd ../frontend && npm install
```

## 2. Start the mocked dealership systems

```bash
# in backend/
npm run mock:all
```

This first rebuilds both SQLite databases from the JSON fixtures
(`npm run db:generate` runs automatically), then starts both mocks:

```
Sales database generated at: …/backend/database/sales.db
Service database generated at: …/backend/database/service.db
[sales-mock] mocked sales system listening on http://localhost:4445
[service-mock] mocked service system listening on http://localhost:4446
```

Use `npm run mock:sales` / `npm run mock:service` to start only one —
**useful for demoing one system being down.**

## 3. Start the aggregation API

```bash
# in backend/ (a second terminal)
npm run dev
```

```
Aggregation API running on http://localhost:4444
Upstreams: SALES=http://localhost:4445 SERVICE=http://localhost:4446
```

## 4. Start the frontend

```bash
# in frontend/ (a third terminal)
npm run dev
```

Open <http://localhost:5555> — you land on `/document-viewer`. Vite proxies `/api/*`
to `http://localhost:4444` (configurable via `VITE_BACKEND_URL` in `frontend/.env`),
so no CORS setup is needed.

## 5. Try it

- Type a VIN prefix (e.g. `1HGCR2F83HA00000`) → autocomplete dropdown after 300 ms.
- Enter or click a suggestion → two sections render independently:
  - blue **SALES** rows (contracts, invoices, finance agreements, insurance)
  - green **SERVICE** rows (repair orders, inspections, parts invoices, warranty claims)
- Click any row to expand source-specific details (salesperson / advisor / technician / odometer).
- Test data (the checked-in fixtures in `gen_database/`): 21 sales docs / 22 service docs,
  **16 shared VINs** (`…000001`–`…000016`), **5 sales-only VINs**
  (`…000017`–`…000020`, `…000114`), **4 service-only VINs** (`…000021`–`…000024`).
  `…000001` has 3 service documents, so it demonstrates sorting and multi-row rendering.
  (`gen_data.py` generates the 16/4/4 split; the extra `…000114` sales row and the two
  extra `…000001` service rows are in the committed fixtures, and these docs describe what
  actually runs.)

## Demoing failure behaviour

`backend/.env`:

```env
UPSTREAM_TIMEOUT_MS=3000
SALE_LATENCY_MS=0        # artificial latency injected into the Sales mock
SERVICE_LATENCY_MS=0     # artificial latency injected into the Service mock
```

| Demo | Setting | Expected result |
|---|---|---|
| Upstream timeout | `SERVICE_LATENCY_MS=5000` (> timeout) | Service section: "Service system is unavailable. SERVICE system is unreachable" (see note below); Sales renders normally after the 3 s bound |
| One system fully down | stop one mock (`mock:sales` only) | Same message — connection refused also maps to "unreachable" |
| Empty source | search a single-source VIN, e.g. `1HGCR2F83HA000017` (sales-only) | Service section: "No documents found for this VIN." |
| Invalid VIN | `curl "http://localhost:4444/api/documents?vin=ABC"` | `400` — no upstream call is made |

Restart the aggregation API after changing `.env` (values are read at boot).

> **Verified behaviour — timeout is reported as "unreachable".** With
> `SERVICE_LATENCY_MS=5000` the frame is
> `{"message":"SERVICE system is unreachable","sources":{"status":"error","error":"SERVICE system is unreachable"}}`
> and the response completes at ~3.09 s. The deadline *is* enforced; only the label is
> imprecise. On Node 24, an aborted `fetch` rejects with `TypeError('fetch failed')`
> whose `cause` is the `AbortError` — `BaseHttpClient` checks `error.name === 'AbortError'`
> on the error itself, which is never true, so it falls through to the "unreachable"
> branch. The user-facing outcome (that source is unavailable, the other renders) is
> correct; distinguishing "timed out" from "unreachable" needs a check on
> `error.cause` / `signal.aborted`. This is recorded as a limitation in the
> System Design and as verification evidence in the AI Collaboration doc.

## Direct API testing (no frontend)

```bash
# unified search — note the required Accept header
curl -N -s -H "Accept: application/x-ndjson" \
  "http://localhost:4444/api/documents?vin=1HGCR2F83HA000001"

# autocomplete
curl -s -H "Accept: application/json" \
  "http://localhost:4444/api/suggestions?vin=1HGCR2F83HA00000"

# liveness
curl -s http://localhost:4444/health
```

Full request/response contract: see [04-api-contract.md](04-api-contract.md).

## Regenerating the mock data

```bash
cd gen_database && python gen_data.py     # rewrites the JSON fixtures
cd ../backend && npm run db:generate      # rebuilds sales.db / service.db
```

`db:generate` drops and recreates both tables in one transaction, inferring the
column types and primary key from the fixture rows.

## Production build

```bash
# backend  → dist/app.js
npm run build && npm start

# frontend → dist/
npm run build
```

## Tests

`npm test` is wired in `backend/package.json` (`tsx --test "test/**/*.test.ts"`) but
**no test files exist yet** — see "Known limitations" in
[01-system-design.md](01-system-design.md#11-known-limitations--next-steps).
