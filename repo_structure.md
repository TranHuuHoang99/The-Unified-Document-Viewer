# Repository Structure

> Generated from the actual file tree (excluding `node_modules/`, `.git/`, `dist/`).
> Update this file whenever files are added, moved or renamed.

```
The-Unified-Document-Viewer/
├── README.md                       # quick start
├── repo_structure.md               # ← this file
├── .gitignore
│
├── docs/                           # Part 1 deliverables
│   ├── README.md                   # docs index
│   ├── 01-system-design.md         # architecture, components, data flow, trade-offs
│   ├── 02-sequence-diagrams.md     # runtime sequences
│   ├── 03-module-complexity-analysis.md
│   ├── 04-api-contract.md          # REST + NDJSON contract
│   ├── 05-ai-collaboration.md      # AI engineering narrative
│   └── 06-setup-guide.md           # how to run every process
│
├── gen_database/                   # test-data generator (Python)
│   ├── gen_data.py                 # writes the two JSON fixtures below
│   ├── sales_data.json             # Sales System fixture
│   └── service_data.json           # Service System fixture
│
├── backend/                        # Aggregation API (Express + TS + SQLite) → :4444
│   ├── .env                        # ports, upstream URLs, timeouts, cache TTL, DB paths, mock latency
│   ├── .npmrc
│   ├── package.json                # dev / build / db:generate / mock:all scripts
│   ├── tsconfig.json
│   ├── database/
│   │   ├── sales.db                # built from gen_database/sales_data.json
│   │   └── service.db              # built from gen_database/service_data.json
│   └── src/
│       ├── app.ts                  # Express bootstrap, logging middleware, /health
│       ├── config/
│       │   └── env.config.ts       # typed ENV — single source of every tunable
│       ├── routes/
│       │   ├── api.routes.ts       # mounts /api/documents + /api/suggestions
│       │   ├── document.routes.ts
│       │   └── suggestion.routes.ts
│       ├── middlewares/
│       │   ├── validation.middleware.ts   # validateVin, validateIfAnySpecialChar
│       │   └── error.middleware.ts        # final error handler
│       ├── controllers/
│       │   ├── document.controller.ts     # NDJSON stream writer
│       │   └── suggestion.controller.ts   # JSON autocomplete
│       ├── services/
│       │   ├── document.service.ts        # CORE: Promise.all fan-out, per-source isolation, TTL cache
│       │   └── suggestion.service.ts      # VinTrie, loaded once at startup
│       ├── adapters/
│       │   └── document.adapters.ts       # raw Sales/Service shapes → IUnifiedDocument, sorting
│       ├── clients/
│       │   ├── base.client.ts             # abstract singleton: fetch + AbortSignal + UpstreamError
│       │   ├── sales.client.ts            # → Sales System mock
│       │   └── service.client.ts          # → Service System mock
│       ├── interfaces/
│       │   └── document.interface.ts      # IUnifiedDocument contract
│       ├── database/
│       │   ├── sqlite.config.ts           # buildDatabaseFromJson, DocumentStore (read-only)
│       │   └── generate.ts                # npm run db:generate
│       └── mocks/
│           ├── sales-mock.server.ts       # Sales System mock → :4445
│           ├── service-mock.server.ts     # Service System mock → :4446
│           └── start-all-mocks.ts         # starts both mocks (npm run mock:all)
│
└── frontend/                       # React SPA (Vite) → :5555
    ├── .env                        # VITE_BACKEND_URL used by the /api proxy
    ├── .npmrc
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts              # :5555, `/api` proxy → :4444, `@` → ./src alias
    └── src/
        ├── main.tsx                # mounts React + BrowserRouter, `/` → `/document-viewer`
        ├── App.tsx                 # page shell: header + SearchBar + DocumentViewerContainer
        ├── components/             # shared/reusable UI
        │   ├── Button.tsx
        │   ├── InputField.tsx
        │   └── LoadingSpinner.tsx
        ├── constants/
        │   ├── api.endpoints.ts    # API_ENDPOINTS (documents + suggestions)
        │   └── config.ts           # SUGGESTION_TIMEOUT (300 ms debounce)
        ├── features/
        │   └── document-viewer/
        │       ├── DocumentViewerContainer.tsx          # one SourceSection per system
        │       ├── components/
        │       │   ├── SearchBar.tsx                    # VIN input + autocomplete dropdown
        │       │   ├── DocumentTable.tsx                # consolidated table, expandable rows
        │       │   └── SourceBadge.tsx                  # SALES / SERVICE pill
        │       └── hooks/
        │           └── useFetchDocuments.ts             # per-source state machine (exports `useVehicleDocuments`)
        ├── services/
        │   └── api.ts              # NDJSON stream reader + JSON suggestions fetch (native fetch)
        ├── types/
        │   └── document.types.ts   # frontend mirror of the contract + isValidVin
        └── utils/
            └── formatters.ts       # pure formatters: date, currency, type, odometer
```

**Ports:** aggregation API `4444` · Sales mock `4445` · Service mock `4446` · frontend dev `5555`

**Data path:** `gen_database/*.json` ──`npm run db:generate`──► `backend/database/*.db` ──read-only──► mocks → clients → services → controllers → NDJSON stream → `services/api.ts` → `useVehicleDocuments` → components.

---

## Backend — request flow

```
HTTP request
    │
    ▼
routes/            → decides HTTP method + path → middleware chain + controller
    │
    ▼
middlewares/       → validate input (VIN) and centralise errors
    │
    ▼
controllers/       → HTTP concerns only: headers, streaming, status codes
    │
    ▼
services/          → business logic: parallel fan-out, failure isolation, cache, Trie
    │
    ▼
adapters/          → translate source-specific shapes into IUnifiedDocument
    │
    ▼
clients/           → fetch upstreams with timeout, raise UpstreamError
    │
    ▼
mocks/             → Sales (:4445) / Service (:4446) → SQLite
```

Each layer depends only on the layers below it. The only source-specific code is
`adapters/document.adapters.ts`.

---

## Frontend — data flow

```
[ UI / User ]
    │ types a VIN, presses Enter
    ▼
features/document-viewer/components/SearchBar.tsx     (validation + ?vin= navigation)
    │
    ▼
features/document-viewer/DocumentViewerContainer.tsx  (renders one SourceSection per system)
    │
    ▼
features/document-viewer/hooks/useFetchDocuments.ts   (useVehicleDocuments: loading/ok/empty/error per source)
    │
    ▼
services/api.ts                                       (native fetch, NDJSON stream reader)
    │
    ▼
constants/api.endpoints.ts + constants/config.ts      (URLs, debounce)
    │
    ▼
utils/formatters.ts                                   (date / currency / type / odometer)
    │
    ▼
re-render DocumentTable.tsx + SourceBadge.tsx → UI
```
