import { apiClient } from './client';
import type { StaffDirectorySyncResult } from '@/lib/staff-directory/sync';

export type { StaffDirectorySyncResult };

/** 社員台帳からの写しの状況（期限が来ていればサーバ側で写し直してから返る） */
export const getStaffDirectorySync = () => apiClient<StaffDirectorySyncResult | null>('/staff-directory');

/** 期限を待たずに台帳から写し直す */
export const resyncStaffDirectory = () =>
  apiClient<StaffDirectorySyncResult | null>('/staff-directory', { method: 'POST' });
