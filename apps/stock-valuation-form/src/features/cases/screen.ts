// どの画面を出すかの判定。会社一覧・年度一覧・帳票・業種目データ管理・使い方をハッシュで切り替える
// （ルータは入れていない。URLに残したいのはどの画面かと、どの会社かだけ）。
//
// ハッシュが無いときは会社一覧。会社を選んでから帳票へ入る形にしておくと、前の会社の
// 入力が出たまま別の会社を打ち始める余地が無くなる。帳票へ入るときに `#form` を付けるのは
// **作業中の F5 で一覧へ戻らない**ため（入力は消えないが、戻された先で操作し直すことになる）。

export const CASES_HASH = '#cases';
export const FORM_HASH = '#form';
export const ADMIN_HASH = '#industry-data';
/** 使い方の画面。戻り先は App が開く前のハッシュを覚えておく。 */
export const HELP_HASH = '#help';

/** その会社の年度一覧のハッシュ。印は caseGroups の groupKeyOf が作る。 */
export const companyHash = (groupKey: string) => `${CASES_HASH}/${encodeURIComponent(groupKey)}`;

export type Route =
  | { screen: 'cases' }
  | { screen: 'company'; groupKey: string }
  | { screen: 'form' }
  | { screen: 'admin' }
  | { screen: 'help' };

/**
 * ハッシュから画面を決める。知らないハッシュ（古いブックマークなど）は会社一覧に落とす
 * ── 会社一覧はどこへでも行ける画面なので、行き止まりにならない。
 */
export function resolveRoute(hash: string): Route {
  if (hash === ADMIN_HASH) return { screen: 'admin' };
  if (hash === FORM_HASH) return { screen: 'form' };
  if (hash === HELP_HASH) return { screen: 'help' };

  if (hash.startsWith(`${CASES_HASH}/`)) {
    const raw = hash.slice(CASES_HASH.length + 1);
    try {
      // 壊れた％表記でも画面を落とさない（decodeURIComponent は投げる）。
      const groupKey = decodeURIComponent(raw);
      if (groupKey !== '') return { screen: 'company', groupKey };
    } catch {
      return { screen: 'cases' };
    }
  }

  return { screen: 'cases' };
}
