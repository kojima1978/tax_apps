import type { InheritanceCase } from "@/types/shared"

type CaseAmountSource = Pick<InheritanceCase, "feeAmount" | "estimateAmount">

export function calcGrossAmount(c: CaseAmountSource, baseType: "fee" | "estimate"): number {
    return baseType === "fee" ? (c.feeAmount || 0) : (c.estimateAmount || 0)
}

export function calcBestGrossAmount(c: CaseAmountSource): number {
    return (c.feeAmount || 0) > 0 ? calcGrossAmount(c, "fee") : calcGrossAmount(c, "estimate")
}
