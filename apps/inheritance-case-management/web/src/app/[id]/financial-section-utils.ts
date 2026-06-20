import type { CaseSpecialAdditionItem, InheritanceCase } from "@/types/shared"

export type EstimateCountKey = "landRosenkaCount" | "landBairitsuCount" | "unlistedStockCount" | "feeCalculationHeirCount"

export const ESTIMATE_COUNT_FIELDS: { key: EstimateCountKey; label: string; suffix: string }[] = [
    { key: "landRosenkaCount", label: "土地数（路線価）", suffix: "区分" },
    { key: "landBairitsuCount", label: "土地数（倍率）", suffix: "区分" },
    { key: "unlistedStockCount", label: "非上場株式", suffix: "社" },
    { key: "feeCalculationHeirCount", label: "報酬計算上の相続人数", suffix: "名" },
]

export function getEstimateParams(formData: InheritanceCase) {
    return {
        propertyValue: formData.propertyValue || 0,
        landRosenkaCount: formData.landRosenkaCount || 0,
        landBairitsuCount: formData.landBairitsuCount || 0,
        unlistedStockCount: formData.unlistedStockCount || 0,
        heirCount: formData.feeCalculationHeirCount || 0,
    }
}

export function parseEstimateCount(rawValue: string): number {
    return rawValue === "" ? 0 : Math.max(0, Number.parseInt(rawValue, 10) || 0)
}

export function getSpecialAdditions(formData: InheritanceCase): CaseSpecialAdditionItem[] {
    return (formData.specialAdditions || []).slice(0, 2)
}

export function getSpecialAdditionsTotal(specialAdditions: CaseSpecialAdditionItem[]): number {
    return specialAdditions.reduce((sum, addition) => sum + (addition.amount || 0), 0)
}

export function normalizeSpecialAdditions(specialAdditions: CaseSpecialAdditionItem[]): CaseSpecialAdditionItem[] {
    return specialAdditions.map((addition, index) => ({
        ...addition,
        id: addition.id || 0,
        sortOrder: index,
    }))
}

export function getReferralAmount(baseAmount: number, referralFeeRate?: number | null): number {
    const rate = referralFeeRate || 0
    return Math.floor(baseAmount * (rate / 100))
}
