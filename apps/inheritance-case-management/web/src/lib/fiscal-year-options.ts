/** 年度の選択肢。件数を固定せず、その年を基準に組み立てる（固定だと年が進むと新しい年度が選べなくなる）。 */

/** 入力で選べるいちばん古い年度 */
export const FIRST_FISCAL_YEAR = 2015

function uniqueDescending(years: Iterable<number>): number[] {
    return [...new Set(years)].filter(Number.isInteger).sort((a, b) => b - a)
}

/**
 * 案件の基本タブで選べる年度。翌年度（年をまたぐ案件のため）〜 2015年度。
 * 保存済みの年度が範囲の外でも選択肢に残す（消えると保存のときに年度が変わる）。
 */
export function inputFiscalYearOptions(currentYear: number, savedYear?: number | null): number[] {
    const years: number[] = []
    for (let year = currentYear + 1; year >= FIRST_FISCAL_YEAR; year--) years.push(year)
    if (savedYear != null) years.push(savedYear)
    return uniqueDescending(years)
}

/**
 * 一覧の絞り込みで選べる年度。案件のある年度＋今年度（経営分析と同じ考え方）。
 * URL で指定中の年度は、案件が無くても選択肢に残す（選んだ値が表示から消えないように）。
 */
export function filterFiscalYearOptions(currentYear: number, yearsWithCases: readonly number[], selectedYear?: number | null): number[] {
    return uniqueDescending([currentYear, ...yearsWithCases, ...(selectedYear != null ? [selectedYear] : [])])
}
