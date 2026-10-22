import { useState, useMemo } from "react"
import Link from "next/link"
import { Label } from "@/components/ui/Label"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { buildSearchableOptionGroups } from "@/lib/searchable-options"
import type { InheritanceCase, Assignee, Referrer } from "@/types/shared"
import { REFERRER_MODE_OPTIONS } from "@/types/constants"

type ReferrerMode = "none" | "internal" | "external"

interface ReferrerToggleSelectProps {
    formData: InheritanceCase
    assignees: Assignee[]
    referrers: Referrer[]
    returnToPath: string
    setFormData: React.Dispatch<React.SetStateAction<InheritanceCase>>
    onMasterEditNavigate?: () => void
}

export function ReferrerToggleSelect({
    formData, assignees, referrers, returnToPath, setFormData, onMasterEditNavigate
}: ReferrerToggleSelectProps) {
    const initialMode: ReferrerMode = formData.referrerId ? "external"
        : formData.internalReferrerId ? "internal" : "none"
    const [mode, setMode] = useState<ReferrerMode>(initialMode)

    // 退職・廃止は候補から外すが、いま選ばれているものは外さない（選択が黙って消えないため）
    const internalId = formData.internalReferrerId ?? null
    const externalId = formData.referrerId ?? null

    const internalGroups = useMemo(() => buildSearchableOptionGroups(
        assignees.filter(a => a.active !== false || a.id === internalId),
        {
            group: (a) => a.department?.name || "部門なし",
            groupOrder: (a) => a.department?.sortOrder ?? Number.MAX_SAFE_INTEGER,
            option: (a) => ({ value: String(a.id), label: a.name, hint: a.department?.name }),
        },
    ), [assignees, internalId])

    const externalGroups = useMemo(() => buildSearchableOptionGroups(
        referrers.filter(r => r.active !== false || r.id === externalId),
        {
            group: (r) => r.company.name,
            // 支店名だけでは閉じているときに会社が分からないので、会社名込みで出す
            option: (r) => ({
                value: String(r.id),
                label: r.branch?.name ? `${r.company.name} / ${r.branch.name}` : r.company.name,
            }),
        },
    ), [referrers, externalId])

    const handleModeSwitch = (newMode: ReferrerMode) => {
        if (newMode === mode) return
        setMode(newMode)
        setFormData(prev => ({
            ...prev,
            internalReferrerId: null,
            referrerId: null,
        }))
    }

    return (
        <div className="space-y-1.5">
            <div className="flex items-baseline gap-2">
                <Label className="shrink-0 text-xs">紹介者</Label>
                <div className="inline-flex gap-px bg-muted rounded p-px">
                    {REFERRER_MODE_OPTIONS.map(({ value: m, label }) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => handleModeSwitch(m)}
                            className={`px-2 py-0.5 text-[11px] leading-tight font-medium rounded-sm transition-colors cursor-pointer ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50"}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {mode === "internal" ? (
                <>
                    <SearchableSelect
                        id="internalReferrerId"
                        ariaLabel="社内紹介者"
                        value={internalId == null ? "" : String(internalId)}
                        groups={internalGroups}
                        placeholder="社内紹介者を選択"
                        onChange={(value) => setFormData(prev => ({ ...prev, internalReferrerId: value ? Number(value) : null }))}
                    />
                    <div className="text-right text-[11px]">
                        <Link href={`/settings/staff?returnTo=${returnToPath}`} onClick={onMasterEditNavigate} className="text-muted-foreground hover:underline hover:text-primary">
                            担当者を追加・編集
                        </Link>
                    </div>
                </>
            ) : mode === "external" ? (
                <>
                    <SearchableSelect
                        id="referrerId"
                        ariaLabel="社外紹介者"
                        value={externalId == null ? "" : String(externalId)}
                        groups={externalGroups}
                        placeholder="社外紹介者を選択"
                        searchPlaceholder="会社名・支店名で検索"
                        onChange={(value) => setFormData(prev => ({ ...prev, referrerId: value ? Number(value) : null }))}
                    />
                    <div className="text-right text-[11px]">
                        <Link href={`/settings/referral-sources?returnTo=${returnToPath}`} onClick={onMasterEditNavigate} className="text-muted-foreground hover:underline hover:text-primary">
                            紹介元を追加・編集
                        </Link>
                    </div>
                </>
            ) : null}
        </div>
    )
}
