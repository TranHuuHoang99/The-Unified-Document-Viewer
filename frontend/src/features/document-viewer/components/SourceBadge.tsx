import { EDocumentSource } from '../../../types/document.types';

const SOURCE_STYLES: Record<'SALES' | 'SERVICE', { label: string; backgroundColor: string; color: string }> = {
    SALES: { label: 'SALES', backgroundColor: '#1d4ed8', color: '#ffffff' },
    SERVICE: { label: 'SERVICE', backgroundColor: '#047857', color: '#ffffff' },
};

/*
    Small colored tag identifying which dealership system a document came from.
    This is the "clearly indicating the source" requirement.
*/
export const SourceBadge: React.FC<{ source: EDocumentSource }> = ({ source }) => {
    const style = SOURCE_STYLES[source];

    return (
        <span
            style={{
                display: 'inline-block',
                padding: '2px 10px',
                borderRadius: '9999px',
                backgroundColor: style.backgroundColor,
                color: style.color,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
            }}
        >
            {style.label}
        </span>
    );
};
