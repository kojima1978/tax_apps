import type {
  Company,
  CompanyForm,
  Department,
  DepartmentForm,
  RestoreResult,
  Staff,
  StaffForm,
  StaffPersonal,
  StaffPersonalForm,
  StaffStatus,
} from './types';

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

// 所属の select は文字列で持つので、送る前に id へ戻す
const toStaffBody = (form: StaffForm) => ({
  ...form,
  affiliations: form.affiliations.map((a) => ({
    companyId: a.companyId === '' ? null : Number(a.companyId),
    departmentId: a.departmentId === '' ? null : Number(a.departmentId),
    employeeNo: a.employeeNo,
    isPrimary: a.isPrimary,
  })),
});

export const api = {
  listStaff: (status: StaffStatus) => request<Staff[]>(`/staff?status=${status}`),
  createStaff: (form: StaffForm) => send<Staff>('POST', '/staff', toStaffBody(form)),
  updateStaff: (id: number, form: StaffForm) => send<Staff>('PUT', `/staff/${id}`, toStaffBody(form)),
  getStaffPersonal: (id: number) => request<StaffPersonal>(`/staff/${id}/personal`),
  updateStaffPersonal: (id: number, p: StaffPersonalForm) => send<StaffPersonal>('PUT', `/staff/${id}/personal`, p),
  listDepartments: () => request<Department[]>('/departments'),
  createDepartment: (d: DepartmentForm) => send('POST', '/departments', d),
  updateDepartment: (id: number, d: DepartmentForm) => send('PUT', `/departments/${id}`, d),
  deleteDepartment: (id: number) => send('DELETE', `/departments/${id}`),
  listCompanies: () => request<Company[]>('/companies'),
  createCompany: (c: CompanyForm) => send('POST', '/companies', c),
  updateCompany: (id: number, c: CompanyForm) => send('PUT', `/companies/${id}`, c),
  deleteCompany: (id: number) => send('DELETE', `/companies/${id}`),
  // 台帳まるごとの JSON 控え。中身はそのままファイルへ書くだけなので型は持たない
  exportBackup: () => request<unknown>('/backup'),
  previewRestore: (backup: unknown) => send<RestoreResult>('POST', '/backup/preview', backup),
  restore: (backup: unknown) => send<RestoreResult>('POST', '/backup/restore', backup),
};
