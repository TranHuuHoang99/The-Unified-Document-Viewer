import { ENV } from '../config/env.config.js';
import { SalesClient } from '../clients/sales.client.js';
import { ServiceClient } from '../clients/service.client.js';
import { UpstreamError } from '../clients/base.client.js';
import { mapSalesDocument, mapServiceDocument, sortDocuments } from '../adapters/document.adapters.js';
import { EDocumentSource, ISearchOutcome, ISourceStatus, IUnifiedDocument } from '../interfaces/document.interface.js';

interface ICacheEntry {
    outcome: ISearchOutcome;
    expiresAt: number;
}

/*
    Aggregation service: fans out to both dealership systems in parallel,
    normalizes the results into one list and reports per-source status.
*/
export default class DocumentService {
    private m_salesClient = new SalesClient();
    private m_serviceClient = new ServiceClient();
    private m_cache = new Map<string, ICacheEntry>();

    public async search(vin: string): Promise<ISearchOutcome> {
        const cacheKey = vin.toUpperCase();

        const cached = this.m_cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.outcome;
        }

        // one timeout for the whole fan-out
        const signal = AbortSignal.timeout(ENV.UPSTREAM_TIMEOUT_MS);

        const [salesResult, serviceResult] = await Promise.allSettled([
            this.m_salesClient.fetchDocuments(vin, signal),
            this.m_serviceClient.fetchDocuments(vin, signal),
        ]);

        const sales = this._toSourceResult(salesResult, mapSalesDocument);
        const service = this._toSourceResult(serviceResult, mapServiceDocument);

        const documents = sortDocuments([...sales.documents, ...service.documents]);
        const outcome: ISearchOutcome = {
            vin: cacheKey,
            documents,
            sources: {
                [EDocumentSource.SALES]: sales.status,
                [EDocumentSource.SERVICE]: service.status,
            },
            partial: sales.status.status === 'error' || service.status.status === 'error',
        };

        // only cache complete, non-empty answers so a transient outage is retried quickly
        if (!outcome.partial && documents.length > 0) {
            this.m_cache.set(cacheKey, { outcome, expiresAt: Date.now() + ENV.CACHE_TTL_MS });
        }

        return outcome;
    }

    private _toSourceResult<T>(
        result: PromiseSettledResult<T[]>,
        adapt: (raw: T) => IUnifiedDocument
    ): { documents: IUnifiedDocument[]; status: ISourceStatus } {
        if (result.status === 'fulfilled') {
            const documents = result.value.map(adapt);
            return {
                documents,
                status: { status: documents.length > 0 ? 'ok' : 'empty', count: documents.length },
            };
        }

        const reason = result.reason;
        const message = reason instanceof UpstreamError ? reason.message : 'Unexpected error while contacting upstream system';
        console.error(`[document-service] upstream failure: ${message}`);
        return {
            documents: [],
            status: { status: 'error', count: 0, error: message },
        };
    }
}
