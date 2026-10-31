/*
    Types mirroring the backend contract for GET /api/documents?vin=...
*/

export type EDocumentSource = 'SALES' | 'SERVICE';
/*
    Per-source lifecycle: each dealership system resolves on its own,
    so one can still be pending while the other already has results.
*/
export type ESourceStatus = 'loading' | 'ok' | 'empty' | 'error';

export interface IUnifiedDocument {
    id: string;
    source: EDocumentSource;
    documentType: string;
    date: string | null;
    amount: number | null;
    status: string;
    fileUrl: string;
    details: Record<string, string | number | null>;
}

export interface ISourceStatus {
    status: ESourceStatus;
    count: number;
    error?: string;
}

/*
    One streamed frame = one dealership system's answer.
    `source` says which system produced it, so empty/error frames are still
    attributable and each source can settle independently.
*/
export interface IDocumentSearchResponse {
    success: boolean;
    message: string;
    vin: string;
    source: EDocumentSource;
    documents: IUnifiedDocument[];
    sources: ISourceStatus;
}

export const LOADING_SOURCE_STATUS: ISourceStatus = { status: 'loading', count: 0 };

/*
    Same rule as the backend: 17 chars, no I / O / Q.
*/
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export function isValidVin(vin: string): boolean {
    return VIN_PATTERN.test(vin.trim().toUpperCase());
}
