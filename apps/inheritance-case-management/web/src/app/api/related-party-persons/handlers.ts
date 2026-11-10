import { NextResponse } from 'next/server';
import { createCrudRouteHandlers } from '@/lib/create-crud-route-handlers';
import { migrateLegacyPersonAddress } from '@/lib/person-address';
import { formatPersonDeleteBlockedMessage } from '@/lib/person-delete-message';
import { normalizeNameKanaForStorage, normalizePersonSearchText } from '@/lib/person-search';
import { prisma } from '@/lib/prisma';
import { createRelatedPartyPersonSchema, updateRelatedPartyPersonSchema } from '@/types/validation';

function mapPersonData(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };

  if ('nameKana' in next) {
    const nameKana = normalizeNameKanaForStorage(String(next.nameKana ?? ''));
    next.nameKana = nameKana;
    next.nameKanaNormalized = normalizePersonSearchText(nameKana);
  }

  if ('address' in next || 'addressFromPostalCode' in next || 'addressManual' in next) {
    // 画面からは address が常に2欄の結合（＝整合した値）で届くので、ここの移行は何もしない。
    // 結合済みの address だけで来た古い呼び出し・取込のときだけ住所補足へ寄せる。
    const addressParts = migrateLegacyPersonAddress({
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
  model: 'relatedPartyPerson',
  orderBy: 'name',
  entityLabel: '関係者',
  createSchema: createRelatedPartyPersonSchema,
  updateSchema: updateRelatedPartyPersonSchema,
  mapCreateData: mapPersonData,
  mapUpdateData: mapPersonData,
  include: { _count: { select: { caseLinks: true } } },
  beforeDelete: async (id) => {
    const caseLinkCount = await prisma.caseRelatedParty.count({ where: { personId: id } });
    if (caseLinkCount === 0) return;

    const message = formatPersonDeleteBlockedMessage(caseLinkCount, '関係者');
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
