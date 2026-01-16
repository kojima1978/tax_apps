import { Assignee } from "./assignee-data"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export const getAssignees = async (): Promise<Assignee[]> => {
    const res = await fetch(`${API_URL}/assignees`);
    if (!res.ok) throw new Error('Failed to fetch assignees');
    return res.json();
}

export const createAssignee = async (data: Omit<Assignee, "id">): Promise<Assignee> => {
    const res = await fetch(`${API_URL}/assignees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create assignee');
    return res.json();
}

export const updateAssignee = async (data: Assignee): Promise<Assignee> => {
    const res = await fetch(`${API_URL}/assignees/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update assignee');
    return res.json();
}

export const deleteAssignee = async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/assignees/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete assignee');
}
