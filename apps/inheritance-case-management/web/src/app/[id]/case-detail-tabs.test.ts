import { describe, it, expect } from "vitest"
import type { InheritanceCase } from "@/types/shared"
import {
    buildCaseDetailTabUrl,
    CASE_DETAIL_TABS,
    CASE_SECTION_ANCHORS,
    DEFAULT_CASE_DETAIL_TAB,
    getAvailableCaseDetailTabs,
    getCaseDetailTabHref,
    getCaseDetailTabStatuses,
    getTabForSectionAnchor,
    getTabForSectionKey,
    isCaseDetailTabId,
    resolveCaseDetailTab,
} from "./case-detail-tabs"

const baseCase = {
    id: 1,
    deceasedName: "テスト太郎",
    status: "受任",
    heirs: [],
    relatedParties: [],
    expenses: [],
} as unknown as InheritanceCase

describe("CASE_DETAIL_TABS", () => {
    it("7つのタブで、節は重複せず全部どこかに属する", () => {
        expect(CASE_DETAIL_TABS.map(tab => tab.id)).toEqual(["basic", "progress", "money", "expenses", "heirs", "relatedParties", "history"])
        const keys = CASE_DETAIL_TABS.flatMap(tab => [...tab.sectionKeys])
        expect(new Set(keys).size).toBe(keys.length)
        expect(new Set(keys)).toEqual(new Set(Object.keys(CASE_SECTION_ANCHORS)))
    })

    it("区分の並びは依頼のとおり", () => {
        expect(CASE_DETAIL_TABS.map(tab => [...tab.sectionKeys])).toEqual([
            ["basicInfo", "memo"],
            ["progress"],
            ["financial"],
            ["expenses"],
            ["heirs"],
            ["relatedParties"],
            ["auditLog"],
        ])
    })
})

describe("getTabForSectionKey / getTabForSectionAnchor", () => {
    it("節からタブを引ける", () => {
        expect(getTabForSectionKey("memo")).toBe("basic")
        expect(getTabForSectionKey("progress")).toBe("progress")
        expect(getTabForSectionKey("expenses")).toBe("expenses")
        expect(getTabForSectionKey("relatedParties")).toBe("relatedParties")
        expect(getTabForSectionKey("auditLog")).toBe("history")
    })

    it("知らない節は既定のタブ", () => {
        expect(getTabForSectionKey("unknown")).toBe(DEFAULT_CASE_DETAIL_TAB)
    })

    it("旧リンクのアンカーからタブを引ける（# は付いていても良い）", () => {
        expect(getTabForSectionAnchor("#case-progress")).toBe("progress")
        expect(getTabForSectionAnchor("case-financial")).toBe("money")
        expect(getTabForSectionAnchor("#case-heirs")).toBe("heirs")
        expect(getTabForSectionAnchor("#case-related-parties")).toBe("relatedParties")
        expect(getTabForSectionAnchor("#case-audit-log")).toBe("history")
    })

    it("知らないアンカーは null（スクロールも切り替えもしない）", () => {
        expect(getTabForSectionAnchor("")).toBeNull()
        expect(getTabForSectionAnchor("#other")).toBeNull()
    })
})

describe("resolveCaseDetailTab", () => {
    it("URL の値をそのまま使う", () => {
        expect(resolveCaseDetailTab("money")).toBe("money")
    })

    it("空・知らない値は既定のタブ", () => {
        expect(resolveCaseDetailTab(null)).toBe(DEFAULT_CASE_DETAIL_TAB)
        expect(resolveCaseDetailTab("")).toBe(DEFAULT_CASE_DETAIL_TAB)
        expect(resolveCaseDetailTab("nope")).toBe(DEFAULT_CASE_DETAIL_TAB)
    })

    it("新規登録では変更履歴を選べない", () => {
        const available = getAvailableCaseDetailTabs(true)
        expect(available.map(tab => tab.id)).toEqual(["basic", "progress", "money", "expenses", "heirs", "relatedParties"])
        expect(resolveCaseDetailTab("history", available)).toBe(DEFAULT_CASE_DETAIL_TAB)
        expect(resolveCaseDetailTab("heirs", available)).toBe("heirs")
    })

    it("isCaseDetailTabId は型の番人", () => {
        expect(isCaseDetailTabId("basic")).toBe(true)
        expect(isCaseDetailTabId("basics")).toBe(false)
        expect(isCaseDetailTabId(undefined)).toBe(false)
    })
})

describe("buildCaseDetailTabUrl / getCaseDetailTabHref", () => {
    it("既定のタブはパラメータを付けない", () => {
        expect(buildCaseDetailTabUrl("/354", "basic")).toBe("/354")
        expect(getCaseDetailTabHref(354, "basic")).toBe("/354")
    })

    it("それ以外は ?tab= を付ける", () => {
        expect(buildCaseDetailTabUrl("/354", "money")).toBe("/354?tab=money")
        expect(buildCaseDetailTabUrl("/354", "relatedParties")).toBe("/354?tab=relatedParties")
        expect(getCaseDetailTabHref(12, "history")).toBe("/12?tab=history")
    })
})

describe("getCaseDetailTabStatuses", () => {
    it("件数はそのタブにだけ出る", () => {
        const data = {
            ...baseCase,
            heirs: [{ id: 1 }, { id: 2 }],
            relatedParties: [{ id: 3 }],
            expenses: [{ id: 4 }],
        } as unknown as InheritanceCase
        const statuses = getCaseDetailTabStatuses(data, [], [])
        expect(statuses.heirs.counts).toEqual(["2人"])
        expect(statuses.relatedParties.counts).toEqual(["1人"])
        expect(statuses.expenses.counts).toEqual(["1件"])
        expect(statuses.basic.counts).toEqual([])
        expect(statuses.money.counts).toEqual([])
        expect(statuses.history.counts).toEqual([])
    })

    it("0件は出さない", () => {
        const statuses = getCaseDetailTabStatuses(baseCase, [], [])
        expect(statuses.heirs.counts).toEqual([])
        expect(statuses.relatedParties.counts).toEqual([])
        expect(statuses.expenses.counts).toEqual([])
    })

    it("未保存の変更はその節を含むタブに印が付く", () => {
        const statuses = getCaseDetailTabStatuses(baseCase, ["memo", "heirs"], [])
        expect(statuses.basic.hasChanges).toBe(true)
        expect(statuses.heirs.hasChanges).toBe(true)
        expect(statuses.relatedParties.hasChanges).toBe(false)
        expect(statuses.money.hasChanges).toBe(false)
        expect(statuses.history.hasChanges).toBe(false)
    })

    it("未入力はタブごとに数える", () => {
        const statuses = getCaseDetailTabStatuses(baseCase, [], [
            { sectionKey: "basicInfo" },
            { sectionKey: "memo" },
            { sectionKey: "progress" },
            { sectionKey: "financial" },
        ])
        expect(statuses.basic.missingCount).toBe(2)
        expect(statuses.progress.missingCount).toBe(1)
        expect(statuses.money.missingCount).toBe(1)
        expect(statuses.heirs.missingCount).toBe(0)
    })
})
