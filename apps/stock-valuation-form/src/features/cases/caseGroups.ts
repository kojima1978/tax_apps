// 会社ごとのまとめ。同じ会社の複数年分（翌年度更新で増える）を1つの塊にする。
//
// まとめる印は2つある。
//
// 1. **会社キー**（`companyKey`）。翌年度更新・複製でサーバが引き継ぐ値で、これが同じなら
//    同じ会社。会社名を書き直しても塊は割れず、同名の別会社も混ざらない。
// 2. **会社名**。キーが振られていない案件（手で作った1件目や、この仕組みより前からある案件）は
//    今までどおり名前で名寄せする。名前が一致する塊があればそこへ入れる。
//
// 会社マスタは作らない ── 様式の会社名欄と二重管理になり、直す場所が2つになるため。
// 塊そのものの順は「その会社の案件が最初に現れた位置」＝サーバから来た更新日時の降順を
// 崩さない。さっき触った会社が一番上に来るほうが、探す手間が少ない。

import { DEFAULT_ERA, westernYear } from '@/lib/wareki';
import { normalizeCompanyName } from './caseFilter';

/** まとめの対象。一覧（CaseSummary）が持っている範囲だけを見る。 */
export interface GroupableCase {
  id: number;
  companyName: string;
  taxPeriod: string;
  companyKey?: string | null;
}

export interface CaseGroup<T> {
  /** 突き合わせに使った印。React の key とURLのハッシュを兼ねる。 */
  key: string;
  /** 見出しに出す会社名（塊の中で一番新しい年分の会社名）。 */
  companyName: string;
  items: readonly T[];
}

/**
 * その案件が属する塊の印。一覧のまとめと、帳票からの戻り先（#cases/<印>）で同じものを使う。
 *
 * キーが無い案件を会社名で寄せるのは groupCasesByCompany の側の仕事なので、ここが返すのは
 * 「その案件だけから決まる印」。名前も空なら他と混ざらないようID止まりにする。
 */
export function groupKeyOf(item: GroupableCase): string {
  if (item.companyKey) return `key:${item.companyKey}`;
  const name = normalizeCompanyName(item.companyName);
  return name === '' ? `id:${item.id}` : `name:${name}`;
}

/**
 * 「令和8年3月15日」形の課税時期を比べられる数にする。読めなければ null。
 *
 * 一覧が持っているのは taxPeriodLabel が作った文字列だけ（欄の値はサーバから来ない）なので、
 * 並べるにはここで読み戻す。月・日は欠けていることがある。
 */
export function taxPeriodOrder(label: string): number | null {
  const matched = /^(\D*)(\d+)年(?:(\d+)月(?:(\d+)日)?)?$/.exec(label.trim());
  if (matched === null) return null;
  const year = westernYear(matched[1] || DEFAULT_ERA, Number(matched[2]));
  if (year === null) return null;
  return year * 10000 + Number(matched[3] ?? 0) * 100 + Number(matched[4] ?? 0);
}

/** 課税時期の新しい順。読めないものは後ろへ回す（元の並びのまま残る）。 */
function byTaxPeriodDesc(a: { taxPeriod: string }, b: { taxPeriod: string }): number {
  const left = taxPeriodOrder(a.taxPeriod);
  const right = taxPeriodOrder(b.taxPeriod);
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  return right - left;
}

/**
 * その案件が入っている塊の印（見つからなければ null）。
 *
 * groupKeyOf を直接呼ばないのは、会社キーの無い案件が「同じ名前の、キーを持つ塊」へ寄ることが
 * あるため ── その案件だけを見て作った印は、一覧に実在する塊の印と一致しないことがある。
 */
export function groupKeyOfCaseId(cases: readonly GroupableCase[], id: number): string | null {
  const group = groupCasesByCompany(cases).find((item) => item.items.some((c) => c.id === id));
  return group?.key ?? null;
}

/**
 * 印から塊を探す。会社名の印（`name:`）は、その名前の塊にも当てる。
 *
 * 会社キーはサーバが「同じ会社の別の年分」を作るときに初めて振るので、年分を足した瞬間に
 * その会社の印は `name:` から `key:` へ変わる。URL（#cases/<印>）は変わる前のものが履歴に
 * 残っているため、印の一致だけで探すと戻ったときに「見つかりません」になる。
 */
export function findGroupByKey<T>(
  groups: readonly CaseGroup<T>[],
  key: string,
): CaseGroup<T> | null {
  const found = groups.find((group) => group.key === key);
  if (found !== undefined) return found;
  if (!key.startsWith('name:')) return null;
  const name = key.slice('name:'.length);
  return groups.find((group) => normalizeCompanyName(group.companyName) === name) ?? null;
}

export function groupCasesByCompany<T extends GroupableCase>(
  cases: readonly T[],
): readonly CaseGroup<T>[] {
  const groups = new Map<string, { key: string; order: number; items: T[] }>();
  // 正規化した会社名 → その名前で最初に見つかった塊。キーの無い案件の行き先を決めるのに使う。
  const byName = new Map<string, string>();

  const add = (key: string, item: T, order: number) => {
    const found = groups.get(key);
    if (found === undefined) {
      groups.set(key, { key, order, items: [item] });
    } else {
      found.items.push(item);
      // 塊の位置は「一番上に来た案件」で決める。キーのある案件を先に見ているので、
      // あとから入ったキー無しの案件のほうが新しいことがある。
      found.order = Math.min(found.order, order);
    }

    const name = normalizeCompanyName(item.companyName);
    if (name !== '' && !byName.has(name)) byName.set(name, key);
  };

  // 先に会社キーのある案件で塊を作る。キーの無い案件を寄せる先を決めるには、寄せられる側が
  // 出来上がっている必要があるため（一覧の並び＝更新日時の降順ではどちらが先か決まらない）。
  cases.forEach((item, order) => {
    if (item.companyKey) add(`key:${item.companyKey}`, item, order);
  });

  cases.forEach((item, order) => {
    if (item.companyKey) return;
    const name = normalizeCompanyName(item.companyName);
    // 会社名が未入力のものはまとめない（別の会社かどうか分からない）。
    const key = name === '' ? `id:${item.id}` : byName.get(name) ?? `name:${name}`;
    add(key, item, order);
  });

  return [...groups.values()]
    .sort((a, b) => a.order - b.order)
    .map(({ key, items }) => {
      const sorted = items.length > 1 ? [...items].sort(byTaxPeriodDesc) : items;
      return {
        key,
        // 見出しは一番新しい年分の名前にする（会社名を直すのは、たいてい今年のぶんを開いたとき）。
        companyName: sorted.find((item) => item.companyName.trim() !== '')?.companyName ?? '',
        items: sorted,
      };
    });
}
