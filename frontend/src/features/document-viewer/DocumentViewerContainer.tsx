import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ISourceStatus } from '../../types/document.types';
import { DocumentTable } from './components/DocumentTable';
import { useVehicleDocuments } from './hooks/useFetchDocuments';

const SYSTEM_LABEL: Record<'SALES' | 'SERVICE', string> = {
    SALES: 'Sales system',
    SERVICE: 'Service system',
};

const StatusPill: React.FC<{ name: keyof typeof SYSTEM_LABEL; status: ISourceStatus }> = ({ name, status }) => {
    const palettes: Record<ISourceStatus['status'], { background: string; color: string; text: string }> = {
        ok: { background: '#dcfce7', color: '#166534', text: `${status.count} document(s)` },
        empty: { background: '#f3f4f6', color: '#4b5563', text: 'no documents' },
        error: { background: '#fee2e2', color: '#991b1b', text: 'unavailable' },
    };
    const palette = palettes[status.status];

    return (
        <span
            title={status.error ?? undefined}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                backgroundColor: palette.background,
                color: palette.color,
            }}
        >
            <strong>{SYSTEM_LABEL[name]}</strong> {palette.text}
        </span>
    );
};

export const DocumentViewerContainer: React.FC = () => {
    const [searchParams] = useSearchParams();
    const vin = (searchParams.get('vin') ?? '').trim().toUpperCase();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const { documents, sources, partial, message, loading, error } = useVehicleDocuments(vin);

    const toggleRow = (id: string) => setExpandedId((current) => (current === id ? null : id));

    if (!vin) {
        return (
            <div style={placeholderStyle}>
                Enter a VIN above to see every document related to that vehicle.
            </div>
        );
    }

<<<<<<< Updated upstream
    if (loading) {
        return (<LoadingSpinner />);
    }

    if (error) {
        return (
            <div style={{ ...bannerStyle, backgroundColor: '#fee2e2', color: '#991b1b' }}>
                {error}
            </div>
        );
    }

    if (partial) {
        return (
            <div style={{ ...bannerStyle, backgroundColor: '#fef3c7', color: '#92400e' }}>
                Partial results — at least one dealership system could not be reached. Showing what we have.
            </div>
        );
    }

=======
>>>>>>> Stashed changes
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>VIN {vin}</span>
                <StatusPill name="SALES" status={sources.SALES} />
                <StatusPill name="SERVICE" status={sources.SERVICE} />
            </div>

<<<<<<< Updated upstream
            <>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{message}</div>
                {documents.length > 0 ? (
                    <DocumentTable documents={documents} expandedId={expandedId} onToggleRow={toggleRow} />
                ) : (
                    <div style={placeholderStyle}>No documents found for this VIN in either system.</div>
                )}
            </>
=======
            {loading && <LoadingSpinner />}

            {!loading && error && (
                <div style={{ ...bannerStyle, backgroundColor: '#fee2e2', color: '#991b1b' }}>{error}</div>
            )}

            {!loading && !error && partial && (
                <div style={{ ...bannerStyle, backgroundColor: '#fef3c7', color: '#92400e' }}>
                    Partial results — at least one dealership system could not be reached. Showing what we have.
                </div>
            )}

            {!loading && !error && (
                <>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>{message}</div>
                    {documents.length > 0 ? (
                        <DocumentTable documents={documents} expandedId={expandedId} onToggleRow={toggleRow} />
                    ) : (
                        <div style={placeholderStyle}>No documents found for this VIN in either system.</div>
                    )}
                </>
            )}
>>>>>>> Stashed changes
        </div>
    );
};

const placeholderStyle: React.CSSProperties = {
    padding: '40px 0',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
};

const bannerStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '13px',
};
