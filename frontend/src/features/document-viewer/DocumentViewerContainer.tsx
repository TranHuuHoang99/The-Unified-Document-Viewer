import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EDocumentSource } from '../../types/document.types';
import { ISourceEntry, useVehicleDocuments } from './hooks/useFetchDocuments';
import { DocumentTable } from './components/DocumentTable';

const SOURCE_LABEL: Record<EDocumentSource, string> = {
    SALES: 'Sales system',
    SERVICE: 'Service system',
};

/*
    Spinner for a single dealership system that has not answered yet.
*/
const InlineLoading: React.FC<{ label: string }> = ({ label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 0', color: '#6b7280', fontSize: '13px' }}>
        <div
            style={{
                width: '16px',
                height: '16px',
                border: '2px solid #e5e7eb',
                borderTopColor: '#2563eb',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
            }}
        />
        <span>{label}</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

/*
    One dealership system, rendered on its own.
    Whatever it returns is shown immediately; a source still in flight keeps
    its spinner and does not hold back the other one.
*/
const SourceSection: React.FC<{
    source: EDocumentSource;
    entry: ISourceEntry;
    expandedIds: Set<string>;
    onToggleRow: (id: string) => void;
}> = ({ source, entry, expandedIds, onToggleRow }) => {
    const label = SOURCE_LABEL[source];

    if (entry.status.status === 'loading') {
        return (
            <InlineLoading label={`Searching the ${label.toLowerCase()}…`} />
        );
    }

    if (entry.status.status === 'error') {
        return (
            <div style={{ color: '#b40606'}}>
                {label} is unavailable. {entry.status.error ?? ''}
            </div>
        );
    }

    if (entry.documents.length > 0) {
        return (
            <DocumentTable documents={entry.documents} expandedIds={expandedIds} onToggleRow={onToggleRow} />
        );
    }

    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{entry.message}</span>
            </div>

            <div>No documents in the {label.toLowerCase()}.</div>
        </section>
    );
};

export const DocumentViewerContainer: React.FC = () => {
    const [searchParams] = useSearchParams();
    const vin = (searchParams.get('vin') ?? '').trim().toUpperCase();
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const { sources, error } = useVehicleDocuments(vin);

    const toggleRow = (id: string) =>
        setExpandedIds((current) => {
            const next = new Set(current);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });

    if (!vin) {
        return (
            <div>
                Enter a VIN above to see every document related to that vehicle.
            </div>
        );
    }

    // only a whole-backend failure replaces the view; per-source failures stay inline
    if (error) {
        return (
            <div style={{ color: '#991b1b' }}>
                {error}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <div style={{ fontWeight: 600 }}>VIN {vin}</div>

            {(Object.keys(SOURCE_LABEL) as EDocumentSource[]).map((source) => (
                <SourceSection
                    key={source}
                    source={source}
                    entry={sources[source]}
                    expandedIds={expandedIds}
                    onToggleRow={toggleRow}
                />
            ))}
        </div>
    );
};
