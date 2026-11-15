import { describe, expect, it } from 'vitest'
import { FIRST_FISCAL_YEAR, filterFiscalYearOptions, inputFiscalYearOptions } from './fiscal-year-options'

describe('inputFiscalYearOptions（基本タブの年度）', () => {
    it('2026年は 2027〜2015年度を新しい順に返す', () => {
        const years = inputFiscalYearOptions(2026)
        expect(years[0]).toBe(2027)
        expect(years.at(-1)).toBe(FIRST_FISCAL_YEAR)
        expect(years).toHaveLength(13)
    })

    it('2036年になっても翌年度の 2037 まで選べる（固定の件数で止まらない）', () => {
        const years = inputFiscalYearOptions(2036)
        expect(years[0]).toBe(2037)
        expect(years).toContain(2036)
        expect(years.at(-1)).toBe(2015)
    })

    it('保存済みの年度が範囲の外でも選択肢に残す', () => {
        expect(inputFiscalYearOptions(2026, 2030)[0]).toBe(2030)
        expect(inputFiscalYearOptions(2026, 2010).at(-1)).toBe(2010)
        expect(inputFiscalYearOptions(2026, 2020).filter(y => y === 2020)).toHaveLength(1)
    })
})

describe('filterFiscalYearOptions（一覧の絞り込みの年度）', () => {
    it('案件のある年度＋今年度を、重複なく新しい順に返す', () => {
        expect(filterFiscalYearOptions(2026, [2024, 2020, 2024, 2025])).toEqual([2026, 2025, 2024, 2020])
    })

    it('案件が無くても今年度は選べる', () => {
        expect(filterFiscalYearOptions(2036, [])).toEqual([2036])
    })

    it('URL で指定中の年度は案件が無くても残す', () => {
        expect(filterFiscalYearOptions(2026, [2025], 2031)).toEqual([2031, 2026, 2025])
    })
})
