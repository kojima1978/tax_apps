// 和暦と西暦の相互変換。
//
// 国税庁が公表する業種目別株価等は「令和８年４月分」「令和７年平均」のような和暦の
// 見出しで並んでいる。DBには西暦で持つため、取込時にここで西暦へ倒す。

/** 元号ごとの「元年の前年の西暦」。元号年 + この値 = 西暦年。 */
const ERA_BASE_YEAR: Readonly<Record<string, number>> = {
  令和: 2018, // 令和元年 = 2019
  平成: 1988, // 平成元年 = 1989
  昭和: 1925, // 昭和元年 = 1926
};

const ERA_NAMES = Object.keys(ERA_BASE_YEAR).join('|');

/** 全角数字（０-９）を半角に倒す。公表データの見出しは全角で書かれている。 */
export function toHalfWidthDigits(value: string): string {
  return value.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
}

export function gregorianYearOf(era: string, eraYear: number): number {
  const base = ERA_BASE_YEAR[era];
  if (base === undefined) throw new Error(`未知の元号です: ${era}`);
  return base + eraYear;
}

/** 「令和8年分」のような年分ラベル。 */
export function industryYearLabel(era: string, eraYear: number): string {
  return `${era}${eraYear}年分`;
}

export interface WarekiMonth {
  era: string;
  eraYear: number;
  gregorianYear: number;
  month: number;
}

const MONTH_KEY = new RegExp(`^(${ERA_NAMES})([0-9]+)年([0-9]+)月分$`);
const YEAR_AVERAGE_KEY = new RegExp(`^(${ERA_NAMES})([0-9]+)年平均$`);

/** 「令和８年４月分」→ 西暦2026年4月。該当しない見出しは null。 */
export function parseMonthlyPriceKey(key: string): WarekiMonth | null {
  const matched = MONTH_KEY.exec(toHalfWidthDigits(key));
  if (!matched) return null;

  const era = matched[1]!;
  const eraYear = Number(matched[2]!);
  const month = Number(matched[3]!);
  if (month < 1 || month > 12) return null;

  return { era, eraYear, gregorianYear: gregorianYearOf(era, eraYear), month };
}

/** 「令和７年平均」→ 西暦2025年。該当しない見出しは null。 */
export function parseYearAverageKey(
  key: string,
): Omit<WarekiMonth, 'month'> | null {
  const matched = YEAR_AVERAGE_KEY.exec(toHalfWidthDigits(key));
  if (!matched) return null;

  const era = matched[1]!;
  const eraYear = Number(matched[2]!);

  return { era, eraYear, gregorianYear: gregorianYearOf(era, eraYear) };
}
