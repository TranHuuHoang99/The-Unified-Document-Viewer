import { useEffect, useRef, useState } from 'react';
import { fetchDocumentsByVin } from '../../../services/api';
import { EDocumentSource, IUnifiedDocument, ISourceStatus, LOADING_SOURCE_STATUS } from '../../../types/document.types';

export interface ISourceEntry {
    status: ISourceStatus;
    documents: IUnifiedDocument[];
    message: string;
}

type SourceMap = Record<EDocumentSource, ISourceEntry>;

interface IUseVehicleDocumentsResult {
    sources: SourceMap;
    error: string | null;
}

/*
    Each source starts with its own object so one settling never mutates the other.
*/
const createEmptySources = (): SourceMap => ({
    SALES: { status: LOADING_SOURCE_STATUS, documents: [], message: '' },
    SERVICE: { status: LOADING_SOURCE_STATUS, documents: [], message: '' },
});

/*
    Fetches the consolidated document list for a VIN.

    The backend streams one frame per dealership system, so each source settles
    independently: whichever answers first is rendered right away, while the other
    keeps its own loading state. A new search aborts the previous stream so stale
    frames never win.
*/
export const useVehicleDocuments = (vin: string): IUseVehicleDocumentsResult => {
    const [sources, setSources] = useState<SourceMap>(createEmptySources);
    const [error, setError] = useState<string | null>(null);
    const controllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        // frontend self setting loading status and wait data stream from backend
        setSources(createEmptySources());
        setError(null);

        if (!vin) return;

        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;

        fetchDocumentsByVin(
            vin,
            (frame) => {
                if (controller.signal.aborted) return;

                setSources((current) => ({
                    ...current,
                    [frame.source]: {
                        status: frame.sources,
                        documents: frame.documents,
                        message: frame.message,
                    },
                }));
            },
            controller.signal
        ).catch((err: unknown) => {
            if (controller.signal.aborted) return;
            setError(err instanceof Error ? err.message : 'Unexpected error while loading documents');
        });

        return () => controller.abort();
    }, [vin]);

    return { sources, error };
};
