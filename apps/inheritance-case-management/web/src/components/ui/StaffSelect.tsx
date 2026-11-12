"use client"

import { ChevronDown, Search, X } from "lucide-react"
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { readRecentIds, rememberRecent } from "@/shared/staff-directory/assignee"
import { copyLinkTroubleMessage, useCopyLinkTrouble } from "@/shared/staff-directory/linkHealth"
import { useOperator } from "@/shared/staff-directory/operator"
import { buildStaffPickerSections, flattenStaffPickerRows, markOf } from "@/lib/staff-picker"
import type { Assignee } from "@/types/shared"

/** link-health の写しの状態を引くときのアプリ名（社員台帳の server/linkedApps.ts と同じ） */
const LINK_APP = "itcm"

/**
 * 担当者・社内紹介者を選ぶ欄。振る舞いは社員台帳を使う他のアプリ（担当者ダイアログ・PB の担当者欄）と
 * そろえる ── 検索（空白区切り・部署も）・部署ごと・先頭に「自分（操作者）」「最近選んだ人」・退職予定の印・
 * 写しが古いときの注意。中身は lib/staff-picker.ts（共通の関数を通す）、ここは見た目だけ。
 *
 * 返す値は案件管理の写しの ID（`Assignee.id`）。保存の形は変えない。
 * `quick` は担当者だけ（社内紹介者は選ぶ相手が違うので、自分・最近は出さず、最近の控えにも入れない）。
 */
