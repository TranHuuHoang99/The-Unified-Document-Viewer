import React, { useEffect } from "react";
import { SalesDocumentTable } from "./components/SalesDocumentTable";
import { ServicesDocumentTable } from "./components/ServicesDocumentTable";
import { useSearchParams } from "react-router-dom";
import { ISaleDocsItem, IServiceDocsItem, useFetchDocuments } from "./hooks/useFetchDocuments";

export const DocumentViewerContainer = () => {
    const [searchParams] = useSearchParams();
    const {saleDocs, serviceDocs, loading, error, triggerSearch} = useFetchDocuments();

    const vinQuery = searchParams.get("vin") || "";
    useEffect(() => {
        if (vinQuery) {
            triggerSearch(vinQuery);
        }
    }, [vinQuery]);

    return (
        <div
            style={
                {
                    width: '100%',
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: 'flex-start',
                    padding: '10px',
                    flex: 1
                }
            }
        >
            <div
                style={
                    {
                        borderBottom: "2px solid #d1d5db",
                        flex: 1
                    }
                }
            >
                <SalesDocumentTable saleDocData={saleDocs}/>
            </div>

            <div
                style={
                    {
                        flex: 1
                    }
                }
            >
                <ServicesDocumentTable serviceDocData={serviceDocs}/>
            </div>
        </div>
    );
};
