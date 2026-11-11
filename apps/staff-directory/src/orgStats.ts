import { primaryActive, type WorkloadIndex } from './workload';
import { jstToday, retirementState } from './retirement';
import type { Staff } from './types';

// 部署・会社の画面の、人数と担当件数のまとめ。データは社員一覧と同じもの（台帳の全員＋各アプリの担当件数）を
// 画面で足すだけで、口（API）は増やさない。
//
// 人数は社員一覧の絞り込みと合わせて「どれか1つの所属が当たれば」数える（兼務先の部署にも入る。
// 押した先の一覧と人数が合うように）。担当件数は主所属でだけ数える（兼務で二重に足さないように）。

/**
 * 担当（進行中）の合計。null = 読めないアプリが1つでもある（「—」）。
 * 社員一覧の1人ずつの欄はアプリ別の内訳で欠けが分かるが、部署・会社の合計には内訳が無いので、
 * 欠けたまま数字を出すと少なく見えるだけになる
 */
export type WorkloadTotal = {
  /** 在籍の人（退職予定を含む）の分 */
  active: number;
  /** そのうち退職予定の人の分 */
  retiring: number;
  /** 退職した人にまだ残っている分（在籍の分には入れない） */
  retired: number;
} | null;

export type GroupStats = {
  /** 退職予定（退職日が今日以降でまだ在籍）の人数 */
  retiring: number;
  workload: WorkloadTotal;
};

const EMPTY_WORKLOAD = { active: 0, retiring: 0, retired: 0 };
const allReadable = (index: WorkloadIndex) => index.unreachable.length === 0;

/**
 * 部署・会社ごとのまとめ。keyOf は1つの所属からキー（部署 id・会社 id）を取り出す。
 * staff は退職者も含めた全員（api.listStaff('all')）
 */
function statsBy(
  staff: Staff[],
  index: WorkloadIndex,
  keysOf: (s: Staff) => (number | null)[],
  primaryKeyOf: (s: Staff) => number | null,
  today: string,
): Map<number, GroupStats> {
  const readable = allReadable(index);
  const out = new Map<number, GroupStats>();
  const get = (key: number) => {
    let g = out.get(key);
    if (!g) out.set(key, (g = { retiring: 0, workload: readable ? { ...EMPTY_WORKLOAD } : null }));
    return g;
  };

  for (const s of staff) {
    const state = retirementState(s.retiredOn, today);
    if (state === 'scheduled') {
      for (const key of new Set(keysOf(s))) if (key !== null) get(key).retiring += 1;
    }
    const primary = primaryKeyOf(s);
    const count = primaryActive(index, s.id);
    if (primary === null || !count) continue;
    const w = get(primary).workload;
    if (!w) continue;
    if (state === 'retired') w.retired += count;
    else {
      w.active += count;
      if (state === 'scheduled') w.retiring += count;
    }
  }
  return out;
}

export function departmentStats(staff: Staff[], index: WorkloadIndex, today: string = jstToday()): Map<number, GroupStats> {
  return statsBy(staff, index, (s) => s.affiliations.map((a) => a.departmentId), (s) => s.departmentId, today);
}

export function companyStats(staff: Staff[], index: WorkloadIndex, today: string = jstToday()): Map<number, GroupStats> {
  return statsBy(staff, index, (s) => s.affiliations.map((a) => a.companyId), (s) => s.companyId, today);
}

/** 部署・会社に1件も無いときのまとめ（担当は、全部のアプリが読めていれば 0件） */
export function emptyStats(index: WorkloadIndex): GroupStats {
  return { retiring: 0, workload: allReadable(index) ? { ...EMPTY_WORKLOAD } : null };
}
