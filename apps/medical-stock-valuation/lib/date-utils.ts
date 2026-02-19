/**
 * 西暦を和暦（令和）に変換するユーティリティ
 */

export function generateYearRange(offset = 5): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = currentYear + offset; i >= currentYear - offset; i--) { years.push(i); }
  return years;
}

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
