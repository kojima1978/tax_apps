import { administrativeFeeCategoryOrder } from "@/lib/constants/administrative-fees"
import type { AdministrativeFee, AdministrativeFeeItem } from "@/types/shared"

// 合計・値引額の計算は帳票やバックアップからも使うので @/lib/administrative-fee-calc にある

/** 料金表の1行 → 案件の明細の1行（分類・内容・単価はこの時点の値を写す） */
export function feeItemToRow(item: AdministrativeFeeItem): AdministrativeFee {
    return {
        feeItemId: item.id,
        category: item.category,
        name: item.name,
        quantity: 1,
        unitPrice: item.unitPrice,
        memo: null,
    }
}

export interface AdministrativeFeeCategoryGroup {
    category: string
    items: AdministrativeFeeItem[]
}

/** 料金表を分類ごとにまとめる（分類の並びは料金表の並び） */
export function groupFeeItemsByCategory(items: AdministrativeFeeItem[]): AdministrativeFeeCategoryGroup[] {
    const groups = new Map<string, AdministrativeFeeItem[]>()
    for (const item of items) {
        if (!item.active) continue
        const list = groups.get(item.category)
        if (list) list.push(item)
        else groups.set(item.category, [item])
    }
    return [...groups.entries()]
        .map(([category, groupItems]) => ({ category, items: groupItems }))
        .sort((a, b) => administrativeFeeCategoryOrder(a.category) - administrativeFeeCategoryOrder(b.category))
}

/** 空の自由行（料金表に無い手続きを手で足すとき） */
export function emptyAdministrativeFeeRow(category = ""): AdministrativeFee {
    return { feeItemId: null, category, name: "", quantity: 1, unitPrice: 0, memo: null }
}
