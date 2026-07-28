const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function defaultAsOfDate(fiscalYear: number) {
  return `${String(fiscalYear).padStart(4, "0")}-01-01`;
}

export function parseDateOnlyUtc(value: string) {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;

  return date;
}

export function isAsOfDateForFiscalYear(value: string, fiscalYear: number) {
  const date = parseDateOnlyUtc(value);
  return date !== null && date.getUTCFullYear() === fiscalYear;
}
