import { EDocumentSource, IUnifiedDocument, IRawSalesDocument, IRawServiceDocument } from '../interfaces/document.interface.js';

/*
    Source adapters: normalize each dealership system's raw document shape
    into the unified shape. This is the only place that knows the difference.
*/

export function mapSalesDocument(raw: IRawSalesDocument): IUnifiedDocument {
    return {
        id: raw.document_id,
        source: EDocumentSource.SALES,
        documentType: raw.document_type,
        date: raw.sale_date ?? null,
        amount: raw.total_amount ?? null,
        status: raw.status,
        fileUrl: raw.file_url,
        details: {
            customerName: raw.customer_name ?? null,
            customerId: raw.customer_id ?? null,
            salesperson: raw.salesperson_name ?? null,
        },
    };
}

export function mapServiceDocument(raw: IRawServiceDocument): IUnifiedDocument {
    return {
        id: raw.document_id,
        source: EDocumentSource.SERVICE,
        documentType: raw.document_type,
        date: raw.service_date ?? null,
        amount: raw.total_cost ?? null,
        status: raw.status,
        fileUrl: raw.file_url,
        details: {
            customerName: null,
            customerId: raw.customer_id ?? null,
            serviceAdvisor: raw.service_advisor ?? null,
            technician: raw.technician_name ?? null,
            odometer: raw.mileage_odometer ?? null,
        },
    };
}

/*
    Newest first; documents without a date sink to the bottom.
*/
export function sortDocuments(documents: IUnifiedDocument[]): IUnifiedDocument[] {
    return [...documents].sort((a, b) => {
        if (a.date === null && b.date === null) return 0;
        if (a.date === null) return 1;
        if (b.date === null) return -1;
        return b.date.localeCompare(a.date);
    });
}
