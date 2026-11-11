import { apiClient } from './client';
import type { StaffDirectorySyncResult } from '@/lib/staff-directory/sync';

export type { StaffDirectorySyncResult };

/** 社員台帳からの写しの状況（記録を読むだけ。写しは走らせない） */
export const getStaffDirectorySync = () => apiClient<StaffDirectorySyncResult | null>('/staff-directory');

/** 期限を待たずに台帳から写し直す */
export const resyncStaffDirectory = () =>
  apiClient<StaffDirectorySyncResult | null>('/staff-directory', { method: 'POST' });
