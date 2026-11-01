# The Unified Document Viewer

Single search interface over two independent dealership systems — enter a VIN and see
every related document from both the **Sales System** and the **Service System**,
clearly labelled by source.

```
Browser (React + Vite, :5555)
        │  GET /api/documents?vin=…   Accept: application/x-ndjson
        ▼
Aggregation API (Express + TypeScript, :4444)
        │  Promise.all — parallel, one timeout per source
   ┌────┴─────┐
   ▼          ▼
Sales mock  Service mock
(:4445)     (:4446)
SQLite      SQLite
```

## Quick start

```bash
# 1. mocked dealership systems (also rebuilds both SQLite databases)
cd backend && npm install && npm run mock:all

# 2. aggregation API (second terminal)
cd backend && npm run dev

# 3. frontend (third terminal)
cd frontend && npm install && npm run dev
```

Open **http://localhost:5555** and type a VIN prefix, e.g. `1HGCR2F83HA00000`.

## Documentation (Part 1)

All system-design deliverables are in [`docs/`](docs/README.md):

| Document | Contents |
|---|---|
| [System Design](docs/01-system-design.md) | Architecture diagram, components, data flow, technology choices, observability, AI usage in design |
| [Sequence Diagrams](docs/02-sequence-diagrams.md) | Every runtime flow, including failure paths |
| [Module Complexity Analysis](docs/03-module-complexity-analysis.md) | Time/space complexity per module |
| [API Contract](docs/04-api-contract.md) | REST + NDJSON contract with examples |
| [AI Collaboration Narrative](docs/05-ai-collaboration.md) | How AI was directed and verified |
| [Setup Guide](docs/06-setup-guide.md) | Running, testing, fault injection |

## Highlights

- **Parallel aggregation** — total latency is the *slower* upstream, not the sum.
- **Streaming NDJSON** — each source renders the moment it answers; the fast one never
  waits for the slow one.
- **Per-source failure isolation** — one system timing out or being down produces an
  inline error for that section only; the other source is unaffected.
- **Source adapters** — the only code that knows the two systems differ is
  `backend/src/adapters/document.adapters.ts`.
- **VIN autocomplete** — in-memory Trie, `O(|prefix| + k)` per keystroke, with a 300 ms
  debounce and request cancellation on the client.

## Project structure

```
backend/src/
  config/  routes/  middlewares/  controllers/  services/  adapters/  clients/
  interfaces/  database/  mocks/
frontend/src/
  components/  features/document-viewer/  services/  types/  utils/  constants/
gen_database/      # JSON fixtures + generator
docs/              # Part 1 deliverables
```

## Scripts

| Where | Command | Purpose |
|---|---|---|
| `backend` | `npm run mock:all` | Build DBs + start both mock systems (`mock:sales`, `mock:service` for one) |
| | `npm run db:generate` | Rebuild SQLite DBs from the JSON fixtures |
| | `npm run dev` | Start the aggregation API (watch mode) |
| | `npm run build` / `npm start` | Compile to `dist/` and run |
| | `npm test` | Test runner (`tsx --test`) — no test files yet |
| `frontend` | `npm run dev` | Vite dev server on `:5555` |
| | `npm run build` | Production build |

## Known limitations

See [System Design §11](docs/01-system-design.md#11-known-limitations--next-steps):
automated tests not yet written, no metrics/tracing, TTL cache consulted after the
fetch, VIN column not indexed in SQLite, timeouts reported as "unreachable".
