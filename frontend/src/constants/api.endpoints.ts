
export const API_ENDPOINTS = {
    DOCUMENTS: {
        SALES_SEARCH: (keyword: string) => 
            `/api/documents/sales/search?vin=${encodeURIComponent(keyword.trim())}`,
            
        SERVICES_SEARCH: (keyword: string) => 
            `/api/documents/services/search?vin=${encodeURIComponent(keyword.trim())}`,
    }
} as const;
