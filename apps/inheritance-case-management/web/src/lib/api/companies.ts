import { apiClient } from './client';
import type { MergeResult } from '@/types/shared';

export { getCompanies, createCompany, updateCompany, deleteCompany } from './masters';

export async function mergeCompanies(sourceId: number, targetId: number): Promise<MergeResult> {
  return apiClient<MergeResult>('/companies/merge', {
    method: 'POST',
    body: JSON.stringify({ sourceId, targetId }),
  });
}
