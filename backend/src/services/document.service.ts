import { ENV } from '../config/env.config.js';
import { SalesClient } from '../clients/sales.client.js';
import { ServiceClient } from '../clients/service.client.js';
import { UpstreamError } from '../clients/base.client.js';
import { mapSalesDocument, mapServiceDocument, sortDocuments } from '../adapters/document.adapters.js';
import { EDocumentSource, IRawSalesDocument, IRawServiceDocument, ISearchOutcome, IUnifiedDocument } from '../interfaces/document.interface.js';

interface ICacheEntry {
    outcome: ISearchOutcome;
    expiresAt: number;
}

/*
    Aggregation service: queries each dealership system independently and pushes
    one normalized frame per source as soon as it answers. No source waits for
    another, and no partial/combined state is ever produced.
*/
export default class DocumentService {
    private m_salesClient = new SalesClient();
    private m_serviceClient = new ServiceClient();
    private m_cache = new Map<string, ICacheEntry>();

    public async searchDocs(vin: string, onChunk: (data: ISearchOutcome) => void): Promise<void> {
        const vinKey = vin.toUpperCase();

        // each source runs independently: one timeout, one frame, no coupling
        await Promise.all([
            this._fetchSource(
                vinKey,
                EDocumentSource.SALES,
                (signal) => this.m_salesClient.fetchDocuments(vin, signal),
                (raw: IRawSalesDocument) => mapSalesDocument(raw)
            ).then(onChunk),
            this._fetchSource(
                vinKey,
                EDocumentSource.SERVICE,
                (signal) => this.m_serviceClient.fetchDocuments(vin, signal),
                (raw: IRawServiceDocument) => mapServiceDocument(raw)
            ).then(onChunk),
        ]);
    }

    /*
        Queries one dealership system and resolves with its frame.
        Cache is checked after the fetch only when the upstream call itself
        succeeded — a cached frame must never mask a live outage.
    */
    private async _fetchSource<T>(
        vinKey: string,
        source: EDocumentSource,
        fetchRaw: (signal: AbortSignal) => Promise<T[]>,
        adapt: (raw: T) => IUnifiedDocument
    ): Promise<ISearchOutcome> {
        const cacheKey = `${vinKey}-${source}`;

        try {
            const signal = AbortSignal.timeout(ENV.UPSTREAM_TIMEOUT_MS);
            const rawDocs = await fetchRaw(signal);

            const cached = this.m_cache.get(cacheKey);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.outcome;
            }

            const documents = sortDocuments(rawDocs.map(adapt));
            const outcome: ISearchOutcome = {
                vin: vinKey,
                source,
                documents,
                sources: {
                    status: documents.length > 0 ? 'ok' : 'empty',
                    count: documents.length,
                },
            };

            if (documents.length > 0) {
                this.m_cache.set(cacheKey, { outcome, expiresAt: Date.now() + ENV.CACHE_TTL_MS });
            }

            return outcome;
        } catch (error) {
            // timeout / unreachable / bad payload: this source is unavailable,
            // the other source's frame is unaffected
            const message = error instanceof UpstreamError
                ? error.message
                : 'Unexpected error while contacting upstream system';
            console.error(`[document-service] ${source} upstream failure: ${message}`);

            return {
                vin: vinKey,
                source,
                documents: [],
                sources: { status: 'error', count: 0, error: message },
            };
        }
    }
}
