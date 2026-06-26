import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError } from '@/lib/api-error-handler';
import { prisma } from '@/lib/prisma';

const requestSchema = z.object({
  personIds: z.array(z.number().int().positive()).max(1000),
});

export async function POST(req: Request) {
  try {
    const { personIds } = requestSchema.parse(await req.json());
    const ids = Array.from(new Set(personIds));

    if (ids.length === 0) {
      return NextResponse.json({});
    }

    const links = await prisma.caseHeir.findMany({
      where: { personId: { in: ids } },
      select: {
        personId: true,
        case: {
          select: {
            deceasedName: true,
            dateOfDeath: true,
          },
        },
      },
      orderBy: [
        { personId: 'asc' },
        { case: { dateOfDeath: 'desc' } },
      ],
    });

    const result: Record<number, string[]> = Object.fromEntries(ids.map((id) => [id, []]));
    for (const link of links) {
      result[link.personId].push(link.case.deceasedName);
    }

    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