export function StaffSelect({ id, label, value, assignees, onChange, placeholder, quick = false }: {
    id: string
    label: string
    value: string
    assignees: Assignee[]
    onChange: (value: string) => void
    placeholder: string
    quick?: boolean
}) {
    const { selected: me, operators, status } = useOperator()
    const trouble = useCopyLinkTrouble(LINK_APP)
    const [query, setQuery] = useState("")
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    // localStorage はブラウザでしか読めないので、開いたときに読む（サーバーで描く1回目と食い違わせない）
    const [recentIds, setRecentIds] = useState<number[]>([])
    const listboxId = `${id}-options`
    const optionsRef = useRef<HTMLDivElement>(null)

    const selected = assignees.find((a) => String(a.id) === value) ?? null
    // 退職予定の印に使う退職日は台帳から（写しには持たない）。台帳が止まっていれば印は出せない
    const retiredOnByDirectoryId = useMemo(
        () => new Map(status === "ok" ? operators.flatMap((o) => o.id === null ? [] : [[o.id, o.retiredOn] as const]) : []),
        [operators, status],
    )
    const meId = status === "ok" ? me?.id ?? null : null
    const sectionsFor = (text: string, recent: readonly number[]) => buildStaffPickerSections(assignees, {
        query: text,
        value,
        quick: quick ? { meId, recentIds: recent } : undefined,
        retiredOnByDirectoryId,
    })
    const sections = sectionsFor(query, recentIds)
    const flat = flattenStaffPickerRows(sections)
    const active = flat[activeIndex]
    // 閉じているときも、今の人が退職・退職予定なら欄の中に印を出す（案件を開いた時点で気づけるように）
    const selectedMark = selected ? markOf(selected, retiredOnByDirectoryId) : ""

    useEffect(() => {
        if (!open) return
        if (activeIndex === 0 && optionsRef.current) optionsRef.current.scrollTop = 0
        else optionsRef.current?.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: "nearest" })
    }, [activeIndex, open, query])

    /** 開くときは今の人にカーソルを置く（60人を超えると、先頭からではどこにいるか分からない） */
    function openList() {
        const recent = quick ? readRecentIds() : []
        setRecentIds(recent)
        setQuery("")
        setOpen(true)
        setActiveIndex(Math.max(flattenStaffPickerRows(sectionsFor("", recent)).findIndex((row) => String(row.assignee.id) === value), 0))
    }

    function choose(assignee: Assignee | null) {
        onChange(assignee ? String(assignee.id) : "")
        setQuery("")
        setOpen(false)
        // 最近選んだ人は全アプリ共通で台帳ID を控える（担当者のときだけ・台帳に居ない行は控えない）
        if (quick && assignee?.staffDirectoryId != null) rememberRecent(assignee.staffDirectoryId)
    }

    function handleKeys(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown") {
            event.preventDefault()
            if (!open) openList()
            else setActiveIndex((index) => Math.min(index + 1, Math.max(flat.length - 1, 0)))
        } else if (event.key === "ArrowUp") {
            event.preventDefault()
            if (!open) openList()
            else setActiveIndex((index) => Math.max(index - 1, 0))
        } else if (event.key === "Enter" && open) {
            event.preventDefault()
            // 変換中の Enter は IME の確定なので拾わない
            if (!event.nativeEvent.isComposing && active) choose(active.assignee)
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
                    aria-label={label}
                    aria-expanded={open}
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    aria-activedescendant={open && active ? `${id}-option-${active.key}` : undefined}
                    autoComplete="off"
                    className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                    value={open ? query : selected?.name ?? ""}
                    placeholder={open ? "氏名・部署で検索（空白で区切って絞り込み）" : placeholder}
                    onFocus={openList}
                    onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(0) }}
                    onKeyDown={handleKeys}
                />
                {!open && selectedMark ? <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">{selectedMark}</span> : null}
                {value
                    ? <button
                        type="button"
                        className="shrink-0 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`${label}の選択を解除`}
                        onClick={() => { onChange(""); setQuery("") }}
                    ><X className="h-4 w-4" /></button>
                    : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
            </div>

            {open && (
                <div
                    ref={optionsRef}
                    id={listboxId}
                    role="listbox"
                    aria-label={`${label}の候補`}
                    className="absolute left-0 top-full z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border bg-white p-1 shadow-lg"
                >
                    <button
                        type="button"
                        role="option"
                        aria-selected={value === ""}
                        className="min-h-11 w-full rounded-lg px-3 text-left text-sm text-muted-foreground hover:bg-slate-100 sm:min-h-9"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => choose(null)}
                    >未設定</button>
                    {sections.map((section) => section.rows.length === 0 ? null : (
                        <div key={`${section.kind}-${section.label}`} role="group" aria-label={section.label}>
                            <p className="flex items-baseline justify-between px-3 pt-2 pb-1 text-[11px] font-semibold text-muted-foreground" aria-hidden="true">
                                <span>{section.label}</span>
                                {section.showCount ? <span className="font-normal">{section.rows.length}人</span> : null}
                            </p>
                            {section.rows.map((row) => {
                                const index = flat.indexOf(row)
                                const isSelected = String(row.assignee.id) === value
                                return (
                                    <button
                                        key={row.key}
                                        id={`${id}-option-${row.key}`}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        data-active={index === activeIndex}
                                        className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-blue-50 sm:min-h-9 ${isSelected ? "bg-blue-50 font-semibold text-blue-800" : ""} ${index === activeIndex ? "ring-2 ring-inset ring-blue-200" : ""}`}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        onClick={() => choose(row.assignee)}
                                    >
                                        <span className="min-w-0 truncate">{row.assignee.name}</span>
                                        {row.mark ? <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">{row.mark}</span> : null}
                                        {row.detail ? <span className="ml-auto shrink-0 text-xs text-muted-foreground">{row.detail}</span> : null}
                                    </button>
                                )
                            })}
                        </div>
                    ))}
                    {flat.length === 0 && <p className="p-3 text-sm text-muted-foreground">一致する人がいません</p>}
                    {status === "fallback" && (
                        <p className="p-3 text-xs text-muted-foreground">
                            社員台帳に接続できないため、{quick ? "自分（操作者）と" : ""}退職予定の印は出ていません（一覧は案件管理の写しから選べます）。
                        </p>
                    )}
                </div>
            )}
            {trouble ? <p role="status" className="mt-1 text-[11px] leading-snug text-amber-800">{copyLinkTroubleMessage(trouble)}</p> : null}
        </div>
    )
}
