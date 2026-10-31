/*
    Error raised when an upstream dealership system cannot be reached
    or answers with an error status. Allows the aggregator to call
    Promise.allSettled and report per-source status.
*/
export class UpstreamError extends Error {
    public readonly source: string;
    public readonly statusCode: number | undefined;

    constructor(source: string, message: string, statusCode?: number) {
        super(message);
        this.name = 'UpstreamError';
        this.source = source;
        this.statusCode = statusCode;
    }
}

interface IUpstreamResponse<T> {
    success: boolean;
    vin: string;
    count: number;
    documents: T[];
}

/*
    Shared HTTP client used by the sales / service clients.
    - one AbortSignal covers the whole upstream call, so the aggregator
      can enforce one timeout across all sources
*/
export abstract class BaseHttpClient {
    protected async getDocuments<T>(source: string, url: string, signal: AbortSignal): Promise<T[]> {
        let response: Response;
        try {
            response = await fetch(url, { signal });
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new UpstreamError(source, `${source} system timed out`);
            }
            throw new UpstreamError(source, `${source} system is unreachable`);
        }

        if (!response.ok) {
            throw new UpstreamError(source, `${source} system responded with HTTP ${response.status}`, response.status);
        }

        const body = (await response.json()) as IUpstreamResponse<T>;
        if (!body.success || !Array.isArray(body.documents)) {
            throw new UpstreamError(source, `${source} system returned an unexpected payload`);
        }
        return body.documents;
    }
}
