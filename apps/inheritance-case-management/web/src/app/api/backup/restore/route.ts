import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error-handler';
import { backupDataSchema } from '@/types/backup';

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

/** Date文字列をDate型に変換（日付のみの場合はUTC noon） */
function toDateOnly(s: string): Date {
  return new Date(s + 'T00:00:00.000Z');
}

type Rec = Record<string, unknown>;

/** テーブルごとの行変換定義 */
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
    key: 'caseContacts' as const,
    model: (tx: TxClient) => tx.caseContact,
    map: (c: Rec) => ({
      id: c.id as number,
      caseId: c.caseId as number,
      sortOrder: (c.sortOrder as number) ?? 0,
      name: c.name as string,
      phone: (c.phone as string) ?? '',
      email: (c.email as string) ?? '',
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
];

interface TableDef {
  key: string;
  model: (tx: TxClient) => { createMany: (args: { data: Rec[] }) => Promise<unknown> };
  map: (row: Rec) => Rec;
  seqTable: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = backupDataSchema.parse(body);
    const { data } = parsed;

    await prisma.$transaction(
      async (tx: TxClient) => {
        // Delete in reverse FK order
        await tx.caseExpense.deleteMany();
        await tx.caseProgress.deleteMany();
        await tx.caseContact.deleteMany();
        await tx.inheritanceCase.deleteMany();
        await tx.referrer.deleteMany();
        await tx.companyBranch.deleteMany();
        await tx.assignee.deleteMany();
        await tx.company.deleteMany();
        await tx.department.deleteMany();

        // Insert in forward FK order + reset sequences
        for (const def of TABLE_DEFS as unknown as TableDef[]) {
          const rows = data[def.key as keyof typeof data] as Rec[];
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

    return NextResponse.json({
      success: true,
      counts: Object.fromEntries(
        TABLE_DEFS.map((def) => [def.key, (data[def.key as keyof typeof data] as Rec[]).length])
      ),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
