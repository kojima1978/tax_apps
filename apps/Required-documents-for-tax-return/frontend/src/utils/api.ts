import { CategoryGroup, Customer, Staff } from '@/types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006';

async function throwIfNotOk(response: Response, defaultMsg: string): Promise<void> {
  if (response.ok) return;
  try {
    const body = await response.json();
    throw new Error(body.error || defaultMsg);
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(defaultMsg);
  }
}

// API Response Types
export interface DocumentsResponse {
  documentGroups: CategoryGroup[] | null;
  found: boolean;
}

export interface SaveResponse {
  success: boolean;
  message: string;
  nextYear?: number;
}

export interface RecordsResponse {
  records: DataRecord[];
}

export interface DataRecord {
  id: number;
  customer_name: string;
  staff_name: string;
  year: number;
  updated_at: string;
  customer_id: number;
  staff_id: number | null;
}

export interface CustomerNamesResponse {
  customerNames: string[];
}

export interface YearsResponse {
  years: number[];
}

// API Functions
export async function fetchDocuments(
  customerName: string,
  staffName: string,
  year: number
): Promise<DocumentsResponse> {
  const params = new URLSearchParams({
    customerName,
    staffName,
    year: String(year),
  });

  const response = await fetch(`${API_BASE_URL}/api/documents?${params}`);
  await throwIfNotOk(response, '書類データの取得に失敗しました');
  return response.json();
}

export async function saveDocuments(
  customerName: string,
  staffName: string,
  year: number,
  documentGroups: CategoryGroup[]
): Promise<SaveResponse> {
  const response = await fetch(`${API_BASE_URL}/api/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName, staffName, year, documentGroups }),
  });

  await throwIfNotOk(response, '保存に失敗しました');
  return response.json();
}

export async function copyToNextYear(
  customerName: string,
  staffName: string,
  year: number
): Promise<SaveResponse> {
  const response = await fetch(`${API_BASE_URL}/api/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName,
      staffName,
      year,
      action: 'copyToNextYear',
    }),
  });

  await throwIfNotOk(response, '翌年度更新に失敗しました');
  return response.json();
}

export async function fetchRecords(): Promise<DataRecord[]> {
  const response = await fetch(`${API_BASE_URL}/api/records`);
  await throwIfNotOk(response, 'データの取得に失敗しました');
  const data: RecordsResponse = await response.json();
  return data.records || [];
}

export async function deleteDocument(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
    method: 'DELETE',
  });
  await throwIfNotOk(response, '書類データの削除に失敗しました');
}

export async function fetchCustomerNames(staffName?: string): Promise<string[]> {
  const url = staffName
    ? `${API_BASE_URL}/api/customer-names?staffName=${encodeURIComponent(staffName)}`
    : `${API_BASE_URL}/api/customer-names`;

  const response = await fetch(url);
  if (!response.ok) return [];
  const data: CustomerNamesResponse = await response.json();
  return data.customerNames || [];
}

export async function fetchAvailableYears(customerName?: string, staffName?: string): Promise<number[]> {
  const url =
    customerName && staffName
      ? `${API_BASE_URL}/api/available-years?customerName=${encodeURIComponent(customerName)}&staffName=${encodeURIComponent(staffName)}`
      : `${API_BASE_URL}/api/available-years`;

  const response = await fetch(url);
  if (!response.ok) return [];
  const data: YearsResponse = await response.json();
  return data.years || [];
}

// Customer Management APIs

export async function fetchCustomers(): Promise<Customer[]> {
  const response = await fetch(`${API_BASE_URL}/api/customers`);
  if (!response.ok) return [];
  const data: { customers: Customer[] } = await response.json();
  return data.customers || [];
}

export async function addCustomer(customerName: string, staffId: number): Promise<Customer> {
  const response = await fetch(`${API_BASE_URL}/api/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName, staffId }),
  });
  await throwIfNotOk(response, 'お客様の登録に失敗しました');
  const data: { customer: Customer } = await response.json();
  return data.customer;
}

export async function updateCustomerName(id: number, customerName: string, staffId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName, staffId }),
  });
  await throwIfNotOk(response, 'お客様情報の更新に失敗しました');
}

export async function deleteCustomer(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
    method: 'DELETE',
  });
  await throwIfNotOk(response, 'お客様の削除に失敗しました');
}

// Staff Management APIs

export async function fetchStaff(): Promise<Staff[]> {
  const response = await fetch(`${API_BASE_URL}/api/staff`);
  if (!response.ok) return [];
  const data: { staff: Staff[] } = await response.json();
  return data.staff || [];
}

export async function addStaff(staffName: string, mobileNumber?: string): Promise<Staff> {
  const response = await fetch(`${API_BASE_URL}/api/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffName, mobileNumber }),
  });
  await throwIfNotOk(response, '担当者の登録に失敗しました');
  const data: { staff: Staff } = await response.json();
  return data.staff;
}

export async function updateStaffName(id: number, staffName: string, mobileNumber?: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/staff/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffName, mobileNumber }),
  });
  await throwIfNotOk(response, '担当者情報の更新に失敗しました');
}

export async function deleteStaff(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/staff/${id}`, {
    method: 'DELETE',
  });
  await throwIfNotOk(response, '担当者の削除に失敗しました');
}
