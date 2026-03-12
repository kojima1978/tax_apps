import type { CaseProgressItem, CaseContact, ProgressStep, Contact } from '@/types/shared';

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

/** DB の CaseContact[] → API 入力の Contact[] */
export function toContacts(items: CaseContact[]): Contact[] {
  return items.map((c) => ({
    name: c.name,
    phone: c.phone,
    email: c.email,
  }));
}

/** API 入力の Contact[] → DB 形状の CaseContact[] */
export function toContactItems(contacts: Contact[]): CaseContact[] {
  return contacts.map((c, i) => ({
    id: 0,
    sortOrder: i,
    name: c.name,
    phone: c.phone,
    email: c.email,
  }));
}
