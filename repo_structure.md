keyloop-assessment/
├── backend/               # source code REST API (Node.js/Express/TypeScript)
├── frontend/              # source code UI (ReactJS)
└── README.md              # Document for running project


backend/
├── src/
│   ├── config/              # store environtment variable (example: URL của Sales/Service API)
│   │   └── env.config.ts
│   ├── controllers/         # receive data router, call service và return HTTP response
│   │   └── document.controller.ts
│   ├── services/            # CORE LAYER: do parallel invoke (Promise.all) and sum up database
│   │   └── document.service.ts
│   ├── clients/             # CONNECTION LAYER: Define call function to Sales API and Service API outside
│   │   ├── base.client.ts   # common Axios configuration (Timeout, Base URL)
│   │   ├── sales.client.ts  # connection to Sales System Mock
│   │   └── service.client.ts# connection to Service System Mock
│   ├── interfaces/          # declare variable type (TypeScript Types/Interfaces)
│   │   └── document.interface.ts
│   ├── middlewares/         # verify VIN input and capture error
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── routes/              # define API routing
│   │   └── document.routes.ts
│   └── app.ts               # run express server and init kafka consumers
├── .env                     # File for global configuration, add configuration for kafka brokers
├── package.json             # add kafkajs library
└── tsconfig.json

HTTP request -> routes -> controllers -> services -> clients

route will decide which method will go to which controller:
    + for example if user press check passwd -> controller check ID
    + but before go to specific controller route will use middleware to check before that

frontend/
├── public/
│   └── favicon.ico              # Static resources (Logo, icons, public assets)
├── src/
│   ├── assets/                  # Internal assets (Images, global styles, fonts)
│   ├── constants/               # Internal enum define
│   ├── components/              # Shared/Reusable UI components across the application
│   │   ├── Button.tsx           # Common button component
│   │   ├── Input.tsx            # Common input field component
│   │   └── LoadingSpinner.tsx   # Animation effect displayed during data fetching
│   ├── features/                # Feature-based modules containing specific domain logic
│   │   └── document-viewer/
│   │       ├── components/      # Sub-components exclusive to this specific feature
│   │       │   ├── SearchBar.tsx       # VIN search bar input
│   │       │   ├── DocumentTable.tsx   # Data table to display document records
│   │       │   └── SourceBadge.tsx     # Status badge for document sources (Sales / Service)
│   │       ├── hooks/
│   │       │   └── useFetchDocuments.ts # Custom hook managing API states (data, loading, error)
│   │       └── DocumentViewerContainer.tsx # Smart component responsible for orchestrating data flows
│   ├── services/                # Network and API communication layer
│   │   └── api.ts               # Axios client instance pre-configured for Backend connection
│   ├── utils/                   # General helper functions and utilities
│   │   └── formatters.ts        # Pure functions for formatting (e.g., date-time, VIN masks)
│   ├── App.tsx                  # React application root entry component
│   └── main.tsx                 # Application mounting point onto the DOM root
├── .env                         # Environment variables (VITE_API_URL, etc.)
├── index.html                   # HTML entry point template
├── package.json                 # Project dependencies and script definitions
├── tsconfig.json                # TypeScript compiler configuration options
└── vite.config.ts               # Vite build tool configuration file (TypeScript variant)


[ UI / User ]
         │ (interact: do search things in search engine bar)
         ▼
[ component: SearchBar.jsx / DocumentTable.jsx ] 
         │ (pass state / activate next actions)
         ▼
[ container: DocumentViewerContainer.jsx ] (Smart Component - main management)
         │ (invoke)
         ▼
[ hook: useFetchDocuments.js ] (Custom Hook - manage logic/API state)
         │ (invoke)
         ▼
[ service: api.js ] (Axios Instance - internet connection)
         │ ───► [ invoke API call to Backend ]
         ▼
[ utils: formatters.js ] (re-structe received data, example: date-time format)
         │ (return cleaned data)
         ▼
[ return data back to Container ──► Re-render to each Component and display to UI ]
