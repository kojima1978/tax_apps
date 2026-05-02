import { prisma } from '@/lib/prisma';
import { normalizePersonAddressParts } from '@/lib/person-address';
import { toDateStr } from '@/lib/prisma-includes';
import { normalizeNameKanaForStorage, normalizePersonSearchText } from '@/lib/person-search';
import type { BackupTableCounts } from '@/types/backup';

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

function toDateOnly(s: string): Date {
  const dateStr = s.includes('T') ? s.split('T')[0] : s;
  return new Date(dateStr + 'T00:00:00.000Z');
}

type Rec = Record<string, unknown>;

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toNumOr(v: unknown, fallback: number): number {
  const n = toNum(v);
  return n === null ? fallback : n;
}

const TABLE_DEFS = [
  {
    key: 'departments' as const,
    model: (tx: TxClient) => tx.department,
    map: (d: Rec) => ({
      id: d.id as number,
      name: d.name as string,
      sortOrder: (d.sortOrder as number) ?? 0,
      active: (d.active as boolean) ?? true,
      createdAt: new Date(d.createdAt as string),
      updatedAt: new Date(d.updatedAt as string),
    }),
    seqTable: 'Department',
  },
  {
    key: 'companies' as const,
    model: (tx: TxClient) => tx.company,
    map: (c: Rec) => ({
      id: c.id as number,
      name: c.name as string,
      active: (c.active as boolean) ?? true,
      createdAt: new Date(c.createdAt as string),
      updatedAt: new Date(c.updatedAt as string),
    }),
    seqTable: 'Company',
  },
  {
    key: 'assignees' as const,
    model: (tx: TxClient) => tx.assignee,
    map: (a: Rec) => ({
      id: a.id as number,
      name: a.name as string,
      employeeId: (a.employeeId as string) ?? null,
      departmentId: (a.departmentId as number) ?? null,
      active: (a.active as boolean) ?? true,
      createdAt: new Date(a.createdAt as string),
      updatedAt: new Date(a.updatedAt as string),
    }),
    seqTable: 'Assignee',
  },
  {
    key: 'companyBranches' as const,
    model: (tx: TxClient) => tx.companyBranch,
    map: (b: Rec) => ({
      id: b.id as number,
      companyId: b.companyId as number,
      name: b.name as string,
      active: (b.active as boolean) ?? true,
      createdAt: new Date(b.createdAt as string),
      updatedAt: new Date(b.updatedAt as string),
    }),
    seqTable: 'CompanyBranch',
  },
  {
    key: 'referrers' as const,
    model: (tx: TxClient) => tx.referrer,
    map: (r: Rec) => ({
      id: r.id as number,
      companyId: r.companyId as number,
      branchId: (r.branchId as number) ?? null,
      active: (r.active as boolean) ?? true,
      createdAt: new Date(r.createdAt as string),
      updatedAt: new Date(r.updatedAt as string),
    }),
    seqTable: 'Referrer',
  },
  {
    key: 'cases' as const,
    model: (tx: TxClient) => tx.inheritanceCase,
    map: (c: Rec) => ({
      id: c.id as number,
      deceasedName: c.deceasedName as string,
      dateOfDeath: toDateOnly(c.dateOfDeath as string),
      status: (c.status as string) ?? '未着手',
      handlingStatus: (c.handlingStatus as string) ?? '対応中',
      acceptanceStatus: (c.acceptanceStatus as string) ?? '未判定',
      taxAmount: toNumOr(c.taxAmount, 0),
      feeAmount: toNumOr(c.feeAmount, 0),
      fiscalYear: toNumOr(c.fiscalYear, new Date().getFullYear()),
      estimateAmount: toNumOr(c.estimateAmount, 0),
      propertyValue: toNumOr(c.propertyValue, 0),
      referralFeeRate: toNum(c.referralFeeRate),
      referralFeeAmount: toNum(c.referralFeeAmount),
      estimateReferralFeeAmount: toNum(c.estimateReferralFeeAmount),
      landRosenkaCount: toNumOr(c.landRosenkaCount, 0),
      landBairitsuCount: toNumOr(c.landBairitsuCount, 0),
      unlistedStockCount: toNumOr(c.unlistedStockCount, 0),
      heirCount: toNumOr(c.heirCount, 0),
      discountAmount: toNumOr(c.discountAmount, 0),
      feeCalcSnapshot: (c.feeCalcSnapshot as Record<string, unknown>) ?? null,
      caseAddedDate: c.caseAddedDate ? toDateOnly(c.caseAddedDate as string) : null,
      caseCompletedDate: c.caseCompletedDate ? toDateOnly(c.caseCompletedDate as string) : null,
      summary: (c.summary as string) ?? null,
      memo: (c.memo as string) ?? null,
      assigneeId: (c.assigneeId as number) ?? null,
      internalReferrerId: (c.internalReferrerId as number) ?? null,
      referrerId: (c.referrerId as number) ?? null,
      createdBy: (c.createdBy as string) ?? null,
      updatedBy: (c.updatedBy as string) ?? null,
      createdAt: new Date(c.createdAt as string),
      updatedAt: new Date(c.updatedAt as string),
    }),
    seqTable: 'InheritanceCase',
  },
  {
    key: 'persons' as const,
    model: (tx: TxClient) => tx.person,
    map: (p: Rec) => {
      const nameKana = normalizeNameKanaForStorage((p.nameKana as string) ?? '');
      const nameKanaNormalized = typeof p.nameKanaNormalized === 'string' && p.nameKanaNormalized
        ? p.nameKanaNormalized
        : normalizePersonSearchText(nameKana);
      const addressParts = normalizePersonAddressParts({
        address: (p.address as string) ?? '',
        addressFromPostalCode: (p.addressFromPostalCode as string) ?? '',
        addressManual: (p.addressManual as string) ?? '',
      });
      return {
        id: p.id as number,
        name: p.name as string,
        nameKana,
        nameKanaNormalized,
        phone: (p.phone as string) ?? '',
        postalCode: (p.postalCode as string) ?? '',
        address: addressParts.address,
        addressFromPostalCode: addressParts.addressFromPostalCode,
        addressManual: addressParts.addressManual,
        memo: (p.memo as string) ?? '',
        active: (p.active as boolean) ?? true,
        createdAt: new Date(p.createdAt as string),
        updatedAt: new Date(p.updatedAt as string),
      };
    },
    seqTable: 'Person',
  },
  {
    key: 'caseHeirs' as const,
    model: (tx: TxClient) => tx.caseHeir,
    map: (c: Rec) => ({
      id: c.id as number,
      caseId: c.caseId as number,
      personId: c.personId as number,
      relationship: (c.relationship as string) ?? '',
      relationshipSortOrder: (c.relationshipSortOrder as number) ?? 999,
      sortOrder: (c.sortOrder as number) ?? 0,
      memo: (c.memo as string) ?? '',
    }),
    seqTable: 'CaseHeir',
  },
  {
    key: 'caseRelatedParties' as const,
    model: (tx: TxClient) => tx.caseRelatedParty,
    map: (c: Rec) => ({
      id: c.id as number,
      caseId: c.caseId as number,
      personId: c.personId as number,
      role: (c.role as string) ?? '',
      sortOrder: (c.sortOrder as number) ?? 0,
      memo: (c.memo as string) ?? '',
    }),
    seqTable: 'CaseRelatedParty',
  },
  {
    key: 'caseProgress' as const,
    model: (tx: TxClient) => tx.caseProgress,
    map: (p: Rec) => ({
      id: p.id as number,
      caseId: p.caseId as number,
      stepId: p.stepId as string,
      name: p.name as string,
      sortOrder: (p.sortOrder as number) ?? 0,
      date: (p.date as string) ? toDateOnly(p.date as string) : null,
      memo: (p.memo as string) ?? null,
      isDynamic: (p.isDynamic as boolean) ?? false,
    }),
    seqTable: 'CaseProgress',
  },
  {
    key: 'caseExpenses' as const,
    model: (tx: TxClient) => tx.caseExpense,
    map: (e: Rec) => ({
      id: e.id as number,
      caseId: e.caseId as number,
      sortOrder: (e.sortOrder as number) ?? 0,
      date: toDateOnly(e.date as string),
      description: e.description as string,
      amount: (e.amount as number) ?? 0,
      memo: (e.memo as string) ?? null,
    }),
    seqTable: 'CaseExpense',
  },
  {
    key: 'caseSpecialAdditions' as const,
    model: (tx: TxClient) => tx.caseSpecialAddition,
    map: (a: Rec) => ({
      id: a.id as number,
      caseId: a.caseId as number,
      sortOrder: (a.sortOrder as number) ?? 0,
      description: a.description as string,
      amount: (a.amount as number) ?? 0,
    }),
    seqTable: 'CaseSpecialAddition',
  },
  {
    key: 'auditLogs' as const,
    model: (tx: TxClient) => tx.auditLog,
    map: (a: Rec) => ({
      id: a.id as number,
      entity: a.entity as string,
      entityId: a.entityId as number,
      action: a.action as string,
      changes: (a.changes as Record<string, unknown>) ?? null,
      changedBy: (a.changedBy as string) ?? null,
      changedAt: new Date(a.changedAt as string),
    }),
    seqTable: 'AuditLog',
  },
];

