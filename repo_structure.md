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
├── public/                  # static resources (Logo, favicon)
├── src/
│   ├── assets/              # internal img and font
│   ├── components/          # Component used for the entire of project (reusable UI)
│   │   ├── Button.jsx       # common button
│   │   ├── Input.jsx        # common input field
│   │   └── LoadingSpinner.jsx # animation / effect while loading data
│   ├── features/            # include frontend logic
│   │   └── document-viewer/
│   │       ├── components/  # sub-components use for current feature
│   │       │   ├── SearchBar.jsx      # VIN search bar
│   │       │   ├── DocumentTable.jsx  # Document table
│   │       │   └── SourceBadge.jsx    # Badge for document sources (Sales / Service)
│   │       ├── hooks/
│   │       │   └── useFetchDocuments.js # Custom Hook handle logic for calling API from Backend, loading, error
│   │       └── DocumentViewerContainer.jsx # Parent Component to distribute data flows (Smart Component)
│   ├── services/            # Layer API to connect direct to Backend
│   │   └── api.js           # Initialize Axios instance connect to Backend (example: localhost:5000)
│   ├── utils/               # Ultilies function (example: check data time format, check VIN format)
│   │   └── formatters.js
│   ├── App.jsx              # React entpoint
│   └── main.jsx             # Render React into HTML root
├── .env                     # URL point to Backend (REACT_APP_API_URL or VITE_API_URL)
├── index.html
├── package.json
└── vite.config.js           # configuration build (nếu dùng Vite)
