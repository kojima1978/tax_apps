import { describe, expect, it } from "vitest"
import type { InheritanceCase } from "@/types/shared"
import { getChangedCaseSections, getMissingCaseInputs } from "./case-workspace-utils"

const caseData: InheritanceCase = {
    id: 1, deceasedName: "確認用", dateOfDeath: "2026-01-01", fiscalYear: 2026,
    status: "見積前", feeAmount: 0, assigneeId: 1, heirs: [], expenses: [],
    taxAmount: 0, estimateAmount: 0, propertyValue: 0, referralFeeAmount: 0, estimateReferralFeeAmount: 0,
}

describe("案件の入力チェックと保存状態", () => {
    it("見積前には未到達の請求・入金日を求めず、入金済では不足日付を示す", () => {
        expect(getMissingCaseInputs(caseData)).toEqual([])
        const paid = { ...caseData, status: "入金済" as const }
        const missing = getMissingCaseInputs(paid)
        expect(missing.map(item => item.label)).toEqual(expect.arrayContaining(["入金日未入力", "請求日未入力", "報酬額未入力", "相続人未登録"]))
        expect(getMissingCaseInputs({ ...paid, paidDate: "2026-02-01", feeAmount: 100000 }).map(item => item.label)).not.toContain("入金日未入力")
    })
    it("別のセクションの入力・取り消し・保存をそれぞれ識別する", () => {
        const changed = { ...caseData, feeAmount: 50000, memo: "変更" }
        expect(getChangedCaseSections(changed, caseData)).toEqual(["financial", "memo"])
        expect(getChangedCaseSections({ ...changed, memo: caseData.memo }, caseData)).toEqual(["financial"])
        expect(getChangedCaseSections(changed, changed)).toEqual([])
    })
})
