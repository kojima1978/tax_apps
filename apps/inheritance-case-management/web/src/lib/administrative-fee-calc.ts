import type { AdministrativeFee } from "@/types/shared"

/**
 * 遺産整理業務の報酬の集計と、相続税申告の報酬から引く値引額の決め方。
 *
 * 画面（遺産整理タブ・報酬タブ）と帳票（見積書・請求書）とバックアップの
 * どれからも同じ答えになるよう、計算はここ1か所だけに置く。
 */

/** 1行の小計（件数 × 単価） */
export function administrativeFeeRowTotal(fee: Pick<AdministrativeFee, "quantity" | "unitPrice">): number {
    return (fee.quantity || 0) * (fee.unitPrice || 0)
}

/** 遺産整理業務の報酬の合計 */
export function administrativeFeeTotal(fees: Pick<AdministrativeFee, "quantity" | "unitPrice">[]): number {
    return fees.reduce((sum, fee) => sum + administrativeFeeRowTotal(fee), 0)
}

export interface AdministrativeDiscountSource {
    administrativeDiscountEnabled?: boolean | null
    /** null/undefined = 明細の合計と同額（自動）、数値 = 手入力で固定 */
    administrativeDiscountAmount?: number | null
    administrativeFees?: Pick<AdministrativeFee, "quantity" | "unitPrice">[] | null
}

/**
 * 遺産整理業務分の値引額。
 *
 * 値引かない設定なら0。手入力の値があればそれ（マイナスは0へ寄せる）。
 * 無ければ明細の合計と同額＝明細を足すと自動で追従する。
 */
export function resolveAdministrativeDiscount(src: AdministrativeDiscountSource): number {
    if (!src.administrativeDiscountEnabled) return 0
    const manual = src.administrativeDiscountAmount
    if (manual !== null && manual !== undefined) return Math.max(0, Math.round(manual))
    return administrativeFeeTotal(src.administrativeFees || [])
}
