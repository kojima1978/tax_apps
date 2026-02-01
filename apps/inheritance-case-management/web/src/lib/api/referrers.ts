import { apiClient } from './client';
import type { Referrer } from '@tax-apps/shared';
import type { CreateReferrerInput, UpdateReferrerInput } from '@tax-apps/validation';

export async function getReferrers(): Promise<Referrer[]> {
  return apiClient<Referrer[]>('/referrers');
}

export async function getReferrer(id: string): Promise<Referrer | null> {
  try {
    return await apiClient<Referrer>(`/referrers/${id}`);
  } catch (error) {
    if (error instanceof Error && 'status' in error && (error as { status: number }).status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createReferrer(data: CreateReferrerInput): Promise<Referrer> {
  return apiClient<Referrer>('/referrers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateReferrer(id: string, data: UpdateReferrerInput): Promise<Referrer> {
  return apiClient<Referrer>(`/referrers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteReferrer(id: string): Promise<void> {
  await apiClient<void>(`/referrers/${id}`, { method: 'DELETE' });
}
