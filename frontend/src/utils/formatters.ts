export function formatDate(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatAmount(value: number | null): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function formatDocumentType(value: string): string {
    return value.replace(/_/g, ' ');
}

export function formatOdometer(value: string | number | null): string {
    if (value === null || value === undefined) return 'n/a';
    return `${Number(value).toLocaleString('en-US')} km`;
}
