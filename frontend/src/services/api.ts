import { API_ENDPOINTS } from '../constants/api.endpoints';
import { IDocumentSearchResponse } from '../types/document.types';

/*
    One request to the aggregation API; the backend fans out to both dealership systems.
*/
export const fetchDocumentsByVin = async (vin: string, signal?: AbortSignal): Promise<IDocumentSearchResponse> => {
    const response = await fetch(API_ENDPOINTS.DOCUMENTS.SEARCH(vin), { signal: signal ?? null });

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || `Request failed with status ${response.status}`);
    }

    return response.json();
};