interface TableDef {
  key: string;
  model: (tx: TxClient) => { createMany: (args: { data: Rec[] }) => Promise<unknown> };
  map: (row: Rec) => Rec;
  seqTable: string;
}

export async function exportBackup() {
  const [departments, companies, companyBranches, assignees, referrers, persons, cases, caseHeirs, caseRelatedParties, caseProgress, caseExpenses, caseSpecialAdditions, auditLogs] = await Promise.all([
    prisma.department.findMany(),
    prisma.company.findMany(),
    prisma.companyBranch.findMany(),
    prisma.assignee.findMany(),
    prisma.referrer.findMany(),
    prisma.person.findMany(),
    prisma.inheritanceCase.findMany(),
    prisma.caseHeir.findMany(),
    prisma.caseRelatedParty.findMany(),
    prisma.caseProgress.findMany(),
    prisma.caseExpense.findMany(),
    prisma.caseSpecialAddition.findMany(),
    prisma.auditLog.findMany(),
  ]);

  const serializeTimestamps = <T extends { createdAt: Date; updatedAt: Date }>(item: T) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  });

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      departments: departments.map(serializeTimestamps),
      companies: companies.map(serializeTimestamps),
      companyBranches: companyBranches.map(serializeTimestamps),
      assignees: assignees.map(serializeTimestamps),
      referrers: referrers.map(serializeTimestamps),
      persons: persons.map(serializeTimestamps),
      cases: cases.map(c => ({
        ...serializeTimestamps(c),
        dateOfDeath: toDateStr(c.dateOfDeath) ?? '',
        caseAddedDate: toDateStr(c.caseAddedDate),
        caseCompletedDate: toDateStr(c.caseCompletedDate),
      })),
      caseHeirs,
      caseRelatedParties,
      caseProgress: caseProgress.map(p => ({
        ...p,
        date: toDateStr(p.date),
      })),
      caseExpenses: caseExpenses.map(e => ({
        ...e,
        date: toDateStr(e.date),
      })),
      caseSpecialAdditions,
      auditLogs: auditLogs.map(a => ({
        ...a,
        changedAt: a.changedAt.toISOString(),
      })),
    },
  };
}

