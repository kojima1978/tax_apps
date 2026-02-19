export const REIWA_OFFSET = 2018;

export function toReiwa(year: number): number {
  return year - REIWA_OFFSET;
}

export function formatReiwaYear(year: number): string {
  const reiwaYear = toReiwa(year);
  if (reiwaYear === 1) return '令和元年';
  if (reiwaYear < 1) return `${year}年`;
  return `令和${reiwaYear}年`;
}

export function generateYearRange(offset = 5): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = currentYear + offset; i >= currentYear - offset; i--) { years.push(i); }
  return years;
}
