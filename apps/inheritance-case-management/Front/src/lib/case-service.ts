import { InheritanceCase } from "./mock-data"
import { getAuthHeaders, clearAuth } from "./auth-service"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const res = await fetch(url, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers,
        },
    });

    if (res.status === 401) {
        clearAuth();
        window.location.href = '/login';
        throw new Error('認証が必要です');
    }

    return res;
}

export const getCases = async (): Promise<InheritanceCase[]> => {
    const res = await authFetch(`${API_URL}/cases`);
    if (!res.ok) throw new Error('Failed to fetch cases');
    return res.json();
}

export const getCase = async (id: string): Promise<InheritanceCase | undefined> => {
    const res = await authFetch(`${API_URL}/cases/${id}`);
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error('Failed to fetch case');
    return res.json();
}

export const saveCase = async (updatedCase: InheritanceCase): Promise<void> => {
    const res = await authFetch(`${API_URL}/cases/${updatedCase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCase),
    });
    if (!res.ok) throw new Error('Failed to update case');
}

export const createCase = async (newCase: Omit<InheritanceCase, "id">): Promise<void> => {
    const res = await authFetch(`${API_URL}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCase),
    });
    if (!res.ok) throw new Error('Failed to create case');
}

export const deleteCase = async (id: string): Promise<void> => {
    const res = await authFetch(`${API_URL}/cases/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete case');
}
