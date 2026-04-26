import { z } from 'zod';

export interface BackupData {
  version: number;
  exportedAt: string;
  data: {
    departments: unknown[];
    companies: unknown[];
    companyBranches: unknown[];
    assignees: unknown[];
    referrers: unknown[];
    persons: unknown[];
    cases: unknown[];
    caseContacts: unknown[];
    caseProgress: unknown[];
    caseExpenses: unknown[];
    auditLogs: unknown[];
  };
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
    persons: z.array(z.unknown()).optional().default([]),
    cases: z.array(z.unknown()),
    caseContacts: z.array(z.unknown()),
    caseProgress: z.array(z.unknown()),
    caseExpenses: z.array(z.unknown()).optional().default([]),
    auditLogs: z.array(z.unknown()).optional().default([]),
  }),
});
