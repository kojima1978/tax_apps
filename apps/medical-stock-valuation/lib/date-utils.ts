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
 * 令和年を西暦年に変換
 * @param wareki 令和年（例: "令和6"、"R6"、"6"）
 * @returns 西暦年（例: 2024）
 */
export function toSeireki(wareki: string): number {
  // "令和"を除去
  let reiwaYear = wareki.replace(/令和|R/g, '').trim();

  // "元"を1に変換
  if (reiwaYear === '元') {
    reiwaYear = '1';
  }

  const numReiwaYear = parseInt(reiwaYear, 10);

  if (isNaN(numReiwaYear)) {
    return 0;
  }

  // 令和元年は2019年
  return numReiwaYear + 2018;
}

/**
 * 西暦年の配列を令和年の配列に変換
 * @param years 西暦年の配列
 * @returns 令和年の配列（表示用）
 */
export function yearsToWareki(years: string[]): Array<{ seireki: string; wareki: string }> {
  return years.map(year => ({
    seireki: year,
    wareki: toWareki(year),
  }));
}

/**
 * 現在の年度（令和）を取得
 * @returns 令和年（例: "令和6"）
 */
export function getCurrentWarekiYear(): string {
  const currentYear = new Date().getFullYear();
  return toWareki(currentYear);
}

/**
 * 現在の年度（西暦）を取得
 * @returns 西暦年（例: 2024）
 */
export function getCurrentSeirekiYear(): number {
  return new Date().getFullYear();
}
