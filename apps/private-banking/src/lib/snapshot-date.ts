/**
 * `YYYY-MM-DD` を扱う唯一の口。
 *
 * `new Date("2026-02-31T00:00:00")` は例外にならず 3月3日 になる（V8 は日付を繰り上げる）ので、
 * 日付を受け取る経路は必ずここを通して「実在するか」を確かめる ── 繰り上がった日は
 * 画面にも保存値にも「2026-03-03」として残るため、入れた人も見る人も気づけない。
 */
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

/** `YYYY-MM-DD` が実在する日付か（2月31日・13月は false）。 */
export const isRealDateOnly = (value: string) => parseDateOnlyUtc(value) !== null;
