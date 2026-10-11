import { describe, expect, it } from "vitest"
import { parseAnalyticsView, updateAnalyticsUrl } from "./analytics-view-state"
import { appendSelectedYears } from "./drilldown-utils"

describe("経営分析の表示条件", () => {
    it("複数年度・タブ・基準月・日本語の部門名をURLから復元する", () => {
        const view = parseAnalyticsView("?tab=trend&years=2025,2026,2025&baseMonth=2025-12&department=相続部", 2026, "2026-10")
        expect(view).toEqual({ tab: "trend", years: [2025, 2026], baseMonth: "2025-12", department: "相続部" })
        expect(parseAnalyticsView(updateAnalyticsUrl("", view, "2026-10"), 2026, "2026-10")).toEqual({ ...view, years: [2026, 2025] })
    })
    it("未指定や不正な年度・タブ・未来の基準月は既定値で表示する", () => {
        expect(parseAnalyticsView("?tab=unknown&years=NaN,-2&baseMonth=2027-01", 2026, "2026-10")).toEqual({ tab: "overview", years: [2026], baseMonth: "2026-10", department: "__all__" })
        expect(parseAnalyticsView("?baseMonth=2026-13", 2026, "2026-10").baseMonth).toBe("2026-10")
    })
    it("全期間と他のURL情報を保持し、当月・全部門の不要なパラメータを取り除く", () => {
        const view = parseAnalyticsView("?years=all", 2026, "2026-10")
        const query = new URLSearchParams(updateAnalyticsUrl("?source=bookmark&baseMonth=2025-01&department=部門A", view, "2026-10"))
        expect(query.get("years")).toBe("all")
        expect(query.get("source")).toBe("bookmark")
        expect(query.has("baseMonth")).toBe(false)
        expect(query.has("department")).toBe(false)
    })
    it("全期間の案件へのリンクにも年度範囲を明示する", () => {
        const params = new URLSearchParams()
        appendSelectedYears(params, new Set())
        expect(params.get("fiscalYear")).toBe("all")
    })
})
