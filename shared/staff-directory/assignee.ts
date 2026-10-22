// 原本は tax_apps/shared/staff-directory/。写しを直さず原本を直して `bash shared/sync.sh` で配る
//
// 案件の担当者（社員台帳の ID と、選んだ時点の氏名の写し）を選ぶ・絞り込むための決まりごと。
// 画面（AssigneePicker.tsx）とは分けて置き、ここだけをテストする。
import type { Operator } from './operator';

export type Assignee = { staffId: number; name: string };

// ---- 探す・並べる ----

/** 探すときの表記ゆれを寄せる（全角半角・大小・空白・カタカナ/ひらがな） */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

/** 名前・読み・部署・会社のどれかに含まれていれば当たり。空の検索語は全員 */
export function personMatches(person: Operator, query: string): boolean {
  const q = normalizeForSearch(query);
  if (q === '') return true;
  return [person.fullName, person.kana, person.departmentName, person.companyName].some((field) =>
    normalizeForSearch(field).includes(q),
  );
}

/**
 * 読みのある人を読み順に先へ、読みの無い人は台帳の並びのまま後ろへ。
 * 漢字の氏名どうしを localeCompare しても音の順にはならないので、読みの無い人は並べ替えない。
 */
export function sortPeople(people: readonly Operator[]): Operator[] {
  const withKana = people.filter((p) => p.kana !== '');
  const withoutKana = people.filter((p) => p.kana === '');
  withKana.sort((a, b) => normalizeForSearch(a.kana).localeCompare(normalizeForSearch(b.kana), 'ja'));
  return [...withKana, ...withoutKana];
}

export const NO_DEPARTMENT = '部署なし';

export type PersonSection = { label: string; people: Operator[] };

/** 部署ごとの塊。会社が2つ以上あるときだけ見出しに会社名も付ける。部署なしは最後 */
export function sectionsByDepartment(people: readonly Operator[]): PersonSection[] {
  const multiCompany = new Set(people.map((p) => p.companyName)).size > 1;
  const groups = new Map<string, Operator[]>();
  for (const person of people) {
    const department = person.departmentName || NO_DEPARTMENT;
    const label = multiCompany && person.companyName ? `${person.companyName} ${department}` : department;
    groups.set(label, [...(groups.get(label) ?? []), person]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      const aNone = a.endsWith(NO_DEPARTMENT);
      const bNone = b.endsWith(NO_DEPARTMENT);
      if (aNone !== bNone) return aNone ? 1 : -1;
      return a.localeCompare(b, 'ja');
    })
    .map(([label, members]) => ({ label, people: sortPeople(members) }));
}

// ---- 最近選んだ人（全アプリ共通。操作者と同じくゲートウェイのオリジンに1つ） ----

const RECENT_KEY = 'tax-apps:assignee-recent';
export const RECENT_MAX = 5;

/** 先頭へ寄せて重複を消し、上限で切る */
export function pushRecent(ids: readonly number[], id: number, max = RECENT_MAX): number[] {
  return [id, ...ids.filter((x) => x !== id)].slice(0, max);
}

export function readRecentIds(): number[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is number => Number.isInteger(x) && x > 0).slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function rememberRecent(id: number) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(pushRecent(readRecentIds(), id)));
  } catch {
    // 控えられなくても選んだこと自体は保存されている
  }
}

// ---- 一覧の絞り込み ----

/** 'all' = 絞らない / 'mine' = 操作者の担当 / 'none' = 担当者なし / 'staff:<台帳ID>' = その人の担当 */
export type AssigneeFilter = 'all' | 'mine' | 'none' | `staff:${number}`;

export function parseAssigneeFilter(value: unknown): AssigneeFilter {
  if (value === 'all' || value === 'mine' || value === 'none') return value;
  if (typeof value === 'string' && /^staff:[1-9]\d*$/.test(value)) return value as AssigneeFilter;
  return 'all';
}

export function staffFilter(staffId: number): AssigneeFilter {
  return `staff:${staffId}`;
}

/** 1件の担当者が絞り込みに当たるか。'mine' で操作者が未選択（myId が null）なら当たらない */
export function assigneeMatches(assignee: { staffId: number } | null, filter: AssigneeFilter, myId: number | null): boolean {
  if (filter === 'all') return true;
  if (filter === 'none') return assignee === null;
  const target = filter === 'mine' ? myId : Number(filter.slice('staff:'.length));
  return target !== null && assignee?.staffId === target;
}

/**
 * 「担当者を選ぶ」絞り込みに出す人。台帳の全員ではなく、実際にどこかの担当になっている人だけ
 * （選んで0件になる人を並べない）。名前は台帳の今の氏名、居なければ写し。
 */
export function assigneeFilterPeople(assignees: readonly (Assignee | null)[], operators: readonly Operator[]): Assignee[] {
  const byId = new Map<number, Assignee>();
  for (const a of assignees) {
    if (a === null || byId.has(a.staffId)) continue;
    byId.set(a.staffId, { staffId: a.staffId, name: operators.find((o) => o.id === a.staffId)?.fullName ?? a.name });
  }
  const kanaOf = (id: number) => operators.find((o) => o.id === id)?.kana ?? '';
  return [...byId.values()].sort((a, b) => {
    const ka = kanaOf(a.staffId);
    const kb = kanaOf(b.staffId);
    if ((ka === '') !== (kb === '')) return ka === '' ? 1 : -1;
    return ka !== '' ? normalizeForSearch(ka).localeCompare(normalizeForSearch(kb), 'ja') : a.staffId - b.staffId;
  });
}
