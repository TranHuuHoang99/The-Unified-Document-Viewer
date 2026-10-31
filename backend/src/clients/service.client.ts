import { ENV } from '../config/env.config.js';
import { IRawServiceDocument } from '../interfaces/document.interface.js';
import { BaseHttpClient } from './base.client.js';

/*
    HTTP client for the mocked Service dealership system.
*/
export class ServiceClient extends BaseHttpClient {
    public fetchDocuments(vin: string, signal: AbortSignal): Promise<IRawServiceDocument[]> {
        const url = new URL('/api/service/docs', ENV.SERVICE_API_URL);
        url.searchParams.set('vin', vin);
        return this.getDocuments<IRawServiceDocument>('SERVICE', url.toString(), signal);
    }
}
