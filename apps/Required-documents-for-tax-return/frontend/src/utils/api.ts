import { CategoryGroup } from '@/types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

export interface StaffNamesResponse {
  staffNames: string[];
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

  if (!response.ok) {
    throw new Error('保存に失敗しました');
  }

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

  return response.json();
}

export async function fetchRecords(): Promise<DataRecord[]> {
  const response = await fetch(`${API_BASE_URL}/api/records`);
  if (!response.ok) {
    throw new Error('データの取得に失敗しました');
  }
  const data: RecordsResponse = await response.json();
  return data.records || [];
}

export async function deleteDocument(id: number): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
    method: 'DELETE',
  });
  return response.ok;
}



export async function fetchStaffNames(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/staff-names`);
  if (!response.ok) return [];
  const data: StaffNamesResponse = await response.json();
  return data.staffNames || [];
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
import { Customer } from '@/types';

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
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add customer');
  }
  const data: { customer: Customer } = await response.json();
  return data.customer;
}

export async function updateCustomerName(id: number, customerName: string, staffId: number): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName, staffId }),
  });
  return response.ok;
}

export async function deleteCustomer(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete customer');
  }
}

// Staff Management APIs
import { Staff } from '@/types';
// ... rest of staff apis

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
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add staff');
  }
  const data: { staff: Staff } = await response.json();
  return data.staff;
}

export async function updateStaffName(id: number, staffName: string, mobileNumber?: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/api/staff/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffName, mobileNumber }),
  });
  return response.ok;
}

export async function deleteStaff(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/staff/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete staff');
  }
}
