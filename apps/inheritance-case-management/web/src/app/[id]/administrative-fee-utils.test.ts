import { describe, it, expect } from "vitest"
import {
    administrativeFeeRowTotal,
    administrativeFeeTotal,
    emptyAdministrativeFeeRow,
    feeItemToRow,
    groupFeeItemsByCategory,
} from "./administrative-fee-utils"
import type { AdministrativeFeeItem } from "@/types/shared"

const item = (id: number, category: string, name: string, unitPrice: number, extra: Partial<AdministrativeFeeItem> = {}): AdministrativeFeeItem => ({
    id, category, categoryOrder: 0, name, unitPrice, note: null, sortOrder: id, active: true, ...extra,
})

describe("administrativeFeeRowTotal / administrativeFeeTotal", () => {
    it("件数 × 単価で小計を出す", () => {
        expect(administrativeFeeRowTotal({ quantity: 3, unitPrice: 2000 })).toBe(6000)
    })

    it("件数0・単価0は0円（欄を空にした行で NaN にしない）", () => {
        expect(administrativeFeeRowTotal({ quantity: 0, unitPrice: 8000 })).toBe(0)
        expect(administrativeFeeRowTotal({ quantity: 2, unitPrice: 0 })).toBe(0)
    })

    it("合計は各行の小計の足し上げ", () => {
        expect(administrativeFeeTotal([
            { quantity: 1, unitPrice: 4000 },
            { quantity: 3, unitPrice: 2000 },
            { quantity: 1, unitPrice: 20000 },
        ])).toBe(30000)
    })

    it("明細が無ければ0円", () => {
        expect(administrativeFeeTotal([])).toBe(0)
    })
})

describe("feeItemToRow", () => {
    it("料金表の値を写し、件数1で足す", () => {
        expect(feeItemToRow(item(7, "金融機関", "残高証明書（1金融機関）", 8000))).toEqual({
            feeItemId: 7,
            category: "金融機関",
            name: "残高証明書（1金融機関）",
            quantity: 1,
            unitPrice: 8000,
            memo: null,
        })
    })
})

describe("groupFeeItemsByCategory", () => {
    it("分類ごとにまとめ、料金表の分類の並びで返す", () => {
        const groups = groupFeeItemsByCategory([
            item(1, "その他", "未登記家屋届出", 8000),
            item(2, "戸籍収集", "被相続人", 4000),
            item(3, "戸籍収集", "相続人1人につき", 2000),
        ])
        expect(groups.map(g => g.category)).toEqual(["戸籍収集", "その他"])
        expect(groups[0].items.map(i => i.id)).toEqual([2, 3])
    })

    it("使わなくした行（active:false）は出さない", () => {
        const groups = groupFeeItemsByCategory([
            item(1, "戸籍収集", "被相続人", 4000),
            item(2, "戸籍収集", "やめた手続き", 1000, { active: false }),
        ])
        expect(groups[0].items.map(i => i.id)).toEqual([1])
    })

    it("料金表に無い分類は末尾へ", () => {
        const groups = groupFeeItemsByCategory([
            item(1, "独自の分類", "何か", 1000),
            item(2, "戸籍収集", "被相続人", 4000),
        ])
        expect(groups.map(g => g.category)).toEqual(["戸籍収集", "独自の分類"])
    })
})

describe("emptyAdministrativeFeeRow", () => {
    it("料金表に紐づかない自由行は feeItemId が null", () => {
        expect(emptyAdministrativeFeeRow()).toEqual({ feeItemId: null, category: "", name: "", quantity: 1, unitPrice: 0, memo: null })
        expect(emptyAdministrativeFeeRow("その他").category).toBe("その他")
    })
})
