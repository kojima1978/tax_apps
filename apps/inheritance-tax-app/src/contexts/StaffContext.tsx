import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface StaffInfo {
  name: string;
  phone: string;
}

interface StaffContextValue {
  staffName: string;
  staffPhone: string;
  setStaffName: (name: string) => void;
  setStaffPhone: (phone: string) => void;
}

const STORAGE_KEY = 'inheritance-tax-staff-info';

function loadStaffInfo(): StaffInfo {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { name: '', phone: '' };
}

const StaffContext = createContext<StaffContextValue | null>(null);

export const StaffProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [info, setInfo] = useState<StaffInfo>(loadStaffInfo);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  }, [info]);

  const setStaffName = useCallback((name: string) => setInfo(prev => ({ ...prev, name })), []);
  const setStaffPhone = useCallback((phone: string) => setInfo(prev => ({ ...prev, phone })), []);

  return (
    <StaffContext.Provider value={{ staffName: info.name, staffPhone: info.phone, setStaffName, setStaffPhone }}>
      {children}
    </StaffContext.Provider>
  );
};

export function useStaffInfo(): StaffContextValue {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error('useStaffInfo must be used within StaffProvider');
  return ctx;
}
