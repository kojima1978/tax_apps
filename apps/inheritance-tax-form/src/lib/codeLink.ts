/**
 * コードを選んだときに連動して別の欄へ効く仕組み。
 *
 * - `autoFill` … 欄の中身をまるごと差し替える（細目コード → 細目の名称）
 * - `suffixByCode` … **用紙の上の見え方だけ**を変える（金融機関等コード → 名称の末尾に「銀行」）
 *
 * 名称の語を保存する値そのものに入れないのは、入力画面には「みずほ」と打ったままを残したいため。
 * 用紙は `suffixByCode` を見て「みずほ銀行」と出す。
 */

/** 選択に連動して中身をまるごと入れ替える欄 */
export interface AutoFill {
  field: string;
  byValue: Record<string, string>;
}

/** 用紙に出すときだけ名称の末尾に語を補う指定（名称の欄に付ける） */
export interface CodeSuffix {
  /** 補う語を決めるコードの欄 */
  field: string;
  /** コード → 末尾に補う語（補わないコードは空文字） */
  byValue: Record<string, string>;
  /** すでに末尾にあれば剥がす語の一覧 */
  words: readonly string[];
}

/**
 * 名称の末尾の語を `word` に付け替える。
 *
 * 足すだけにすると手で「みずほ銀行」と打ってある場合に「みずほ銀行銀行」になるので、
 * 末尾に既知の語があれば**1つだけ**剥がしてから足す。
 */
export function applyCodeSuffix(name: string, word: string, words: readonly string[]): string {
  const base = name.trim();
  // 「本所」と「所」のように一方が他方の末尾になる語が増えても長い方を優先する
  const found = words
    .filter((w) => w !== '' && base.endsWith(w))
    .sort((a, b) => b.length - a.length)[0];
  return `${found === undefined ? base : base.slice(0, -found.length)}${word}`;
}

/** 用紙に出す名称。名称が空なら語だけを出しても意味が無いので空のままにする */
export function suffixedName(name: string, code: string, suffix: CodeSuffix): string {
  if (name.trim() === '') return '';
  return applyCodeSuffix(name, suffix.byValue[code] ?? '', suffix.words);
}
