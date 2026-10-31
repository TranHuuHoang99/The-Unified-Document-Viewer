import { API_ENDPOINTS } from '../constants/api.endpoints';
import { IDocumentSearchResponse } from '../types/document.types';

/*
    Streams the consolidated document list for a VIN.

    The aggregation backend pushes one JSON frame per dealership system, as soon as
    that system answers. `onChunk` is therefore called once for SALES and once for
    SERVICE, in whichever order they complete — the caller renders each frame
    immediately instead of waiting for both. The promise resolves when the stream
    is closed by the backend.
*/
export const fetchDocumentsByVin = async (
    vin: string,
    onChunk: (response: IDocumentSearchResponse) => void,
    signal?: AbortSignal
): Promise<void> => {
    const response = await fetch(API_ENDPOINTS.DOCUMENTS.SEARCH(vin), {
        signal: signal ?? null,
        headers: { Accept: 'text/event-stream' },
    });

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || `Request failed with status ${response.status}`);
    }

    if (!response.body) {
        throw new Error('Streaming is not supported by this browser');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // each upstream result is written as one newline-delimited JSON frame
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);

            if (line) {
                onChunk(JSON.parse(line) as IDocumentSearchResponse);
            }

            newlineIndex = buffer.indexOf('\n');
        }
    }

    // a final frame without a trailing newline
    const trailing = buffer.trim();
    if (trailing) {
        onChunk(JSON.parse(trailing) as IDocumentSearchResponse);
    }
};
