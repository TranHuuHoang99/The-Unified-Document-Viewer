import React from 'react';

export const LoadingSpinner: React.FC = () => {
    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '48px 0',
                width: '100%',
            }}
        >
            <div
                style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid #e5e7eb',
                    borderTopColor: '#2563eb',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }}
            />
            <span style={{ color: '#6b7280', fontSize: '14px' }}>Searching both dealership systems…</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};
