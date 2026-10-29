import React from "react";
import { ISaleDocsItem } from "../hooks/useFetchDocuments";

interface ISaleDocTableItem {
    saleDocData?: ISaleDocsItem | undefined;
};

export const SalesDocumentTable: React.FC<ISaleDocTableItem> = ({saleDocData}) => {
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
                        flex: 1
                    }
                }
            >
                SALES INFORMATION:
            </div>
            <div
                style={
                    {
                        flex: 1
                    }
                }
            >
                {saleDocData?.message}
            </div>
        </div>
    );
};
