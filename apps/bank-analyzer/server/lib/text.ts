// 摘要の文字の揺れをそろえる（Django 版 analyzer/lib/text_utils.py の移植）。
//
// NFKC → casefold → カタカナをひらがなへ。半角カナ・全角英数字・大文字小文字・
// ひらがな/カタカナの違いを吸収して、絞り込み検索を横断させる。
// 取引の description_search 列（trigram 索引が見る列）もこの規則で作る ──
// Django 版が入れた既存の値と1文字でも食い違うと、同じ語で当たる行が変わる。
//
// 分類（キーワード一致・表記ゆれ照合）はこれを通さず生の文字列で照合する
// （計画書 §3 の #8。Django と同じにした）。

// 変換する文字はこの表にあるものだけ（ヵ・ヶ・ヰ・ヱ・ー などは Django 版でも残る）。
const KATAKANA =
  'アイウエオカキクケコサシスセソタチツテト' +
  'ナニヌネノハヒフヘホマミムメモヤユヨ' +
  'ラリルレロワヲンァィゥェォッャュョヮヴ' +
  'ガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ';
const HIRAGANA =
  'あいうえおかきくけこさしすせそたちつてと' +
  'なにぬねのはひふへほまみむめもやゆよ' +
  'らりるれろわをんぁぃぅぇぉっゃゅょゎゔ' +
  'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ';

const KATAKANA_TO_HIRAGANA = new Map([...KATAKANA].map((k, i) => [k, HIRAGANA[i]!]));

// Python の str.casefold() のうち、NFKC の後に toLowerCase() と結果が違う文字。
// 通帳の摘要に出ることはまず無いが、既存の検索列と規則をそろえておく。
const CASEFOLD_EXTRA: Record<string, string> = { ß: 'ss', ẞ: 'ss', ς: 'σ' };

export function normalizeText(text: string): string {
  const folded = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ßẞς]/g, (c) => CASEFOLD_EXTRA[c] ?? c);
  let out = '';
  for (const ch of folded) out += KATAKANA_TO_HIRAGANA.get(ch) ?? ch;
  return out;
}

// 空白区切りのキーワードを正規化して分ける（AND 検索用。空は除く）。
// Python の str.split() と同じく、全角スペースも区切りとして扱う。
export function splitKeywords(keyword: string): string[] {
  return keyword
    .split(/\s+/)
    .filter((k) => k !== '')
    .map(normalizeText);
}

export function matchesAllKeywords(text: string | null | undefined, keywords: string[]): boolean {
  const normalized = normalizeText(text ?? '');
  return keywords.every((kw) => normalized.includes(kw));
}
