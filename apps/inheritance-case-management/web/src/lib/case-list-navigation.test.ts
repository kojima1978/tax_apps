import { afterEach, describe, expect, it, vi } from "vitest"
import { getCaseListReturnHref, readCaseListNavigation, saveCaseListNavigation } from "./case-list-navigation"

afterEach(() => vi.unstubAllGlobals())
const context = { query: "fiscalYear=all&search=%E7%A2%BA%E8%AA%8D&page=2", scrollY: 700, openedId: 2, cases: [{ id: 2, name: "確認案件" }] }

describe("案件一覧への復帰", () => {
    it("開いた一覧の検索・ページ・位置を復元し、無関係な案件には適用しない", () => {
        let raw: string | null = null
        vi.stubGlobal("window", {})
        vi.stubGlobal("sessionStorage", { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } })
        saveCaseListNavigation(context)
        expect(readCaseListNavigation()).toEqual(context)
        expect(getCaseListReturnHref(2)).toBe(`/?${context.query}`)
        expect(getCaseListReturnHref(3)).toBe("/")
    })
    it("破損した保存情報とブラウザストレージの制限時も一覧に戻れる", () => {
        vi.stubGlobal("window", {})
        vi.stubGlobal("sessionStorage", { getItem: () => "broken", setItem: () => { throw new Error("blocked") } })
        expect(() => saveCaseListNavigation(context)).not.toThrow()
        expect(readCaseListNavigation()).toBeNull()
        expect(getCaseListReturnHref(2)).toBe("/")
    })
})
