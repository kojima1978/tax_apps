import { useState, useMemo } from "react"
import Link from "next/link"
import { Label } from "@/components/ui/Label"
import { SelectField } from "@/components/ui/SelectField"
import type { InheritanceCase, Assignee, Referrer } from "@/types/shared"
import { REFERRER_MODE_OPTIONS } from "@/types/constants"

type ReferrerMode = "none" | "internal" | "external"

interface ReferrerToggleSelectProps {
    formData: InheritanceCase
    assignees: Assignee[]
    referrers: Referrer[]
    returnToPath: string
    setFormData: React.Dispatch<React.SetStateAction<InheritanceCase>>
}

export function ReferrerToggleSelect({
    formData, assignees, referrers, returnToPath, setFormData
}: ReferrerToggleSelectProps) {
    const initialMode: ReferrerMode = formData.referrerId ? "external"
        : formData.internalReferrerId ? "internal" : "none"
    const [mode, setMode] = useState<ReferrerMode>(initialMode)

    const activeAssignees = useMemo(() => assignees.filter(a => a.active !== false), [assignees])

    const grouped = useMemo(() => {
        const map = new Map<string, { sortOrder: number; members: Assignee[] }>()
        for (const a of activeAssignees) {
            const dept = a.department?.name || "部門なし"
            const sortOrder = a.department?.sortOrder ?? Number.MAX_SAFE_INTEGER
            if (!map.has(dept)) map.set(dept, { sortOrder, members: [] })
            map.get(dept)!.members.push(a)
        }
        return [...map.entries()]
            .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
            .map(([dept, { members }]) => [dept, members.sort((a, b) => a.id - b.id)] as const)
    }, [activeAssignees])

    const groupedReferrers = useMemo(() => {
        const active = referrers.filter(r => r.active !== false)
        const map = new Map<string, Referrer[]>()
        for (const r of active) {
            const companyName = r.company.name
            if (!map.has(companyName)) map.set(companyName, [])
            map.get(companyName)!.push(r)
        }
        return [...map.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, members]) => [name, members.sort((a, b) => (a.branch?.name || "").localeCompare(b.branch?.name || ""))] as const)
    }, [referrers])

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
        <div className="space-y-2">
            <div className="flex items-baseline gap-2">
                <Label className="shrink-0">紹介者</Label>
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
                    <SelectField
                        id="internalReferrerId"
                        name="internalReferrerId"
                        value={formData.internalReferrerId || ""}
                        onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : null
                            setFormData(prev => ({ ...prev, internalReferrerId: val }))
                        }}
                    >
                        <option value="">社内紹介者を選択</option>
                        {grouped.map(([dept, members]) => (
                            <optgroup key={dept} label={dept}>
                                {members.map(a => (
                                    <option key={a.id} value={a.id}>{a.department?.name ? `${a.department.name} / ${a.name}` : a.name}</option>
                                ))}
                            </optgroup>
                        ))}
                    </SelectField>
                    <div className="text-right text-xs">
                        <Link href={`/settings/staff?returnTo=${returnToPath}`} className="text-muted-foreground hover:underline hover:text-primary">
                            担当者を追加・編集
                        </Link>
                    </div>
                </>
            ) : mode === "external" ? (
                <>
                    <SelectField
                        id="referrerId"
                        name="referrerId"
                        value={formData.referrerId || ""}
                        onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : null
                            setFormData(prev => ({ ...prev, referrerId: val }))
                        }}
                    >
                        <option value="">社外紹介者を選択</option>
                        {groupedReferrers.map(([companyName, members]) => (
                            <optgroup key={companyName} label={companyName}>
                                {members.map(r => (
                                    <option key={r.id} value={r.id}>{r.branch?.name ? `${companyName} / ${r.branch.name}` : companyName}</option>
                                ))}
                            </optgroup>
                        ))}
                    </SelectField>
                    <div className="text-right text-xs">
                        <Link href={`/settings/referral-sources?returnTo=${returnToPath}`} className="text-muted-foreground hover:underline hover:text-primary">
                            紹介元を追加・編集
                        </Link>
                    </div>
                </>
            ) : null}
        </div>
    )
}
