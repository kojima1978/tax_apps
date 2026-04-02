import type { InheritanceCase } from "@/types/shared"

/** 確定/見込のうち適切な方のネット売上を返す */
export function calcBestNet(c: InheritanceCase): number {
    return (c.feeAmount || 0) > 0 ? calcNet(c, "fee") : calcNet(c, "estimate")
}

export function calcNet(c: InheritanceCase, baseType: "fee" | "estimate"): number {
    const base = baseType === "fee" ? (c.feeAmount || 0) : (c.estimateAmount || 0)
    let referral = c.referralFeeAmount || 0

    if (baseType === "estimate" && referral === 0 && c.referralFeeRate && c.referralFeeRate > 0) {
        referral = Math.floor(base * (c.referralFeeRate / 100))
    }

    return base - referral
}

export const LABEL_NONE = "なし"
export const LABEL_UNSET = "未設定"

/** 「なし」「未設定」を末尾に固定するための比較ヘルパー（0=同等, 1=aが下, -1=bが下） */
export function pinBottomCompare(a: string, b: string): number {
    const aBottom = a === LABEL_NONE || a === LABEL_UNSET
    const bBottom = b === LABEL_NONE || b === LABEL_UNSET
    if (aBottom === bBottom) return 0
    return aBottom ? 1 : -1
}

const currencyFormatter = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" })

export function formatCurrency(amount: number): string {
    return currencyFormatter.format(amount)
}

/** 日付をja-JPロケールでフォーマット */
export function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString("ja-JP")
}
