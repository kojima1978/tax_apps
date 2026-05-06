import { prisma } from '@/lib/prisma';
import { normalizePersonAddressParts } from '@/lib/person-address';
import { normalizeNameKanaForStorage, normalizePersonSearchText } from '@/lib/person-search';

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

type HeirInput = { personId: number; relationship?: string; memo?: string };
type RelatedPartyInput = { personId: number; memo?: string };

type ImportHeirInput = {
  name: string;
  nameKana?: string;
  phone?: string;
  postalCode?: string;
  address?: string;
  addressFromPostalCode?: string;
  addressManual?: string;
  dateOfBirth?: string;
  relationship?: string;
  memo?: string;
};

function isImportHeir(candidate: unknown): candidate is ImportHeirInput {
  return candidate != null
    && typeof candidate === 'object'
    && 'name' in candidate
    && !('personId' in candidate);
}

function toOptionalDate(dateOfBirth?: string): Date | null {
  return dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
    ? new Date(`${dateOfBirth}T00:00:00.000Z`)
    : null;
}

export async function resolveHeirs(tx: TxClient, heirs: unknown[]): Promise<HeirInput[]> {
  const result: HeirInput[] = [];
  for (const heir of heirs) {
    if (!isImportHeir(heir)) {
      result.push(heir as HeirInput);
      continue;
    }

    const nameKana = normalizeNameKanaForStorage(heir.nameKana ?? '');
    const addressParts = normalizePersonAddressParts(heir);
    let person = await tx.heirPerson.findFirst({
      where: {
        name: heir.name,
        ...(nameKana ? { nameKana } : {}),
        phone: heir.phone ?? '',
        postalCode: heir.postalCode ?? '',
        address: addressParts.address,
      },
    });

    const dateOfBirth = toOptionalDate(heir.dateOfBirth);
    if (!person) {
      person = await tx.heirPerson.create({
        data: {
          name: heir.name,
          nameKana,
          nameKanaNormalized: normalizePersonSearchText(nameKana),
          dateOfBirth,
          phone: heir.phone ?? '',
          postalCode: heir.postalCode ?? '',
          address: addressParts.address,
          addressFromPostalCode: addressParts.addressFromPostalCode,
          addressManual: addressParts.addressManual,
          memo: heir.memo ?? '',
        },
      });
    } else if (dateOfBirth && !person.dateOfBirth) {
      person = await tx.heirPerson.update({
        where: { id: person.id },
        data: { dateOfBirth },
      });
    }

    result.push({ personId: person.id, relationship: heir.relationship, memo: heir.memo });
  }
  return result;
}

export function resolveRelatedParties(parties: unknown[]): RelatedPartyInput[] {
  return parties.map((party) => party as RelatedPartyInput);
}
