import { apiClient } from './client';
import type { BackupData } from '@/types/backup';

export async function exportBackup(): Promise<void> {
  const data = await apiClient<BackupData>('/backup');
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `itcm-backup-${date}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function restoreBackup(data: BackupData): Promise<{ success: boolean; counts: Record<string, number> }> {
  return apiClient('/backup/restore', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
