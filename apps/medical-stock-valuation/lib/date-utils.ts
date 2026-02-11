/**
 * 西暦を和暦（令和）に変換するユーティリティ
 */

/**
 * 西暦年を令和年に変換
 * @param year 西暦年（例: 2024）
 * @returns 令和年（例: "令和6"）
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

/**
 * 現在年を中心に ±offset の年度配列を降順で生成
 * @param offset 前後の年数（デフォルト: 5）
 * @returns 年度の数値配列（降順）
 */
export function generateYearRange(offset = 5): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = currentYear + offset; i >= currentYear - offset; i--) {
    years.push(i);
  }
  return years;
}
