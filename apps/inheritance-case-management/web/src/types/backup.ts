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
    cases: unknown[];
    caseContacts: unknown[];
    caseProgress: unknown[];
    caseExpenses: unknown[];
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
    cases: z.array(z.unknown()),
    caseContacts: z.array(z.unknown()),
    caseProgress: z.array(z.unknown()),
    caseExpenses: z.array(z.unknown()).optional().default([]),
  }),
});
