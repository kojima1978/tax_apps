import { describe, expect, it } from "vitest"
import type { InheritanceCase } from "@/types/shared"
import { getCaseApiPayload, hasInvalidExpense } from "./edit-case-form-utils"

const caseData: InheritanceCase = {
    id: 1,
    deceasedName: "確認用",
    dateOfDeath: "2026-01-01",
    fiscalYear: 2026,
    status: "見積前",
    taxAmount: 0,
    feeAmount: 0,
    estimateAmount: 0,
    propertyValue: 0,
    referralFeeAmount: 0,
    estimateReferralFeeAmount: 0,
}

describe("立替金の保存前チェック", () => {
    it("内容がない金額入力済みの行を不正と判定する", () => {
        expect(hasInvalidExpense({
            ...caseData,
            expenses: [{ id: 1, sortOrder: 0, date: "2026-10-19", description: "", amount: 1000 }],
        })).toBe(true)
    })

    it("内容がない備考入力済みの行を不正と判定する", () => {
        expect(hasInvalidExpense({
            ...caseData,
            expenses: [{ id: 1, sortOrder: 0, date: "2026-10-19", description: " ", amount: 0, memo: "郵便局" }],
        })).toBe(true)
    })

    it("空の追加行は保存対象外として許容する", () => {
        expect(hasInvalidExpense({
            ...caseData,
            expenses: [{ id: 1, sortOrder: 0, date: "2026-10-19", description: "", amount: 0 }],
        })).toBe(false)
    })

    it("内容が入力済みの行は有効と判定する", () => {
        expect(hasInvalidExpense({
            ...caseData,
            expenses: [{ id: 1, sortOrder: 0, date: "2026-10-19", description: "交通費", amount: 1000 }],
        })).toBe(false)
    })

    it("空白だけの内容は保存 payload から除外する", () => {
        const payload = getCaseApiPayload({
            ...caseData,
            expenses: [{ id: 1, sortOrder: 0, date: "2026-10-19", description: " ", amount: 0 }],
        })

        expect(payload.expenses).toEqual([])
    })
})
