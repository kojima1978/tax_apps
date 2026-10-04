/**
 * 画面からダウンロードするファイルの名前を `R081005_名前_アプリ名.ext` の形に揃える。
 *
 * 先頭を和暦の日付印にするのは、申告書の控えと同じ並びで探せるようにするため。
 * 元号1文字＋元号年2桁＋月2桁＋日2桁なので、同じ元号の中では文字列順＝日付順になる。
 * 末尾にアプリ名を付けるのは、フォルダに溜まった控えがどの画面から出たものかを後から見分けるため。
 */

/** このアプリの名前（ポータルの表示名に合わせる）。 */
const APP_NAME = '減価償却資産評価';

/**
 * 和暦の日付印（2026-10-05 → `R081005`）。
 *
 * 改元日の表はこちらで持たず Intl に数えさせる。時刻帯を日本に固定するのは、
 * サーバー側（TZ が UTC のコンテナ）で前日の日付になるのを防ぐため。
 */
export function warekiStamp(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
    era: 'narrow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  // 元号年は 0 埋めされないので自分で揃える（揃えないと令和9年と令和10年の並びが入れ替わる）。
  return `${value('era')}${value('year').padStart(2, '0')}${value('month')}${value('day')}`;
}

/** ファイル名に使えない文字を落とす。欄に打たれた名前がそのまま入るため。 */
function sanitizePart(part: string): string {
  // 区切りに使う `_` は空白へ寄せる（名前の中に入ると段が1つ増えたように見える）。
  return part.replace(/[\\/:*?"<>|]/g, '').replace(/[\s_]+/g, ' ').trim();
}

/**
 * `R081005_名前_アプリ名.ext` を作る。
 *
 * `subject` は「何についての控えか」── 顧客名・会社名があるならそれ、無ければ内容の名前。
 * 配列を渡すと `_` で並べる（空の要素は落ちる）。
 */
export function exportFileName(subject: string | string[], extension: string, date?: Date): string {
  const middle = (Array.isArray(subject) ? subject : [subject]).map(sanitizePart).filter(Boolean);
  return `${[warekiStamp(date), ...middle, APP_NAME].join('_')}.${extension.replace(/^\./, '')}`;
}
