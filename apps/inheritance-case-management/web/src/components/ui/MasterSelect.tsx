"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Label } from "./Label"
import { SearchableSelect } from "./SearchableSelect"
import { buildSearchableOptionGroups } from "@/lib/searchable-options"

interface GroupConfig<T> {
    key: (item: T) => string
    sortOrder: (item: T) => number
}

interface MasterSelectProps<T extends { id: number; active: boolean }> {
    id: string
    label: string
    value: string | number | null | undefined
    items: T[]
    placeholder: string
    editHref: string
    editLabel: string
    /** 候補1件の表示。`hint` は右に小さく出し、検索の対象にも入る（部署名など）。 */
    renderOption: (item: T) => { value: string | number; label: string; hint?: string }
    onChange: (value: string) => void
    onEditNavigate?: () => void
    groupBy?: GroupConfig<T>
}

/**
 * マスタ（担当者・紹介者など）から1件選ぶ欄。中身は検索付きの {@link SearchableSelect}。
 *
 * 候補が数十件に増えるとネイティブの `<select>` では目で探すしか無くなるため、
 * 氏名・部署で絞り込める形にしている。
 */
export function MasterSelect<T extends { id: number; active: boolean }>({
    id, label, value, items, placeholder, editHref, editLabel, renderOption, onChange, onEditNavigate, groupBy,
}: MasterSelectProps<T>) {
    const current = value == null ? "" : String(value)

    // 退職者などは候補から外すが、いま選ばれている人は外さない（選択が黙って消えないため）
    const visibleItems = useMemo(
        () => items.filter(item => item.active !== false || String(renderOption(item).value) === current),
        [items, renderOption, current],
    )

    const groups = useMemo(() => buildSearchableOptionGroups(visibleItems, {
        group: (item) => groupBy ? groupBy.key(item) : "",
        groupOrder: groupBy ? (item) => groupBy.sortOrder(item) : undefined,
        option: (item) => {
            const option = renderOption(item)
            return { value: String(option.value), label: option.label, hint: option.hint }
        },
    }), [visibleItems, groupBy, renderOption])

    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-xs">{label}</Label>
            <SearchableSelect
                id={id}
                ariaLabel={label}
                value={current}
                groups={groups}
                placeholder={placeholder}
                onChange={onChange}
            />
            <div className="text-right text-[11px]">
                <Link href={editHref} onClick={onEditNavigate} className="text-muted-foreground hover:underline hover:text-primary">
                    {editLabel}
                </Link>
            </div>
        </div>
    )
}
