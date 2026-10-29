import { useState } from "react";
import { fetchSaleDocuments } from "../../../services/api";
import { fetchServiceDocuments } from "../../../services/api";

export const useFetchDocuments = () => {
    const [saleDocs, setSaleDocs] = useState();
    const [serviceDocs, setServiceDocs] = useState();
    const [loading, setLoadingAnim] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const triggerSearch = async (keyword: string) => {
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
    };

    return {saleDocs, serviceDocs, loading, error, triggerSearch};
};
