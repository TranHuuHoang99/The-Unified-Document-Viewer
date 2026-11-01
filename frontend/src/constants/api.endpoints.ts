export const API_ENDPOINTS = {
    DOCUMENTS: {
        SEARCH: (vin: string) => `/api/documents?vin=${encodeURIComponent(vin.trim())}`,
    },

    SUGGESTIONS: {
        SEARCH: (vinSubstr: string) => `/api/suggestions?vin=${encodeURIComponent(vinSubstr.trim())}`,
    }
} as const;
