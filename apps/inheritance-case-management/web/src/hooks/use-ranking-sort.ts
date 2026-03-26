import { useState, useMemo, useCallback } from "react"
import { pinBottomCompare } from "@/lib/analytics-utils"

type SortCol = "feeTotal" | "count" | "name"
type RankingItem = { name: string; feeTotal: number; count: number }

interface RankingSortState {
    col: SortCol
    desc: boolean
}

export function useRankingSort(data: RankingItem[], initialCol: SortCol = "count") {
    const [sort, setSort] = useState<RankingSortState>({ col: initialCol, desc: true })

    const sorted = useMemo(() => {
        return [...data].sort((a, b) => {
            const pin = pinBottomCompare(a.name, b.name)
            if (pin !== 0) return pin

            const { col, desc } = sort
            const res = col === "name" ? a.name.localeCompare(b.name, "ja") : a[col] - b[col]
            return desc ? -res : res
        })
    }, [data, sort])

    const handleSort = useCallback((col: string) => {
        setSort(prev => ({
            col: col as SortCol,
            desc: prev.col === col ? !prev.desc : true,
        }))
    }, [])

    return { sorted, sort, handleSort }
}
