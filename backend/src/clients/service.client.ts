import { ENV } from '../config/env.config.js';
import { IRawServiceDocument } from '../interfaces/document.interface.js';
import { BaseHttpClient } from './base.client.js';

/*
    HTTP client for the mocked Service dealership system.
*/
export class ServiceClient extends BaseHttpClient {
    private constructor() {
        super();
    }

    public fetchDocuments(vin: string, signal: AbortSignal): Promise<IRawServiceDocument[]> {
        const url = new URL('/api/service/docs', ENV.SERVICE_API_URL);
        url.searchParams.set('vin', vin);
        url.searchParams.set('delayMs', ENV.SERVICE_LATENCY_MS.toString());
        return this.getDocuments<IRawServiceDocument>('SERVICE', url.toString(), signal);
    }

    public fetchVins(signal: AbortSignal): Promise<string[]> {
        const url = new URL('/api/service/vin', ENV.SERVICE_API_URL);
        return this.getDocuments<string>('SERVICE', url.toString(), signal);
    }
}
