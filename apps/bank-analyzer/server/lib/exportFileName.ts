// 画面から落とすファイルの名前を `R081005_名前_アプリ名.ext` の形に揃える
// （Django 版 views/_helpers.py の export_filename / set_download_filename。他のアプリの
// exportFileName.ts と同じ付け方）。
//
// 先頭を和暦の日付印にするのは、申告書の控えと同じ並びで探せるようにするため。
// 末尾にアプリ名を付けるのは、フォルダに溜まった控えがどの画面から出たものかを後から見分けるため。

const APP_NAME = '預貯金分析';

// 和暦の日付印（2026-10-05 → `R081005`）。改元日の表はこちらで持たず Intl に数えさせる。
// 時刻帯を日本に固定するのは、TZ が UTC のコンテナで前日の日付になるのを防ぐため。
export function warekiStamp(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
    era: 'narrow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  // 元号年は 0 埋めされないので自分で揃える（揃えないと令和9年と令和10年の並びが入れ替わる）
  return `${value('era')}${value('year').padStart(2, '0')}${value('month')}${value('day')}`;
}

// 使えない文字を落とし、区切りに使う `_` は空白へ寄せる（名前の中に入ると段が1つ増えたように見える）
function sanitizePart(part: string): string {
  return part.replace(/[\\/:*?"<>|]/g, '').replace(/[\s_]+/g, ' ').trim();
}

// `subject` は「何についての控えか」。配列なら `_` で並べる（空の要素は落ちる）
export function exportFileName(subject: string | string[], extension: string, date?: Date): string {
  const middle = (Array.isArray(subject) ? subject : [subject]).map(sanitizePart).filter(Boolean);
  return `${[warekiStamp(date), ...middle, APP_NAME].join('_')}.${extension.replace(/^\./, '')}`;
}

// Content-Disposition。日本語の名前は filename*（RFC 5987）で渡し、filename は ASCII の代わり
export function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '?');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
