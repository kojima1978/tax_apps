// 原本は tax_apps/shared/staff-directory/。写しを直さず原本を直して `bash shared/sync.sh` で配る
//
// 操作者（いま画面を使っている社員）。選んだ台帳ID は全アプリ共通の localStorage キーに置くので、
// どこかのアプリで1回選べば、同じブラウザの他のアプリでも同じ人になる（オリジンが同じゲートウェイのため）。
import { useSyncExternalStore } from 'react';

export type Operator = {
  id: number | null;
  fullName: string;
  companyName: string;
  departmentName: string;
};

export const FALLBACK_OPERATOR: Operator = {
  id: null,
  fullName: 'ローカル利用者',
  companyName: '',
  departmentName: '',
};

const DIRECTORY_URL = '/staff-directory/api/staff?status=active';
const TIMEOUT_MS = 3000;
const STORAGE_KEY = 'tax-apps:operator-id';

export type OperatorStatus = 'loading' | 'ok' | 'fallback';
type Snapshot = { operators: Operator[]; status: OperatorStatus; selectedId: number | null };

export function parseDirectoryOperators(body: unknown): Operator[] | null {
  if (!Array.isArray(body)) return null;
  const operators = body.flatMap((row): Operator[] => {
    if (typeof row !== 'object' || row === null) return [];
    const value = row as Record<string, unknown>;
    if (typeof value.id !== 'number' || typeof value.fullName !== 'string' || !value.fullName.trim()) return [];
    const text = (field: unknown) => typeof field === 'string' ? field : '';
    return [{
      id: value.id,
      fullName: value.fullName.trim(),
      companyName: text(value.companyName),
      departmentName: text(value.departmentName),
    }];
  });
  return operators.length > 0 ? operators : null;
}

export function pickOperator(operators: Operator[], selectedId: number | null): Operator {
  return operators.find((operator) => operator.id === selectedId) ?? operators[0] ?? FALLBACK_OPERATOR;
}

export function operatorRequestHeaders(operator: Operator | string): Record<string, string> {
  const name = typeof operator === 'string' ? operator : operator.fullName;
  return { 'x-operator-name': encodeURIComponent(name) };
}

/** 自分で選んだ人だけ（未選択や台帳から消えた人で先頭の人に化けさせない）。無ければ null */
export function findSelectedOperator(operators: Operator[], selectedId: number | null): Operator | null {
  return selectedId === null ? null : operators.find((operator) => operator.id === selectedId) ?? null;
}

/** 自分で選んだ人のときだけ送る（未選択を先頭の人や「ローカル利用者」として記録しない） */
export function selectedOperatorHeaders(): Record<string, string> {
  const operator = findSelectedOperator(snapshot.operators, snapshot.selectedId ?? readStoredId());
  return operator ? operatorRequestHeaders(operator) : {};
}

function readStoredId(): number | null {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

let snapshot: Snapshot = { operators: [FALLBACK_OPERATOR], status: 'loading', selectedId: null };
const listeners = new Set<() => void>();
let started = false;

function update(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

async function load() {
  let operators: Operator[] | null = null;
  try {
    const response = await fetch(DIRECTORY_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (response.ok) operators = parseDirectoryOperators(await response.json());
  } catch {
    // 台帳が停止していても画面の操作自体は止めない。
  }
  update(operators ? { operators, status: 'ok' } : { status: 'fallback' });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    update({ selectedId: readStoredId() });
    void load();
  }
  return () => listeners.delete(listener);
}

function selectOperator(id: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    // 保存できなくても現在の画面では選択を維持する。
  }
  update({ selectedId: id });
}

export function useOperator() {
  const current = useSyncExternalStore(subscribe, () => snapshot);
  return {
    operator: pickOperator(current.operators, current.selectedId),
    selected: findSelectedOperator(current.operators, current.selectedId),
    operators: current.operators,
    status: current.status,
    selectOperator,
  };
}
