import type { CaseProgressItem, CaseHeir, CaseRelatedParty, CaseExpenseItem, CaseSpecialAdditionItem, ProgressStep, HeirInput, RelatedPartyInput, Expense, SpecialAddition } from '@/types/shared';
import { relationshipSortFor } from '@/lib/constants/heir-relationships';

/** DB の CaseProgressItem[] → API 入力の ProgressStep[] */
export function toProgressSteps(items: CaseProgressItem[]): ProgressStep[] {
  return items.map((p) => ({
    id: p.stepId,
    name: p.name,
    date: p.date,
    memo: p.memo,
    isDynamic: p.isDynamic,
  }));
}

/** API 入力の ProgressStep[] → DB 形状の CaseProgressItem[] */
export function toProgressItems(steps: ProgressStep[]): CaseProgressItem[] {
  return steps.map((s, i) => ({
    id: 0,
    stepId: s.id,
    name: s.name,
    sortOrder: i,
    date: s.date,
    memo: s.memo,
    isDynamic: s.isDynamic,
  }));
}

/** DB の CaseHeir[] → API 入力の HeirInput[] */
export function toHeirInputs(items: CaseHeir[]): HeirInput[] {
  return items.map((h) => ({
    personId: h.personId,
    relationship: h.relationship || undefined,
    memo: h.memo || undefined,
  }));
}

/** API 入力の HeirInput[] → DB 形状の CaseHeir[] (sortOrder付与) */
export function toHeirItems(heirs: HeirInput[], existingHeirs?: CaseHeir[]): CaseHeir[] {
  return heirs.map((h, i) => {
    const existing = existingHeirs?.find(e => e.personId === h.personId);
    const relationship = h.relationship ?? '';
    return {
      id: existing?.id ?? 0,
      sortOrder: i,
      relationship,
      relationshipSortOrder: relationshipSortFor(relationship),
      personId: h.personId,
      person: existing?.person ?? {
        id: h.personId,
        name: '',
        nameKana: '',
        phone: '',
        postalCode: '',
        address: '',
        addressFromPostalCode: '',
        addressManual: '',
        memo: '',
        active: true,
      },
      memo: h.memo ?? '',
    };
  });
}

/** DB の CaseRelatedParty[] → API 入力の RelatedPartyInput[] */
export function toRelatedPartyInputs(items: CaseRelatedParty[]): RelatedPartyInput[] {
  return items.map((r) => ({
    personId: r.personId,
    role: r.role,
    memo: r.memo || undefined,
  }));
}

/** API 入力の RelatedPartyInput[] → DB 形状の CaseRelatedParty[] (sortOrder付与) */
export function toRelatedPartyItems(parties: RelatedPartyInput[], existingParties?: CaseRelatedParty[]): CaseRelatedParty[] {
  return parties.map((p, i) => {
    const existing = existingParties?.find(e => e.personId === p.personId && e.role === p.role);
    return {
      id: existing?.id ?? 0,
      sortOrder: i,
      role: p.role,
      personId: p.personId,
      person: existing?.person ?? {
        id: p.personId,
        name: '',
        nameKana: '',
        phone: '',
        postalCode: '',
        address: '',
        addressFromPostalCode: '',
        addressManual: '',
        memo: '',
        active: true,
      },
      memo: p.memo ?? '',
    };
  });
}

/** DB の CaseExpenseItem[] → API 入力の Expense[] */
export function toExpenses(items: CaseExpenseItem[]): Expense[] {
  return items.map((e) => ({
    date: e.date,
    description: e.description,
    amount: e.amount,
    memo: e.memo,
  }));
}

/** API 入力の Expense[] → DB 形状の CaseExpenseItem[] */
export function toExpenseItems(expenses: Expense[]): CaseExpenseItem[] {
  return expenses.map((e, i) => ({
    id: 0,
    sortOrder: i,
    date: e.date,
    description: e.description,
    amount: e.amount,
    memo: e.memo,
  }));
}

export function toSpecialAdditions(items: CaseSpecialAdditionItem[]): SpecialAddition[] {
  return items.map((a) => ({
    description: a.description,
    amount: a.amount,
  }));
}

export function toSpecialAdditionItems(additions: SpecialAddition[]): CaseSpecialAdditionItem[] {
  return additions.slice(0, 2).map((a, i) => ({
    id: 0,
    sortOrder: i,
    description: a.description,
    amount: a.amount,
  }));
}
