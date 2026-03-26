import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error-handler';
import { backupDataSchema } from '@/types/backup';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = backupDataSchema.parse(body);
    const { data } = parsed;

    // Run restore inside a transaction with extended timeout
    await prisma.$transaction(
      async (tx) => {
        // Delete in reverse FK order
        await tx.caseProgress.deleteMany();
        await tx.caseContact.deleteMany();
        await tx.inheritanceCase.deleteMany();
        await tx.referrer.deleteMany();
        await tx.assignee.deleteMany();
        await tx.company.deleteMany();
        await tx.department.deleteMany();

        // Insert in forward FK order
        if (data.departments.length > 0) {
          await tx.department.createMany({
            data: (data.departments as Record<string, unknown>[]).map((d) => ({
              id: d.id as number,
              name: d.name as string,
              sortOrder: (d.sortOrder as number) ?? 0,
              active: (d.active as boolean) ?? true,
              createdAt: new Date(d.createdAt as string),
              updatedAt: new Date(d.updatedAt as string),
            })),
          });
        }

        if (data.companies.length > 0) {
          await tx.company.createMany({
            data: (data.companies as Record<string, unknown>[]).map((c) => ({
              id: c.id as number,
              name: c.name as string,
              active: (c.active as boolean) ?? true,
              createdAt: new Date(c.createdAt as string),
              updatedAt: new Date(c.updatedAt as string),
            })),
          });
        }

        if (data.assignees.length > 0) {
          await tx.assignee.createMany({
            data: (data.assignees as Record<string, unknown>[]).map((a) => ({
              id: a.id as number,
              name: a.name as string,
              employeeId: (a.employeeId as string) ?? null,
              departmentId: (a.departmentId as number) ?? null,
              active: (a.active as boolean) ?? true,
              createdAt: new Date(a.createdAt as string),
              updatedAt: new Date(a.updatedAt as string),
            })),
          });
        }

        if (data.referrers.length > 0) {
          await tx.referrer.createMany({
            data: (data.referrers as Record<string, unknown>[]).map((r) => ({
              id: r.id as number,
              companyId: r.companyId as number,
              name: (r.name as string) ?? null,
              department: (r.department as string) ?? null,
              active: (r.active as boolean) ?? true,
              createdAt: new Date(r.createdAt as string),
              updatedAt: new Date(r.updatedAt as string),
            })),
          });
        }

        if (data.cases.length > 0) {
          await tx.inheritanceCase.createMany({
            data: (data.cases as Record<string, unknown>[]).map((c) => ({
              id: c.id as number,
              deceasedName: c.deceasedName as string,
              dateOfDeath: new Date((c.dateOfDeath as string) + 'T00:00:00.000Z'),
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
              referrerId: (c.referrerId as number) ?? null,
              createdBy: (c.createdBy as string) ?? null,
              updatedBy: (c.updatedBy as string) ?? null,
              createdAt: new Date(c.createdAt as string),
              updatedAt: new Date(c.updatedAt as string),
            })),
          });
        }

        if (data.caseContacts.length > 0) {
          await tx.caseContact.createMany({
            data: (data.caseContacts as Record<string, unknown>[]).map((c) => ({
              id: c.id as number,
              caseId: c.caseId as number,
              sortOrder: (c.sortOrder as number) ?? 0,
              name: c.name as string,
              phone: (c.phone as string) ?? '',
              email: (c.email as string) ?? '',
            })),
          });
        }

        if (data.caseProgress.length > 0) {
          await tx.caseProgress.createMany({
            data: (data.caseProgress as Record<string, unknown>[]).map((p) => ({
              id: p.id as number,
              caseId: p.caseId as number,
              stepId: p.stepId as string,
              name: p.name as string,
              sortOrder: (p.sortOrder as number) ?? 0,
              date: (p.date as string) ? new Date((p.date as string) + 'T00:00:00.000Z') : null,
              memo: (p.memo as string) ?? null,
              isDynamic: (p.isDynamic as boolean) ?? false,
            })),
          });
        }
      },
      { timeout: 60000 }
    );

    // Reset PostgreSQL sequences
    const tables = [
      { table: 'Department', column: 'id' },
      { table: 'Company', column: 'id' },
      { table: 'Assignee', column: 'id' },
      { table: 'Referrer', column: 'id' },
      { table: 'InheritanceCase', column: 'id' },
      { table: 'CaseContact', column: 'id' },
      { table: 'CaseProgress', column: 'id' },
    ];

    for (const { table, column } of tables) {
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"', '${column}'), COALESCE((SELECT MAX("${column}") FROM "${table}"), 0))`
      );
    }

    return NextResponse.json({
      success: true,
      counts: {
        departments: data.departments.length,
        companies: data.companies.length,
        assignees: data.assignees.length,
        referrers: data.referrers.length,
        cases: data.cases.length,
        caseContacts: data.caseContacts.length,
        caseProgress: data.caseProgress.length,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
