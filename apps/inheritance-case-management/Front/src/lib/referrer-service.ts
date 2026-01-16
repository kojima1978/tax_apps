import { Referrer } from "./referrer-data"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export const getReferrers = async (): Promise<Referrer[]> => {
    const res = await fetch(`${API_URL}/referrers`);
    if (!res.ok) throw new Error('Failed to fetch referrers');
    return res.json();
}

export const createReferrer = async (data: Omit<Referrer, "id">): Promise<Referrer> => {
    const res = await fetch(`${API_URL}/referrers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create referrer');
    return res.json();
}

export const updateReferrer = async (data: Referrer): Promise<Referrer> => {
    const res = await fetch(`${API_URL}/referrers/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update referrer');
    return res.json();
}

export const deleteReferrer = async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/referrers/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete referrer');
}
