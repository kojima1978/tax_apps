/**
 * Date and taxation period utility functions
 */

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
 * Convert Western year to Japanese era (Reiwa)
 */
export function convertToReiwa(year: number): string {
  // 令和元年 = 2019
  const reiwaYear = year - 2018;
  if (reiwaYear < 1) {
    // Before Reiwa era
    return `${year}年`;
  }
  return `令和${reiwaYear}年`;
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
    return convertToReiwa(year - 1);
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