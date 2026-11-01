import { ENV } from '../config/env.config.js';
import { IRawSalesDocument } from '../interfaces/document.interface.js';
import { BaseHttpClient } from './base.client.js';

/*
    HTTP client for the mocked Sales dealership system.
*/
export class SalesClient extends BaseHttpClient {
    private constructor() {
        super();
    }

    public fetchDocuments(vin: string, signal: AbortSignal): Promise<IRawSalesDocument[]> {
        const url = new URL('/api/sales/docs', ENV.SALES_API_URL);
        url.searchParams.set('vin', vin);
        // this is used for test latency only
        url.searchParams.set('delayMs', ENV.SALE_LATENCY_MS.toString());
        return this.getDocuments<IRawSalesDocument>('SALES', url.toString(), signal);
    }

    public fetchVins(signal: AbortSignal): Promise<string[]> {
        const url = new URL('/api/sales/vin', ENV.SALES_API_URL);
        return this.getDocuments<string>('SALES', url.toString(), signal);
    }
}
