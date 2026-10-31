/*
    Contract shared by the aggregation service, the upstream clients and the HTTP layer.
    Both dealership systems are normalized into IUnifiedDocument so the frontend
    can render one consolidated list with a clear source label.
*/
export enum EDocumentSource {
    SALES = 'SALES',
    SERVICE = 'SERVICE',
}

/*
    Raw document shapes returned by the mocked upstream systems
    (mirror of the JSON fixtures in gen_database/).
*/
export interface IRawSalesDocument {
    document_id: string;
    vin: string;
    customer_id: string;
    customer_name: string;
    document_type: string;
    salesperson_name: string;
    sale_date: string;
    total_amount: number;
    status: string;
    file_url: string;
}

export interface IRawServiceDocument {
    document_id: string;
    vin: string;
    customer_id: string;
    customer_name: string;
    document_type: string;
    service_advisor: string;
    technician_name: string;
    service_date: string;
    mileage_odometer: number;
    total_cost: number;
    status: string;
    file_url: string;
}

/*
    Source-agnostic document shape sent to the frontend.
    `details` carries the fields that only exist on one side.
*/
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

export type ESourceStatus = 'ok' | 'empty' | 'error' | 'loading';

export interface ISourceStatus {
    status: ESourceStatus;
    count: number;
    error?: string;
}

/*
    Domain payload built by the aggregation service.
*/
export interface ISearchOutcome {
    vin: string;
    documents: IUnifiedDocument[];
    sources: ISourceStatus;
}

/*
    Full HTTP response for GET /api/documents.
*/
export interface IDocumentSearchResponse extends ISearchOutcome {
    success: boolean;
    message: string;
}
