import { createContext } from 'react';

export interface StaffInfo {
  name: string;
  phone: string;
}

export interface StaffContextValue {
  staffName: string;
  staffPhone: string;
  setStaffName: (name: string) => void;
  setStaffPhone: (phone: string) => void;
}

const STORAGE_KEY = 'inheritance-tax-staff-info';

export function loadStaffInfo(): StaffInfo {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { name: '', phone: '' };
}

export function saveStaffInfo(info: StaffInfo): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
}

export const StaffContext = createContext<StaffContextValue | null>(null);
