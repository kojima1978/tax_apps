/**
 * 西暦を和暦（令和）に変換するユーティリティ
 */

export { generateYearRange } from '@tax-apps/utils';

/**
 * 西暦年を令和年に変換
 * @param year 西暦年（例: 2024）
 * @returns 令和年（例: "令和6"）— 年サフィックスなし
 */
export function toWareki(year: number | string): string {
  const numYear = typeof year === 'string' ? parseInt(year, 10) : year;

  if (isNaN(numYear)) {
    return '';
  }

  // 令和元年は2019年
  const reiwaYear = numYear - 2018;

  if (reiwaYear < 1) {
    // 令和以前（平成など）は西暦表示
    return `${numYear}年`;
  } else if (reiwaYear === 1) {
    return '令和元';
  } else {
    return `令和${reiwaYear}`;
  }
}
