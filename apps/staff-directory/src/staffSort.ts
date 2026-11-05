import type { Staff } from './types';

// 社員一覧の並び替え（列見出しのクリック）。URL の ?sort= に「kana」「-kana」の形で持つ。
// 空欄（番号・フリガナ・所属の無い人）は昇順でも降順でも末尾に置く ── 降順で先頭に空欄が
// 並ぶと、見たい行が画面の外へ押し出されるため。
// 同じ値どうしは API の並び（フリガナ順）のまま（Array.prototype.sort は安定）。

export const SORT_KEYS = ['employeeNo', 'kana', 'affiliation'] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortSpec = { key: SortKey; desc: boolean };

export const DEFAULT_SORT: SortSpec = { key: 'employeeNo', desc: false };

export function parseSort(v: string | null): SortSpec {
  const desc = v?.startsWith('-') ?? false;
  const key = (desc ? v!.slice(1) : v) as SortKey;
  return SORT_KEYS.includes(key) ? { key, desc } : DEFAULT_SORT;
}

export function formatSort(s: SortSpec): string {
  return `${s.desc ? '-' : ''}${s.key}`;
}

// 同じ列をもう一度押したら向きを変え、別の列なら昇順から
export function toggleSort(current: SortSpec, key: SortKey): SortSpec {
  return current.key === key ? { key, desc: !current.desc } : { key, desc: false };
}

// 所属の並びに使う会社・部署の表示順（会社ページ・部署ページで決めた順）
export type OrderMaps = { company: Map<number, number>; department: Map<number, number> };

// 数字は桁数が違っても数の大きさで並べる（"9" < "10"）
const collator = new Intl.Collator('ja', { numeric: true });

// 比べる値。null は空欄（末尾へ）
type SortValue = (string | number)[] | null;

function valueOf(s: Staff, key: SortKey, order: OrderMaps): SortValue {
  switch (key) {
    case 'employeeNo':
      return s.employeeNo ? [s.employeeNo] : null;
    case 'kana':
      return s.nameKana ? [s.nameKana] : null;
    case 'affiliation': {
      // 主所属の会社 → 部署の順。部署の無い人はその会社の末尾
      if (s.companyId === null) return null;
      const dept = s.departmentId === null ? Infinity : (order.department.get(s.departmentId) ?? Infinity);
      return [order.company.get(s.companyId) ?? Infinity, dept];
    }
  }
}

function compareValues(a: (string | number)[], b: (string | number)[]): number {
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    const c = typeof x === 'number' && typeof y === 'number' ? (x === y ? 0 : x < y ? -1 : 1) : collator.compare(String(x), String(y));
    if (c !== 0) return c;
  }
  return 0;
}

export function sortStaff(rows: Staff[], spec: SortSpec, order: OrderMaps): Staff[] {
  const keyed = rows.map((s) => ({ s, v: valueOf(s, spec.key, order) }));
  keyed.sort((a, b) => {
    if (a.v === null || b.v === null) return (a.v === null ? 1 : 0) - (b.v === null ? 1 : 0);
    const c = compareValues(a.v, b.v);
    return spec.desc ? -c : c;
  });
  return keyed.map((k) => k.s);
}
