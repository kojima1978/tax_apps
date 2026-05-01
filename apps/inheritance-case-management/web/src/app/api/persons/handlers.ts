import { NextResponse } from 'next/server';
import { createCrudRouteHandlers } from '@/lib/create-crud-route-handlers';
import { formatPersonDeleteBlockedMessage } from '@/lib/person-delete-message';
import { prisma } from '@/lib/prisma';
import { createPersonSchema, updatePersonSchema } from '@/types/validation';

export const { listAndCreate, byId } = createCrudRouteHandlers({
  model: 'person',
  orderBy: 'name',
  entityLabel: '人物',
  createSchema: createPersonSchema,
  updateSchema: updatePersonSchema,
  include: { _count: { select: { caseLinks: true } } },
  beforeDelete: async (id) => {
    const caseLinkCount = await prisma.caseContact.count({ where: { personId: id } });
    if (caseLinkCount === 0) return;

    const message = formatPersonDeleteBlockedMessage(caseLinkCount);
    return NextResponse.json(
      {
        error: message,
        message,
        code: 'PERSON_IN_USE',
        details: { caseLinkCount },
      },
      { status: 409 }
    );
  },
});
