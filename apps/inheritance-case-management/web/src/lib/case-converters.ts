import type { CaseProgressItem, CaseContact, CaseExpenseItem, ProgressStep, ContactInput, Expense } from '@/types/shared';

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

/** DB の CaseContact[] → API 入力の ContactInput[] */
export function toContactInputs(items: CaseContact[]): ContactInput[] {
  return items.map((c) => ({
    personId: c.personId,
    memo: c.memo || undefined,
  }));
}

/** API 入力の ContactInput[] → DB 形状の CaseContact[] (sortOrder付与) */
export function toContactItems(contacts: ContactInput[], existingContacts?: CaseContact[]): CaseContact[] {
  return contacts.map((c, i) => {
    const existing = existingContacts?.find(ec => ec.personId === c.personId);
    return {
      id: existing?.id ?? 0,
      sortOrder: i,
      personId: c.personId,
      person: existing?.person ?? { id: c.personId, name: '', phone: '', postalCode: '', address: '', memo: '', active: true },
      memo: c.memo ?? '',
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
