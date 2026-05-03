import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { prisma } from '@/lib/prisma';
import { toDateStr } from '@/lib/prisma-includes';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const personId = Number(id);
    if (!Number.isInteger(personId) || personId <= 0) {
      return NextResponse.json({ error: '無効なID' }, { status: 400 });
    }
    const links = await prisma.caseHeir.findMany({
      where: { personId },
      include: {
        case: {
          select: {
            id: true,
            deceasedName: true,
            deceasedNameKana: true,
            dateOfDeath: true,
            status: true,
            handlingStatus: true,
            acceptanceStatus: true,
            fiscalYear: true,
          },
        },
      },
      orderBy: { case: { dateOfDeath: 'desc' } },
    });
    const result = links.map(l => ({
      id: l.case.id,
      deceasedName: l.case.deceasedName,
      deceasedNameKana: l.case.deceasedNameKana,
      dateOfDeath: toDateStr(l.case.dateOfDeath) ?? '',
      status: l.case.status,
      handlingStatus: l.case.handlingStatus,
      acceptanceStatus: l.case.acceptanceStatus,
      fiscalYear: l.case.fiscalYear,
      relationship: l.relationship,
    }));
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
