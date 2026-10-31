/*
    Types mirroring the backend contract for GET /api/documents?vin=...
*/

export type EDocumentSource = 'SALES' | 'SERVICE';
export type ESourceStatus = 'ok' | 'empty' | 'error';

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

export interface IDocumentSearchResponse {
    success: boolean;
    message: string;
    vin: string;
    documents: IUnifiedDocument[];
    sources: Record<EDocumentSource, ISourceStatus>;
    partial: boolean;
}

export const DEFAULT_SOURCE_STATUS: ISourceStatus = { status: 'empty', count: 0 };

/*
    Same rule as the backend: 17 chars, no I / O / Q.
*/
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export function isValidVin(vin: string): boolean {
    return VIN_PATTERN.test(vin.trim().toUpperCase());
}
