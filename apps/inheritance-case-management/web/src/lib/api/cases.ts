import { apiClient } from './client';
import type { InheritanceCase, PaginatedResponse } from '@/types/shared';
import type { CreateCaseInput, UpdateCaseInput, ListQueryInput } from '@/types/validation';

export type CasesQueryParams = Partial<ListQueryInput>;

export async function getCases(params?: CasesQueryParams): Promise<PaginatedResponse<InheritanceCase>> {
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.handlingStatus) searchParams.set('handlingStatus', params.handlingStatus);
  if (params?.acceptanceStatus) searchParams.set('acceptanceStatus', params.acceptanceStatus);
  if (params?.fiscalYear) searchParams.set('fiscalYear', String(params.fiscalYear));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.assigneeId) searchParams.set('assigneeId', String(params.assigneeId));
  if (params?.internalReferrerId) searchParams.set('internalReferrerId', String(params.internalReferrerId));
  if (params?.staffId) searchParams.set('staffId', String(params.staffId));
  if (params?.referrerCompany) searchParams.set('referrerCompany', params.referrerCompany);
  if (params?.unassigned) searchParams.set('unassigned', 'true');
  if (params?.noReferrer) searchParams.set('noReferrer', 'true');
  if (params?.department) searchParams.set('department', params.department);
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const queryString = searchParams.toString();
  const url = queryString ? `/cases?${queryString}` : '/cases';

  return apiClient<PaginatedResponse<InheritanceCase>>(url);
}

export async function getCase(id: number): Promise<InheritanceCase | null> {
  try {
    return await apiClient<InheritanceCase>(`/cases/${id}`);
  } catch (error) {
    if (error instanceof Error && 'status' in error && (error as { status: number }).status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createCase(data: CreateCaseInput): Promise<InheritanceCase> {
  return apiClient<InheritanceCase>('/cases', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCase(id: number, data: UpdateCaseInput, updatedAt?: string): Promise<InheritanceCase> {
  return apiClient<InheritanceCase>(`/cases/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...data, ...(updatedAt && { updatedAt }) }),
  });
}

export async function deleteCase(id: number): Promise<void> {
  await apiClient<void>(`/cases/${id}`, { method: 'DELETE' });
}

export async function bulkDeleteCases(params?: Omit<CasesQueryParams, 'page' | 'pageSize' | 'sortBy' | 'sortOrder'>): Promise<{ deleted: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.handlingStatus) searchParams.set('handlingStatus', params.handlingStatus);
  if (params?.acceptanceStatus) searchParams.set('acceptanceStatus', params.acceptanceStatus);
  if (params?.fiscalYear) searchParams.set('fiscalYear', String(params.fiscalYear));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.assigneeId) searchParams.set('assigneeId', String(params.assigneeId));
  if (params?.internalReferrerId) searchParams.set('internalReferrerId', String(params.internalReferrerId));
  if (params?.staffId) searchParams.set('staffId', String(params.staffId));
  if (params?.referrerCompany) searchParams.set('referrerCompany', params.referrerCompany);
  if (params?.unassigned) searchParams.set('unassigned', 'true');
  if (params?.noReferrer) searchParams.set('noReferrer', 'true');
  if (params?.department) searchParams.set('department', params.department);

  const queryString = searchParams.toString();
  const url = queryString ? `/cases/bulk-delete?${queryString}` : '/cases/bulk-delete';
  return apiClient<{ deleted: number }>(url, { method: 'DELETE' });
}

// Fetch all cases (for analytics and export)
// Optional filters allow exporting only filtered results
export async function getAllCases(
  filters?: Omit<CasesQueryParams, 'page' | 'pageSize'>
): Promise<InheritanceCase[]> {
  const allCases: InheritanceCase[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const response = await getCases({ ...filters, page, pageSize });
    allCases.push(...response.data);

    if (page >= response.pagination.totalPages) {
      break;
    }
    page++;
  }

  return allCases;
}
