// 原本は tax_apps/shared/staff-directory/。写しを直さず原本を直して `bash shared/sync.sh` で配る
//
// 操作者（いま画面を使っている社員）。選んだ台帳ID は全アプリ共通の localStorage キーに置くので、
// どこかのアプリで1回選べば、同じブラウザの他のアプリでも同じ人になる（オリジンが同じゲートウェイのため）。
import { useSyncExternalStore } from 'react';
import { onTabReturn, singleFlight } from './tabReturn';

export type Operator = {
  id: number | null;
  fullName: string;
  /** 台帳の読み（空のこともある）。担当者を探すときの手がかりと並び順にだけ使う */
  kana: string;
  companyName: string;
  departmentName: string;
  /** 主所属の部署が台帳の表示順（会社 → 部署）で何番目か。部署なし・古い台帳は null */
  departmentOrder: number | null;
  /** 退職日（最後に在籍する日・YYYY-MM-DD）。在籍の一覧に居るのは退職予定の人だけなので、ここに入るのは今日以降の日付 */
  retiredOn: string | null;
};

export const FALLBACK_OPERATOR: Operator = {
  id: null,
  fullName: 'ローカル利用者',
  kana: '',
  companyName: '',
  departmentName: '',
  departmentOrder: null,
  retiredOn: null,
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
      kana: text(value.nameKana).trim(),
      companyName: text(value.companyName),
      departmentName: text(value.departmentName),
      departmentOrder: typeof value.departmentOrder === 'number' && Number.isFinite(value.departmentOrder) ? value.departmentOrder : null,
      retiredOn: typeof value.retiredOn === 'string' && value.retiredOn !== '' ? value.retiredOn : null,
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

const SERVER_SNAPSHOT: Snapshot = { operators: [FALLBACK_OPERATOR], status: 'loading', selectedId: null };
let snapshot: Snapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();
let started = false;

function update(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

const load = singleFlight(async () => {
  let operators: Operator[] | null = null;
  try {
    const response = await fetch(DIRECTORY_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (response.ok) operators = parseDirectoryOperators(await response.json());
  } catch {
    // 台帳が停止していても画面の操作自体は止めない。
  }
  // 引き直しで届かなかったときは、前に読めた一覧のまま（選ぶ画面が空にならないように）
  if (operators) update({ operators, status: 'ok' });
  else if (snapshot.status !== 'ok') update({ status: 'fallback' });
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    update({ selectedId: readStoredId() });
    void load();
    // 台帳で人を足して戻ってきたら、選択肢に出す
    onTabReturn(() => void load());
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

/** 選択を外す（共用の PC で前の人の名前のまま記録しないため） */
function clearOperator() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 消せなくても現在の画面では未選択にする。
  }
  update({ selectedId: null });
}

export function useOperator() {
  // 3つ目はサーバーで描くとき（Next.js の PB・案件管理）。台帳はブラウザでしか読まないので読み込み中のまま
  const current = useSyncExternalStore(subscribe, () => snapshot, () => SERVER_SNAPSHOT);
  return {
    operator: pickOperator(current.operators, current.selectedId),
    selected: findSelectedOperator(current.operators, current.selectedId),
    operators: current.operators,
    status: current.status,
    selectOperator,
    clearOperator,
  };
}
