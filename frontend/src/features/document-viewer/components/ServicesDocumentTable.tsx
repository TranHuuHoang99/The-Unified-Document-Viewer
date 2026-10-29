import React from "react";
import { IServiceDocsItem } from "../hooks/useFetchDocuments";

interface IServiceDocTableItem {
    serviceDocData?: IServiceDocsItem | undefined;
}

export const ServicesDocumentTable: React.FC<IServiceDocTableItem> = ({serviceDocData}) => {
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
                SERVICE INFORMATION:
            </div>
            <div
                style={
                    {
                        flex: 1
                    }
                }
            >
                {serviceDocData?.message}
            </div>
        </div>
    );
};