export async function restoreBackup(data: Record<string, Rec[]>) {
  await prisma.$transaction(
    async (tx: TxClient) => {
      await tx.auditLog.deleteMany();
      await tx.caseSpecialAddition.deleteMany();
      await tx.caseExpense.deleteMany();
      await tx.caseProgress.deleteMany();
      await tx.caseRelatedParty.deleteMany();
      await tx.caseHeir.deleteMany();
      await tx.inheritanceCase.deleteMany();
      await tx.person.deleteMany();
      await tx.referrer.deleteMany();
      await tx.companyBranch.deleteMany();
      await tx.assignee.deleteMany();
      await tx.company.deleteMany();
      await tx.department.deleteMany();

      for (const def of TABLE_DEFS as unknown as TableDef[]) {
        const rows = (data[def.key as keyof typeof data] ?? []) as Rec[];
        if (rows.length > 0) {
          await def.model(tx).createMany({ data: rows.map(def.map) });
        }
        await tx.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"${def.seqTable}"', 'id'), COALESCE((SELECT MAX("id") FROM "${def.seqTable}"), 0) + 1, false)`
        );
      }
    },
    { timeout: 60000 }
  );

  return Object.fromEntries(
    TABLE_DEFS.map((def) => [def.key, ((data[def.key as keyof typeof data] ?? []) as Rec[]).length])
  ) as BackupTableCounts;
}
