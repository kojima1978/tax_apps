/**
 * 氏名・フリガナの空白の揺れを揃える（保存するときに1回だけ通す）。
 *
 * - 前後の空白は落とし、途中の空白の並び（半角・全角・タブ）は1つにまとめる
 * - 残った区切りは、両側が日本語なら**全角スペース1つ**。申告書・評価明細書・委任状の
 *   「氏名」はどれも1マスで、姓と名の間は全角が通例のため
 * - どちらかが英数字のときは半角スペース1つ（「株式会社 ABC」「ABC Bank」を崩さない）
 *
 * 姓と名を別の列には分けない（様式が1マス・法人名が同じ欄に入る・既存データを割る危険）。
 * 代わりに、入っている形をここで1つに決めて、姓/名が要る場面は splitPersonName で割る。
 * 既に保存されている行は触らない ── 次にその人を保存したときに揃う。
 */

const IDEOGRAPHIC_SPACE = '　';

const isAscii = (char: string | undefined): boolean => char !== undefined && char.charCodeAt(0) < 0x80;

export function normalizePersonNameSpacing(value: string): string {
  return value
    .split(/\s+/u)
    .filter((part) => part !== '')
    .reduce((joined, part) => {
      if (joined === '') return part;
      return joined + (isAscii(joined.at(-1)) || isAscii(part[0]) ? ' ' : IDEOGRAPHIC_SPACE) + part;
    }, '');
}

/** 姓と名を1つの氏名へ（姓と名を別に持つのは社員台帳だけ。区切りは上と同じ規則） */
export function joinPersonName(familyName: string, givenName: string): string {
  return normalizePersonNameSpacing(`${familyName} ${givenName}`);
}

/**
 * 氏名を姓と名へ割る。最初の空白で分け、空白が無ければ全部を姓として扱う
 * （社員台帳の取込・移行と同じ規則。名の中の空白は落とす）。
 */
export function splitPersonName(value: string): { familyName: string; givenName: string } {
  const normalized = normalizePersonNameSpacing(value);
  const at = normalized.search(/\s/u);
  if (at < 0) return { familyName: normalized, givenName: '' };
  return { familyName: normalized.slice(0, at), givenName: normalized.slice(at + 1).replace(/\s+/gu, '') };
}
