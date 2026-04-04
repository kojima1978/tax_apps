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

/** 西暦年→和暦文字列（例: "令和7年"） */
export function toWareki(date: string | Date): string {
    const d = new Date(date)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()

    let era: string
    let eraYear: number

    if (y > 2019 || (y === 2019 && m > 5) || (y === 2019 && m === 5 && day >= 1)) {
        era = "令和"
        eraYear = y - 2018
    } else if (y > 1989 || (y === 1989 && m > 1) || (y === 1989 && m === 1 && day >= 8)) {
        era = "平成"
        eraYear = y - 1988
    } else if (y > 1926 || (y === 1926 && m === 12 && day >= 25)) {
        era = "昭和"
        eraYear = y - 1925
    } else if (y > 1912 || (y === 1912 && m > 7) || (y === 1912 && m === 7 && day >= 30)) {
        era = "大正"
        eraYear = y - 1911
    } else {
        era = "明治"
        eraYear = y - 1867
    }

    return `${era}${eraYear === 1 ? "元" : eraYear}年`
}

/** 日付を「2025年4月3日（令和7年）」形式でフォーマット */
export function formatDateWithWareki(date: string | Date): string {
    return `${formatDate(date)}（${toWareki(date)}）`
}
