/**
 * コードを選んだときに連動して別の欄を書き換える仕組み。
 *
 * 用紙（`GridForm`）と明細の入力画面（`DetailPanel`）のどちらで選んでも同じ結果になるよう、
 * 「何をどう書き換えるか」はここ1箇所に置く。書き換えた後の値は普通に手直しできる。
 *
 * - `autoFill` … 欄の中身をまるごと差し替える（細目コード → 細目の名称）
 * - `autoSuffix` … 末尾の語だけを付け替える（金融機関等コード → 名称の「銀行」）
 */

/** 選択に連動して中身をまるごと入れ替える欄 */
export interface AutoFill {
  field: string;
  byValue: Record<string, string>;
}

/** 選択に連動して末尾の語を付け替える欄 */
export interface AutoSuffix {
  field: string;
  /** コード → 末尾に補う語（補わないコードは空文字） */
  byValue: Record<string, string>;
  /** 付け替えのときに末尾から剥がす語の一覧 */
  words: readonly string[];
}

/**
 * 名称の末尾の語を `word` に付け替える。
 *
 * 足すだけにすると選び直すたびに「みずほ銀行金庫」と伸びていくので、
 * 末尾に既知の語があれば**1つだけ**剥がしてから足す。
 * `word` が空（未選択・「上記以外」）なら剥がすだけで、手で打った部分は残る。
 */
export function applyCodeSuffix(name: string, word: string, words: readonly string[]): string {
  const base = name.trim();
  // 「本所」と「所」のように一方が他方の末尾になる語が増えても長い方を優先する
  const found = words
    .filter((w) => w !== '' && base.endsWith(w))
    .sort((a, b) => b.length - a.length)[0];
  return `${found === undefined ? base : base.slice(0, -found.length)}${word}`;
}

/** コードを `code` にしたときに連動して書き換わる［欄名, 値］の組 */
export function codeLinkedUpdates(
  link: { autoFill?: AutoFill; autoSuffix?: AutoSuffix },
  code: string,
  read: (field: string) => string,
): [string, string][] {
  const updates: [string, string][] = [];
  if (link.autoFill) updates.push([link.autoFill.field, link.autoFill.byValue[code] ?? '']);
  if (link.autoSuffix) {
    const { field, byValue, words } = link.autoSuffix;
    updates.push([field, applyCodeSuffix(read(field), byValue[code] ?? '', words)]);
  }
  return updates;
}
