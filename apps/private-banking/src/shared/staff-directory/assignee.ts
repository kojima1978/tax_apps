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

/**
 * 選ぶ部品が探す・並べる相手。台帳の Operator のほか、写しを持つアプリ（PB・案件管理）の行も
 * この形に寄せれば同じ決まりで探して並べられる。
 */
export type PersonLike = {
  fullName: string;
  kana: string;
  companyName: string;
  departmentName: string;
  /** 探すときだけ見る追加の手がかり（同姓同名を見分ける社員コードなど） */
  searchExtra?: string;
};

/**
 * 空白で区切った語が全部、名前・読み・部署・会社・追加の手がかりのどれかに含まれていれば当たり。
 * 「さとう 大阪」のように名前と部署を並べて探せる。空の検索語は全員
 */
export function personMatches(person: PersonLike, query: string): boolean {
  const terms = query.split(/\s+/).map(normalizeForSearch).filter((t) => t !== '');
  if (terms.length === 0) return true;
  const fields = [person.fullName, person.kana, person.departmentName, person.companyName, person.searchExtra ?? ''].map(normalizeForSearch);
  return terms.every((term) => fields.some((field) => field.includes(term)));
}

/**
 * 読みのある人を読み順に先へ、読みの無い人は渡された並びのまま後ろへ。
 * 漢字の氏名どうしを localeCompare しても音の順にはならないので、読みの無い人は並べ替えない。
 */
export function sortPeople<T extends PersonLike>(people: readonly T[]): T[] {
  const withKana = people.filter((p) => p.kana !== '');
  const withoutKana = people.filter((p) => p.kana === '');
  withKana.sort((a, b) => normalizeForSearch(a.kana).localeCompare(normalizeForSearch(b.kana), 'ja'));
  return [...withKana, ...withoutKana];
}

export const NO_DEPARTMENT = '部署なし';

export type PersonSection<T extends PersonLike = Operator> = { label: string; people: T[] };

/** 部署ごとの塊。会社が2つ以上あるときだけ見出しに会社名も付ける。部署なしは最後 */
export function sectionsByDepartment<T extends PersonLike>(people: readonly T[]): PersonSection<T>[] {
  const multiCompany = new Set(people.map((p) => p.companyName)).size > 1;
  const groups = new Map<string, T[]>();
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

/** 選ぶ一覧の1つの塊。showDepartment は行に部署名を添えるか（部署の塊では見出しが言うので添えない） */
export type PickerSection<T extends PersonLike> = PersonSection<T> & { kind: 'search' | 'me' | 'recent' | 'department'; showDepartment: boolean };

export const ME_SECTION_LABEL = '自分（操作者）';
export const RECENT_SECTION_LABEL = '最近選んだ人';

/**
 * 担当者を選ぶ一覧の組み立て（台帳のダイアログ・PB の選択欄で同じ決まり）。
 * - 検索語があれば当たった人だけを1つの塊に
 * - 無ければ先頭に「自分（操作者）」「最近選んだ人」（quick のとき）、そのあと部署ごと
 * 自分と最近は台帳ID で持つので、写しの行は directoryIdOf で台帳ID を引く。
 */
export function buildPickerSections<T extends PersonLike>(
  people: readonly T[],
  options: {
    query: string;
    directoryIdOf: (person: T) => number | null;
    quick?: { meId: number | null; recentIds: readonly number[]; meLabel?: string };
  },
): PickerSection<T>[] {
  const { query, directoryIdOf, quick } = options;
  if (query.trim() !== '') {
    const hits = sortPeople(people.filter((p) => personMatches(p, query)));
    return [{ kind: 'search', label: `検索結果（${hits.length}人）`, people: hits, showDepartment: true }];
  }
  const byDepartment = sectionsByDepartment(people).map((s): PickerSection<T> => ({ ...s, kind: 'department', showDepartment: false }));
  if (!quick) return byDepartment;
  const findByDirectoryId = (id: number | null) => (id === null ? undefined : people.find((p) => directoryIdOf(p) === id));
  const me = findByDirectoryId(quick.meId);
  const recent = quick.recentIds
    .filter((id) => id !== quick.meId)
    .map(findByDirectoryId)
    .filter((p): p is T => p !== undefined);
  return [
    ...(me ? [{ kind: 'me' as const, label: quick.meLabel ?? ME_SECTION_LABEL, people: [me], showDepartment: true }] : []),
    ...(recent.length > 0 ? [{ kind: 'recent' as const, label: RECENT_SECTION_LABEL, people: recent, showDepartment: true }] : []),
    ...byDepartment,
  ];
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
