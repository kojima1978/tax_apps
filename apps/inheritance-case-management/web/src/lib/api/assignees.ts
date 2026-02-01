import { apiClient } from './client';
import type { Assignee } from '@tax-apps/shared';
import type { CreateAssigneeInput, UpdateAssigneeInput } from '@tax-apps/validation';

export async function getAssignees(): Promise<Assignee[]> {
  return apiClient<Assignee[]>('/assignees');
}

export async function getAssignee(id: string): Promise<Assignee | null> {
  try {
    return await apiClient<Assignee>(`/assignees/${id}`);
  } catch (error) {
    if (error instanceof Error && 'status' in error && (error as { status: number }).status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createAssignee(data: CreateAssigneeInput): Promise<Assignee> {
  return apiClient<Assignee>('/assignees', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAssignee(id: string, data: UpdateAssigneeInput): Promise<Assignee> {
  return apiClient<Assignee>(`/assignees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAssignee(id: string): Promise<void> {
  await apiClient<void>(`/assignees/${id}`, { method: 'DELETE' });
}
