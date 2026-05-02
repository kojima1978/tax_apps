import { NextResponse } from 'next/server';
import { createCrudRouteHandlers } from '@/lib/create-crud-route-handlers';
import { normalizePersonAddressParts } from '@/lib/person-address';
import { formatPersonDeleteBlockedMessage } from '@/lib/person-delete-message';
import { normalizeNameKanaForStorage, normalizePersonSearchText } from '@/lib/person-search';
import { prisma } from '@/lib/prisma';
import { createPersonSchema, updatePersonSchema } from '@/types/validation';

function mapPersonData(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };

  if ('nameKana' in next) {
    const nameKana = normalizeNameKanaForStorage(String(next.nameKana ?? ''));
    next.nameKana = nameKana;
    next.nameKanaNormalized = normalizePersonSearchText(nameKana);
  }

  if ('address' in next || 'addressFromPostalCode' in next || 'addressManual' in next) {
    const addressParts = normalizePersonAddressParts({
      address: next.address as string | undefined,
      addressFromPostalCode: next.addressFromPostalCode as string | undefined,
      addressManual: next.addressManual as string | undefined,
    });
    next.address = addressParts.address;
    next.addressFromPostalCode = addressParts.addressFromPostalCode;
    next.addressManual = addressParts.addressManual;
  }

  return next;
}

export const { listAndCreate, byId } = createCrudRouteHandlers({
  model: 'person',
  orderBy: 'name',
  entityLabel: '人物',
  createSchema: createPersonSchema,
  updateSchema: updatePersonSchema,
  mapCreateData: mapPersonData,
  mapUpdateData: mapPersonData,
  include: { _count: { select: { heirLinks: true, relatedPartyLinks: true } } },
  beforeDelete: async (id) => {
    const [heirCount, relatedPartyCount] = await Promise.all([
      prisma.caseHeir.count({ where: { personId: id } }),
      prisma.caseRelatedParty.count({ where: { personId: id } }),
    ]);
    const caseLinkCount = heirCount + relatedPartyCount;
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
