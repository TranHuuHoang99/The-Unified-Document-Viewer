import React, { useState } from 'react';
import { IUnifiedDocument } from '../../../types/document.types';
import { formatAmount, formatDate, formatDocumentType, formatOdometer } from '../../../utils/formatters';
import { SourceBadge } from './SourceBadge';

interface IDocumentTableProps {
    documents: IUnifiedDocument[];
    expandedId: string | null;
    onToggleRow: (id: string) => void;
}

/*
    One consolidated table for documents from both dealership systems.
    The Source column makes the origin of each row explicit.
*/
export const DocumentTable: React.FC<IDocumentTableProps> = ({ documents, expandedId, onToggleRow }) => {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
                <tr style={{ textAlign: 'left', backgroundColor: '#f3f4f6' }}>
                    <th style={cellStyle}>Source</th>
                    <th style={cellStyle}>Document ID</th>
                    <th style={cellStyle}>Type</th>
                    <th style={cellStyle}>Date</th>
                    <th style={cellStyle}>Amount</th>
                    <th style={cellStyle}>Status</th>
                    <th style={cellStyle}>File</th>
                </tr>
            </thead>
            <tbody>
                {documents.map((doc) => {
                    const isExpanded = expandedId === doc.id;
                    return (
                        <React.Fragment key={doc.id}>
                            <tr
                                onClick={() => onToggleRow(doc.id)}
                                onMouseEnter={() => setHoveredId(doc.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                style={{
                                    borderBottom: '1px solid #e5e7eb',
                                    cursor: 'pointer',
                                    backgroundColor: isExpanded ? '#eff6ff' : hoveredId === doc.id ? '#f9fafb' : 'transparent',
                                }}
                                aria-expanded={isExpanded}
                            >
                                <td style={cellStyle}>
                                    <SourceBadge source={doc.source} />
                                </td>
                                <td style={{ ...cellStyle, fontFamily: 'monospace' }}>{doc.id}</td>
                                <td style={cellStyle}>{formatDocumentType(doc.documentType)}</td>
                                <td style={cellStyle}>{formatDate(doc.date)}</td>
                                <td style={{ ...cellStyle, textAlign: 'right' }}>{formatAmount(doc.amount)}</td>
                                <td style={cellStyle}>{doc.status}</td>
                                <td style={cellStyle}>
                                    <a
                                        href={doc.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(event) => event.stopPropagation()}
                                        style={{ color: '#2563eb' }}
                                    >
                                        View PDF
                                    </a>
                                </td>
                            </tr>
                            {isExpanded && (
                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                    <td colSpan={7} style={{ ...cellStyle, fontSize: '13px', color: '#374151' }}>
                                        <strong>Source-specific details</strong>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '6px' }}>
                                            {Object.entries(doc.details).map(([key, value]) => (
                                                <span key={key}>
                                                    <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>
                                                        {key.replace(/([A-Z])/g, ' $1')}:
                                                    </span>{' '}
                                                    {key === 'odometer' ? formatOdometer(value) : (value ?? '—')}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    );
                })}
            </tbody>
        </table>
    );
};

const cellStyle: React.CSSProperties = {
    padding: '10px 12px',
    verticalAlign: 'middle',
};
