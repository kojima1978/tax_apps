import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { loadStaffInfo, saveStaffInfo, StaffContext, type StaffInfo } from './staffContextCore';

export const StaffProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [info, setInfo] = useState<StaffInfo>(loadStaffInfo);

  useEffect(() => {
    saveStaffInfo(info);
  }, [info]);

  const setStaffName = useCallback((name: string) => setInfo(prev => ({ ...prev, name })), []);
  const setStaffPhone = useCallback((phone: string) => setInfo(prev => ({ ...prev, phone })), []);

  return (
    <StaffContext.Provider value={{ staffName: info.name, staffPhone: info.phone, setStaffName, setStaffPhone }}>
      {children}
    </StaffContext.Provider>
  );
};
