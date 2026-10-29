
export const fetchSaleDocuments = async (keyword: string) => {
    if (!keyword || !keyword.trim()) {
        return []; 
    }
    const response = await fetch(`/api/documents/sales?search=${encodeURIComponent(keyword.trim())}`);
    if (!response.ok) {
        throw new Error(`Error can not fetch sale data with VIN: ${keyword}`);
    }
    return response.json();
};

export const fetchServiceDocuments = async (keyword: string) => {
    if (!keyword || !keyword.trim()) {
        return []; 
    }
    const response = await fetch(`/api/documents/services?search=${encodeURIComponent(keyword.trim())}`);
    if (!response.ok) {
        throw new Error(`Error can not fetch services data with VIN: ${keyword}`);
    }
    return response.json();
}
