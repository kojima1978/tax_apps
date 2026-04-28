import type { InheritanceCase } from "@/types/shared"

export function calcGrossAmount(c: InheritanceCase, baseType: "fee" | "estimate"): number {
    return baseType === "fee" ? (c.feeAmount || 0) : (c.estimateAmount || 0)
}

export function calcBestGrossAmount(c: InheritanceCase): number {
    return (c.feeAmount || 0) > 0 ? calcGrossAmount(c, "fee") : calcGrossAmount(c, "estimate")
}
