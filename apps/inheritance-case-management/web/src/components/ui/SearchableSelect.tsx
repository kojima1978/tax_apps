"use client"

import { ChevronDown, Search, X } from "lucide-react"
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import {
    filterSearchableOptionGroups,
    findSearchableOption,
    flattenSearchableOptions,
    type SearchableOptionGroup,
} from "@/lib/searchable-options"

/**
 * 検索して選ぶ選択欄。候補が数十件あるマスタ（担当者62人・9部署、最大の部署に25人）で使う。
 *
 * ネイティブの `<select>` だと候補を目で追うしか無く、キーボードの先頭一致も日本語では
 * 実質効かないため、氏名・部署で絞り込める形にしている。見出し（部署名・会社名）は
 * `<optgroup>` と同じ情報を落とさないよう候補の上に残す。
 *
 * 絞り込みと並びは `lib/searchable-options` 側（テストはそこに置いてある）。
 */
export function SearchableSelect({
    id, value, onChange, groups, placeholder, emptyOptionLabel = "未設定",
    searchPlaceholder = "氏名・部署で検索", ariaLabel, disabled = false,
}: {
    id: string
    value: string
    onChange: (value: string) => void
    groups: SearchableOptionGroup[]
    /** 未選択のときに欄へ出す文言（「担当者を選択」など）。 */
    placeholder: string
    /** 候補の先頭に出す「選択を外す」行の文言。 */
    emptyOptionLabel?: string
    searchPlaceholder?: string
    ariaLabel: string
    disabled?: boolean
}) {
    const selectedLabel = findSearchableOption(groups, value)?.label ?? ""
    const [query, setQuery] = useState("")
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const listboxId = `${id}-options`

    const filtered = useMemo(() => filterSearchableOptionGroups(groups, query), [groups, query])
    const flat = useMemo(() => flattenSearchableOptions(filtered), [filtered])
    const active = flat[activeIndex]

    const optionsRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (open) optionsRef.current?.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: "nearest" })
    }, [activeIndex, open])

    const choose = (optionValue: string) => {
        onChange(optionValue)
        setQuery("")
        setOpen(false)
    }

    const handleKeys = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowDown") {
            event.preventDefault()
            setOpen(true)
            setActiveIndex((index) => (open ? Math.min(index + 1, Math.max(flat.length - 1, 0)) : 0))
        } else if (event.key === "ArrowUp") {
            event.preventDefault()
            setOpen(true)
            setActiveIndex((index) => Math.max(index - 1, 0))
        } else if (event.key === "Enter" && open) {
            event.preventDefault()
            // 変換中の Enter は確定ではなく IME の確定なので拾わない
            if (!event.nativeEvent.isComposing && active) choose(active.value)
        } else if (event.key === "Escape") {
            event.preventDefault()
            setQuery("")
            setOpen(false)
        }
    }

    return (
        <div
            className="relative"
            onBlur={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
                setQuery("")
                setOpen(false)
            }}
        >
            <div className="flex h-11 w-full items-center gap-2 rounded-lg border-2 border-input bg-background px-3 py-0 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 sm:h-10">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                    id={id}
                    role="combobox"
                    aria-label={ariaLabel}
                    aria-expanded={open}
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    aria-activedescendant={open && active ? `${id}-option-${active.value}` : undefined}
                    autoComplete="off"
                    className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                    value={open ? query : selectedLabel}
                    placeholder={open ? searchPlaceholder : placeholder}
                    disabled={disabled}
                    onFocus={() => { setQuery(""); setOpen(true); setActiveIndex(0) }}
                    onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(0) }}
                    onKeyDown={handleKeys}
                />
                {value
                    ? <button
                        type="button"
                        className="shrink-0 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`${ariaLabel}の選択を解除`}
                        disabled={disabled}
                        onClick={() => { onChange(""); setQuery(""); setOpen(true) }}
                    ><X className="h-4 w-4" /></button>
                    : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
            </div>

            {open && (
                <div
                    ref={optionsRef}
                    id={listboxId}
                    role="listbox"
                    aria-label={`${ariaLabel}の候補`}
                    className="absolute left-0 top-full z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border bg-white p-1 shadow-lg"
                >
                    <button
                        type="button"
                        role="option"
                        aria-selected={value === ""}
                        className="min-h-11 w-full rounded-lg px-3 text-left text-sm text-muted-foreground hover:bg-slate-100 sm:min-h-9"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => choose("")}
                    >{emptyOptionLabel}</button>
                    {filtered.map((group) => (
                        <div key={group.label} role="group" aria-label={group.label || undefined}>
                            {group.label && <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-muted-foreground">{group.label}</p>}
                            {group.options.map((option) => (
                                <button
                                    key={option.value}
                                    id={`${id}-option-${option.value}`}
                                    type="button"
                                    role="option"
                                    aria-selected={option.value === value}
                                    data-active={option.value === active?.value}
                                    className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm hover:bg-blue-50 sm:min-h-9 ${option.value === value ? "bg-blue-50 font-semibold text-blue-800" : ""} ${option.value === active?.value ? "ring-2 ring-inset ring-blue-200" : ""}`}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onMouseEnter={() => setActiveIndex(flat.findIndex((candidate) => candidate.value === option.value))}
                                    onClick={() => choose(option.value)}
                                >
                                    <span>{option.label}</span>
                                    {option.hint && <span className="shrink-0 text-xs text-muted-foreground">{option.hint}</span>}
                                </button>
                            ))}
                        </div>
                    ))}
                    {filtered.length === 0 && <p className="p-3 text-sm text-muted-foreground">該当する候補がありません</p>}
                </div>
            )}
        </div>
    )
}
