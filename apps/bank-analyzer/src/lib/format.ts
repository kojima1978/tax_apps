// 表示の書式。和暦の変換はサーバーと同じ関数を使う（server/lib/dates.ts は DB に依存しない）

import { warekiShort } from '../../server/lib/dates';

export { warekiMonthShort, warekiShort } from '../../server/lib/dates';

const yenFormat = new Intl.NumberFormat('ja-JP');

// 0 は空欄（通帳の出金・入金欄と同じ見せ方）
export const yen = (n: number | null | undefined) => (n ? yenFormat.format(n) : '');
// 0 も 0 と書く（合計など）
export const num = (n: number | null | undefined) => yenFormat.format(n ?? 0);

// 日時（ISO）→ 日本の日付で和暦の短い形（R7.4.1）
export function warekiFromDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const date = new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  return warekiShort(date);
}

export const dateOrDash = (iso: string | null | undefined) => (iso ? warekiShort(iso) : '-');
