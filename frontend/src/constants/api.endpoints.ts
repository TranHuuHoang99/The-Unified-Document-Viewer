export const API_ENDPOINTS = {
    DOCUMENTS: {
        SEARCH: (vin: string) => `/api/documents?vin=${encodeURIComponent(vin.trim())}`,
    },
} as const;
