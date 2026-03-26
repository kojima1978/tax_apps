import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error-handler';
import { listQuerySchema } from '@/types/validation';
import { buildCaseWhereClause } from '../route';

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { status, acceptanceStatus, fiscalYear, search, assigneeId, department } =
      listQuerySchema.parse(searchParams);

    const where = buildCaseWhereClause({ status, acceptanceStatus, fiscalYear, search, assigneeId, department });

    const ids = await prisma.inheritanceCase.findMany({ where, select: { id: true } });
    const idList = ids.map(c => c.id);

    if (idList.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    await prisma.$transaction([
      prisma.caseProgress.deleteMany({ where: { caseId: { in: idList } } }),
      prisma.caseContact.deleteMany({ where: { caseId: { in: idList } } }),
      prisma.inheritanceCase.deleteMany({ where: { id: { in: idList } } }),
    ]);

    return NextResponse.json({ deleted: idList.length });
  } catch (e) {
    return handleApiError(e);
  }
}
