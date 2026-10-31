import { ENV } from '../config/env.config.js';
import { SalesClient } from '../clients/sales.client.js';
import { ServiceClient } from '../clients/service.client.js';
import { UpstreamError } from '../clients/base.client.js';
import { mapSalesDocument, mapServiceDocument, sortDocuments } from '../adapters/document.adapters.js';
import { EDocumentSource, IRawSalesDocument, IRawServiceDocument, ISearchOutcome, ISourceStatus, IUnifiedDocument } from '../interfaces/document.interface.js';

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

    // public async searchSale(vin: string): Promise<ISearchOutcome> {
    //     const cacheKey = vin.toUpperCase();

    //     const cached = this.m_cache.get(cacheKey);
    //     if (cached && cached.expiresAt > Date.now()) {
    //         return cached.outcome;
    //     }

    //     // one timeout for the whole fan-out
    //     const signal = AbortSignal.timeout(ENV.UPSTREAM_TIMEOUT_MS);

    //     const salesResult = await this.m_salesClient.fetchDocuments(vin, signal);

    //     const sales = this._toSourceResult<IRawSalesDocument>(salesResult, mapSalesDocument);

    //     const documents = sortDocuments([...sales.documents]);
    //     const outcome: ISearchOutcome = {
    //         vin: cacheKey,
    //         documents,
    //         sources: sales.status
    //     };

    //     // only cache complete, non-empty answers so a transient outage is retried quickly
    //     if (documents.length > 0) {
    //         this.m_cache.set(cacheKey, { outcome, expiresAt: Date.now() + ENV.CACHE_TTL_MS });
    //     }

    //     return outcome;
    // }

    public async searchDocs(vin: string, onChunk: (data: any) => void): Promise<void> {
        const vinKey = vin.toUpperCase();
        const signal = AbortSignal.timeout(ENV.UPSTREAM_TIMEOUT_MS);

        this.m_salesClient.fetchDocuments(vin, signal)
            .then((rawDocs: IRawSalesDocument[]): void => {
                const cacheKeySales = vinKey + "-" + EDocumentSource.SALES;
                const cached = this.m_cache.get(cacheKeySales);
                if (cached && cached.expiresAt > Date.now()) {
                    onChunk(cached.outcome);
                    return;
                }

                const sales = this._toSourceResult<IRawSalesDocument>(rawDocs, mapSalesDocument);
                const documents = sortDocuments([...sales.documents]);
                const outcome: ISearchOutcome = {
                    vin: vinKey,
                    documents: documents,
                    sources: sales.status
                };
                if (documents.length > 0) {
                    this.m_cache.set(cacheKeySales, { outcome, expiresAt: Date.now() + ENV.CACHE_TTL_MS });
                }
                onChunk(outcome);
            })
            .catch((err) => {
                console.error("Failed to request data from sales microservice, or timeout");
                onChunk({
                    vin: vinKey,
                    documents: [],
                    sources: { status: 'error', count: 0, error: '[document-service] upstream result is empty' }
                });
            });

        this.m_serviceClient.fetchDocuments(vin, signal)
            .then((rawDocs: IRawServiceDocument[]): void => {
                const cacheKeyServices = vinKey + "-" + EDocumentSource.SERVICE;
                const cached = this.m_cache.get(cacheKeyServices);
                if (cached && cached.expiresAt > Date.now()) {
                    onChunk(cached.outcome);
                    return;
                }

                const services = this._toSourceResult<IRawServiceDocument>(rawDocs, mapServiceDocument);
                const documents = sortDocuments([...services.documents]);
                const outcome: ISearchOutcome = {
                    vin: vinKey,
                    documents: documents,
                    sources: services.status
                };
                if (documents.length > 0) {
                    this.m_cache.set(cacheKeyServices, { outcome, expiresAt: Date.now() + ENV.CACHE_TTL_MS });
                }
                onChunk(outcome);
            })
            .catch((err) => {
                console.error("Failed to request data from sales microservice, or timeout");
                onChunk({
                    vin: vinKey,
                    documents: [],
                    sources: { status: 'error', count: 0, error: '[document-service] upstream result is empty' }
                });
            });
    }

    private _toSourceResult<T>(result: T[], adapt: (raw: T) => IUnifiedDocument): { documents: IUnifiedDocument[]; status: ISourceStatus } {
        if (result.length > 0) {
            const documents = result.map(adapt);
            return {
                documents,
                status: { status: documents.length > 0 ? 'ok' : 'empty', count: documents.length },
            };
        }

        const error_message = `[document-service] upstream result is empty`;
        console.error(error_message);
        return {
            documents: [],
            status: { status: 'error', count: 0, error: error_message },
        };
    }
}
