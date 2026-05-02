import { z } from 'zod';

export const BACKUP_TABLES = [
  { key: 'departments', label: '部署' },
  { key: 'companies', label: '会社' },
  { key: 'companyBranches', label: '支店' },
  { key: 'assignees', label: '担当者' },
  { key: 'referrers', label: '紹介者' },
  { key: 'heirPersons', label: '相続人マスタ' },
  { key: 'relatedPartyPersons', label: '関係者マスタ' },
  { key: 'cases', label: '案件' },
  { key: 'caseHeirs', label: '案件相続人' },
  { key: 'caseRelatedParties', label: '案件関係者' },
  { key: 'caseProgress', label: '進捗' },
  { key: 'caseExpenses', label: '立替経費' },
  { key: 'caseSpecialAdditions', label: '特別業務報酬額' },
  { key: 'auditLogs', label: '操作履歴' },
] as const;

export type BackupTableKey = (typeof BACKUP_TABLES)[number]['key'];
export type BackupTableCounts = Record<BackupTableKey, number>;

export interface BackupData {
  version: number;
  exportedAt: string;
  data: {
    departments: unknown[];
    companies: unknown[];
    companyBranches: unknown[];
    assignees: unknown[];
    referrers: unknown[];
    heirPersons: unknown[];
    relatedPartyPersons: unknown[];
    cases: unknown[];
    caseHeirs: unknown[];
    caseRelatedParties: unknown[];
    caseProgress: unknown[];
    caseExpenses: unknown[];
    caseSpecialAdditions: unknown[];
    auditLogs: unknown[];
  };
}

export function getBackupDataTotal(data: BackupData['data']): number {
  return BACKUP_TABLES.reduce((sum, { key }) => sum + data[key].length, 0);
}

export function getBackupCountsTotal(counts: Partial<BackupTableCounts>): number {
  return BACKUP_TABLES.reduce((sum, { key }) => sum + (counts[key] ?? 0), 0);
}

export const backupDataSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  data: z.object({
    departments: z.array(z.unknown()),
    companies: z.array(z.unknown()),
    companyBranches: z.array(z.unknown()).optional().default([]),
    assignees: z.array(z.unknown()),
    referrers: z.array(z.unknown()),
    heirPersons: z.array(z.unknown()).optional().default([]),
    relatedPartyPersons: z.array(z.unknown()).optional().default([]),
    cases: z.array(z.unknown()),
    caseHeirs: z.array(z.unknown()),
    caseRelatedParties: z.array(z.unknown()).optional().default([]),
    caseProgress: z.array(z.unknown()),
    caseExpenses: z.array(z.unknown()).optional().default([]),
    caseSpecialAdditions: z.array(z.unknown()).optional().default([]),
    auditLogs: z.array(z.unknown()).optional().default([]),
  }),
});
