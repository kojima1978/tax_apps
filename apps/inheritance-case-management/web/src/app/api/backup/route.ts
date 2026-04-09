import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error-handler';
import { toDateStr } from '@/lib/prisma-includes';

export async function GET() {
  try {
    const [departments, companies, companyBranches, assignees, referrers, cases, caseContacts, caseProgress, caseExpenses] = await Promise.all([
      prisma.department.findMany(),
      prisma.company.findMany(),
      prisma.companyBranch.findMany(),
      prisma.assignee.findMany(),
      prisma.referrer.findMany(),
      prisma.inheritanceCase.findMany(),
      prisma.caseContact.findMany(),
      prisma.caseProgress.findMany(),
      prisma.caseExpense.findMany(),
    ]);

    const serializeTimestamps = <T extends { createdAt: Date; updatedAt: Date }>(item: T) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    });

    return NextResponse.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        departments: departments.map(serializeTimestamps),
        companies: companies.map(serializeTimestamps),
        companyBranches: companyBranches.map(serializeTimestamps),
        assignees: assignees.map(serializeTimestamps),
        referrers: referrers.map(serializeTimestamps),
        cases: cases.map(c => ({
          ...serializeTimestamps(c),
          dateOfDeath: toDateStr(c.dateOfDeath) ?? '',
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
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
