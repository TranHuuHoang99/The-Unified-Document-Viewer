import { useState, useCallback } from "react";
import { fetchSaleDocuments } from "../../../services/api";
import { fetchServiceDocuments } from "../../../services/api";

export interface ISaleDocsItem {
    success: boolean;
    message: string;
};

export interface IServiceDocsItem {
    success: boolean;
    message: string;
}

interface IFetchDocumentResult {
    saleDocs: ISaleDocsItem | undefined;
    serviceDocs: IServiceDocsItem | undefined;
    loading: boolean;
    error: string | null;
    triggerSearch: (keyword: string) => Promise<void>;
};

export const useFetchDocuments = (): IFetchDocumentResult => {
    const [saleDocs, setSaleDocs] = useState();
    const [serviceDocs, setServiceDocs] = useState();
    const [loading, setLoadingAnim] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const triggerSearch = useCallback(async (keyword: string) => {
        if (!keyword || !keyword.trim()) return;
        try {
            setLoadingAnim(true);
            setError(null);
            const [saleData, serviceData] = await Promise.all([
                fetchSaleDocuments(keyword),
                fetchServiceDocuments(keyword)
            ]);
            setSaleDocs(saleData);
            setServiceDocs(serviceData);
        } catch (err: any) {
            setError(err.message || `Error while fetching data`);
        } finally {
            setLoadingAnim(false);
        }
    }, []);

    return {saleDocs, serviceDocs, loading, error, triggerSearch};
};
