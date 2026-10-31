import { useEffect, useRef, useState } from 'react';
import { fetchDocumentsByVin } from '../../../services/api';
import { DEFAULT_SOURCE_STATUS, IDocumentSearchResponse, IUnifiedDocument, ISourceStatus } from '../../../types/document.types';

type SourceMap = Record<'SALES' | 'SERVICE', ISourceStatus>;

interface IUseVehicleDocumentsResult {
<<<<<<< Updated upstream
=======
    vin: string;
>>>>>>> Stashed changes
    documents: IUnifiedDocument[];
    sources: SourceMap;
    partial: boolean;
    message: string;
    loading: boolean;
    error: string | null;
}

const EMPTY_SOURCES: SourceMap = {
    SALES: DEFAULT_SOURCE_STATUS,
    SERVICE: DEFAULT_SOURCE_STATUS,
};

/*
    Fetches the consolidated document list for a VIN.
    A new search aborts the previous one so stale responses never win.
*/
export const useVehicleDocuments = (vin: string): IUseVehicleDocumentsResult => {
    const [data, setData] = useState<IDocumentSearchResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const controllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!vin) {
            setData(null);
            setError(null);
            setLoading(false);
            return;
        }

        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;

        setLoading(true);
        setError(null);

        fetchDocumentsByVin(vin, controller.signal)
            .then((response) => {
                if (!controller.signal.aborted) setData(response);
            })
            .catch((err: unknown) => {
                if (controller.signal.aborted) return;
                setData(null);
                setError(err instanceof Error ? err.message : 'Unexpected error while loading documents');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [vin]);

    return {
<<<<<<< Updated upstream
=======
        vin,
>>>>>>> Stashed changes
        documents: data?.documents ?? [],
        sources: data?.sources ?? EMPTY_SOURCES,
        partial: data?.partial ?? false,
        message: data?.message ?? '',
        loading,
        error,
    };
};
