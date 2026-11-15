import { describe, it, expect } from "vitest"
import {
    administrativeFeeRowTotal,
    administrativeFeeTotal,
    resolveAdministrativeDiscount,
} from "./administrative-fee-calc"

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

describe("resolveAdministrativeDiscount", () => {
    const fees = [{ quantity: 1, unitPrice: 30000 }, { quantity: 2, unitPrice: 5000 }]

    it("値引かない設定なら0円（明細があっても引かない）", () => {
        expect(resolveAdministrativeDiscount({ administrativeDiscountEnabled: false, administrativeFees: fees })).toBe(0)
    })

    it("設定が無い案件（既存データ）も0円", () => {
        expect(resolveAdministrativeDiscount({ administrativeFees: fees })).toBe(0)
    })

    it("自動（金額が null）なら明細の合計と同額", () => {
        expect(resolveAdministrativeDiscount({
            administrativeDiscountEnabled: true,
            administrativeDiscountAmount: null,
            administrativeFees: fees,
        })).toBe(40000)
    })

    it("明細を足すと自動の値引額も追従する", () => {
        const src = { administrativeDiscountEnabled: true, administrativeDiscountAmount: null, administrativeFees: [...fees] }
        expect(resolveAdministrativeDiscount(src)).toBe(40000)
        src.administrativeFees.push({ quantity: 1, unitPrice: 8000 })
        expect(resolveAdministrativeDiscount(src)).toBe(48000)
    })

    it("手入力の金額があればその額で固定（一部だけ値引く）", () => {
        expect(resolveAdministrativeDiscount({
            administrativeDiscountEnabled: true,
            administrativeDiscountAmount: 20000,
            administrativeFees: fees,
        })).toBe(20000)
    })

    it("手入力の0円は「引かない」として扱う（自動へ戻さない）", () => {
        expect(resolveAdministrativeDiscount({
            administrativeDiscountEnabled: true,
            administrativeDiscountAmount: 0,
            administrativeFees: fees,
        })).toBe(0)
    })

    it("マイナスは0へ寄せる（報酬が増えないように）", () => {
        expect(resolveAdministrativeDiscount({
            administrativeDiscountEnabled: true,
            administrativeDiscountAmount: -5000,
            administrativeFees: fees,
        })).toBe(0)
    })

    it("自動で明細が無ければ0円", () => {
        expect(resolveAdministrativeDiscount({ administrativeDiscountEnabled: true, administrativeDiscountAmount: null })).toBe(0)
    })
})
