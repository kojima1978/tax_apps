import type { Staff } from './types';

// 社員一覧の並び替え（列見出しのクリック）。URL の ?sort= に「kana」「-kana」の形で持つ。
// 空欄（番号・フリガナ・所属の無い人）は昇順でも降順でも末尾に置く ── 降順で先頭に空欄が
// 並ぶと、見たい行が画面の外へ押し出されるため。
// 押した列が同じ値（空欄どうしを含む）なら、社員番号 → 所属（部署の表示順）→ フリガナ → 台帳ID の順で
// 決める（押した列は飛ばす。二番目以降はいつも昇順）── 番号がほとんど空でも部署ごとにまとまって並ぶように。

export const SORT_KEYS = ['employeeNo', 'kana', 'affiliation', 'workload'] as const;
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

// 同じ列をもう一度押したら向きを変え、別の列なら昇順から（担当の件数だけは多い順から ── 見たいのは抱えている人）
export function toggleSort(current: SortSpec, key: SortKey): SortSpec {
  return current.key === key ? { key, desc: !current.desc } : { key, desc: key === 'workload' };
}

// 所属の並びに使う会社・部署の表示順（会社ページ・部署ページで決めた順）と、担当の件数
// （src/workload.ts の primaryActive。null = まだ読めていない・どのアプリも読めない → 空欄扱い）
export type OrderMaps = {
  company: Map<number, number>;
  department: Map<number, number>;
  workload?: (staffId: number) => number | null;
};

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
    case 'workload': {
      const n = order.workload?.(s.id) ?? null;
      return n === null ? null : [n];
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

// 二番目以降に使う順（押した列はここから外して先頭に置く）
const TIE_BREAK: SortKey[] = ['employeeNo', 'affiliation', 'kana'];

// 空欄は向きによらず末尾。値どうしは desc なら逆に
function compareKey(a: SortValue, b: SortValue, desc: boolean): number {
  if (a === null || b === null) return (a === null ? 1 : 0) - (b === null ? 1 : 0);
  const c = compareValues(a, b);
  return desc ? -c : c;
}

export function sortStaff(rows: Staff[], spec: SortSpec, order: OrderMaps): Staff[] {
  const keys = [spec.key, ...TIE_BREAK.filter((k) => k !== spec.key)];
  const keyed = rows.map((s) => ({ s, v: keys.map((k) => valueOf(s, k, order)) }));
  keyed.sort((a, b) => {
    for (let i = 0; i < keys.length; i++) {
      const c = compareKey(a.v[i], b.v[i], i === 0 && spec.desc);
      if (c !== 0) return c;
    }
    return a.s.id - b.s.id;
  });
  return keyed.map((k) => k.s);
}
