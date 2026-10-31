import { ENV } from '../config/env.config.js';
import { IRawSalesDocument } from '../interfaces/document.interface.js';
import { BaseHttpClient } from './base.client.js';

/*
    HTTP client for the mocked Sales dealership system.
*/
export class SalesClient extends BaseHttpClient {
    public fetchDocuments(vin: string, signal: AbortSignal): Promise<IRawSalesDocument[]> {
        const url = new URL('/api/sales/docs', ENV.SALES_API_URL);
        url.searchParams.set('vin', vin);
        return this.getDocuments<IRawSalesDocument>('SALES', url.toString(), signal);
    }
}
