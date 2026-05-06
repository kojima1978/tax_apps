import { useContext } from 'react';
import { StaffContext, type StaffContextValue } from './staffContextCore';

export function useStaffInfo(): StaffContextValue {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error('useStaffInfo must be used within StaffProvider');
  return ctx;
}
