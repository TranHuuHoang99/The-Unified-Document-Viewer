import React, { useState } from 'react';
import { IUnifiedDocument } from '../../../types/document.types';
import { formatAmount, formatDate, formatDocumentType, formatOdometer } from '../../../utils/formatters';
import { SourceBadge } from './SourceBadge';

interface IDocumentTableProps {
    documents: IUnifiedDocument[];
    expandedIds: Set<string>;
    onToggleRow: (id: string) => void;
}

/*
    One consolidated table for documents from both dealership systems.
    The Source column makes the origin of each row explicit.
*/
export const DocumentTable: React.FC<IDocumentTableProps> = ({ documents, expandedIds, onToggleRow }) => {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
                <tr style={{ textAlign: 'left', backgroundColor: '#f3f4f6' }}>
                    <th>Source</th>
                    <th>Document ID</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>File</th>
                </tr>
            </thead>
            <tbody>
                {documents.map((doc) => {
                    const isExpanded = expandedIds.has(doc.id);
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
                                <td>
                                    <SourceBadge source={doc.source} />
                                </td>
                                <td>{doc.id}</td>
                                <td>{formatDocumentType(doc.documentType)}</td>
                                <td>{formatDate(doc.date)}</td>
                                <td>{formatAmount(doc.amount)}</td>
                                <td>{doc.status}</td>
                                <td>
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
                                    <td colSpan={7}>
                                        <strong>Source-specific details</strong>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '6px' }}>
                                            {Object.entries(doc.details).map(([key, value]) => (
                                                <span key={key}>
                                                    <span>
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
