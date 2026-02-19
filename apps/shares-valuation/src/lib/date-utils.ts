/**
 * Date and taxation period utility functions
 */

const REIWA_OFFSET = 2018;

function toReiwa(year: number): number {
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
  for (let i = currentYear + offset; i >= currentYear - offset; i--) {
    years.push(i);
  }
  return years;
}

/**
 * Extract month from taxationPeriod
 * Format can be either "YYYY-MM-DD" (date input) or "令和X年Y月" (Japanese text)
 */
export function getTaxationMonth(taxationPeriod: string): string {
  if (!taxationPeriod) return "";

  // Try Japanese format first (e.g., "令和5年10月")
  const japaneseMatch = taxationPeriod.match(/(\d+)月/);
  if (japaneseMatch) return japaneseMatch[1];

  // Try ISO date format (e.g., "2023-10-15")
  const isoMatch = taxationPeriod.match(/^\d{4}-(\d{2})-\d{2}$/);
  if (isoMatch) return String(parseInt(isoMatch[1], 10)); // Remove leading zero

  return "";
}

/**
 * Get previous year from taxation period
 */
export function getPreviousYear(taxationPeriod: string): string {
  if (!taxationPeriod) return "";

  // Try Japanese format first (e.g., "令和5年10月")
  const japaneseMatch = taxationPeriod.match(/令和(\d+)年/);
  if (japaneseMatch) {
    const reiwaYear = parseInt(japaneseMatch[1], 10);
    return `令和${reiwaYear - 1}年`;
  }

  // Try ISO date format (e.g., "2023-10-15")
  const isoMatch = taxationPeriod.match(/^(\d{4})-\d{2}-\d{2}$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    return formatReiwaYear(year - 1);
  }

  return "";
}

/**
 * Calculate month for previous periods (1 month before, 2 months before)
 */
export function getMonthOffset(
  taxationPeriod: string,
  offset: number,
): string {
  const month = getTaxationMonth(taxationPeriod);
  if (!month) return "";

  const monthNum = parseInt(month, 10);
  let targetMonth = monthNum - offset;

  // Handle month wrapping (e.g., January - 1 month = December)
  while (targetMonth <= 0) {
    targetMonth += 12;
  }

  return String(targetMonth);
}