import { prisma } from '@/lib/prisma';
import { toDateStr } from '@/lib/prisma-includes';

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

function toDateOnly(s: string): Date {
  const dateStr = s.includes('T') ? s.split('T')[0] : s;
  return new Date(dateStr + 'T00:00:00.000Z');
}

type Rec = Record<string, unknown>;

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
      taxAmount: (c.taxAmount as number) ?? 0,
      feeAmount: (c.feeAmount as number) ?? 0,
      fiscalYear: c.fiscalYear as number,
      estimateAmount: (c.estimateAmount as number) ?? 0,
      propertyValue: (c.propertyValue as number) ?? 0,
      referralFeeRate: (c.referralFeeRate as number) ?? null,
      referralFeeAmount: (c.referralFeeAmount as number) ?? null,
      estimateReferralFeeAmount: (c.estimateReferralFeeAmount as number) ?? null,
      landRosenkaCount: (c.landRosenkaCount as number) ?? 0,
      landBairitsuCount: (c.landBairitsuCount as number) ?? 0,
      unlistedStockCount: (c.unlistedStockCount as number) ?? 0,
      heirCount: (c.heirCount as number) ?? 0,
      discountAmount: (c.discountAmount as number) ?? 0,
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
    map: (p: Rec) => ({
      id: p.id as number,
      name: p.name as string,
      phone: (p.phone as string) ?? '',
      postalCode: (p.postalCode as string) ?? '',
      address: (p.address as string) ?? '',
      memo: (p.memo as string) ?? '',
      active: (p.active as boolean) ?? true,
      createdAt: new Date(p.createdAt as string),
      updatedAt: new Date(p.updatedAt as string),
    }),
    seqTable: 'Person',
  },
  {
    key: 'caseContacts' as const,
    model: (tx: TxClient) => tx.caseContact,
    map: (c: Rec) => ({
      id: c.id as number,
      caseId: c.caseId as number,
      personId: c.personId as number,
      sortOrder: (c.sortOrder as number) ?? 0,
      memo: (c.memo as string) ?? '',
    }),
    seqTable: 'CaseContact',
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
  const [departments, companies, companyBranches, assignees, referrers, persons, cases, caseContacts, caseProgress, caseExpenses, caseSpecialAdditions, auditLogs] = await Promise.all([
    prisma.department.findMany(),
    prisma.company.findMany(),
    prisma.companyBranch.findMany(),
    prisma.assignee.findMany(),
    prisma.referrer.findMany(),
    prisma.person.findMany(),
    prisma.inheritanceCase.findMany(),
    prisma.caseContact.findMany(),
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
      caseContacts,
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
      await tx.caseContact.deleteMany();
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
  );
}
