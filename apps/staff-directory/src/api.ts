import type { Department, Office, Staff, StaffForm, StaffStatus } from './types';

const BASE = '/staff-directory/api';

// サーバは失敗時に { error: '日本語の説明' } を返す。それをそのまま投げる
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((body as { error?: string } | null)?.error ?? `通信に失敗しました（${res.status}）`);
  }
  return body as T;
}

const send = <T>(method: string, path: string, data?: unknown) =>
  request<T>(path, { method, body: data === undefined ? undefined : JSON.stringify(data) });

export const api = {
  listStaff: (status: StaffStatus) => request<Staff[]>(`/staff?status=${status}`),
  createStaff: (form: StaffForm) => send<Staff>('POST', '/staff', form),
  updateStaff: (id: number, form: StaffForm) => send<Staff>('PUT', `/staff/${id}`, form),
  listDepartments: () => request<Department[]>('/departments'),
  createDepartment: (d: Pick<Department, 'name' | 'sortOrder' | 'active'>) => send('POST', '/departments', d),
  updateDepartment: (id: number, d: Pick<Department, 'name' | 'sortOrder' | 'active'>) =>
    send('PUT', `/departments/${id}`, d),
  deleteDepartment: (id: number) => send('DELETE', `/departments/${id}`),
  getOffice: () => request<Office>('/office'),
  updateOffice: (o: Omit<Office, 'updatedAt'>) => send<Office>('PUT', '/office', o),
};
