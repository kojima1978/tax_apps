import { useState, useMemo } from "react"
import Link from "next/link"
import { Label } from "@/components/ui/Label"
import { Input } from "@/components/ui/Input"
import { SelectField } from "@/components/ui/SelectField"
import { CollapsibleSection } from "@/components/ui/CollapsibleSection"
import { MasterSelect } from "@/components/ui/MasterSelect"
import { User, Info } from "lucide-react"
import { toWareki } from "@/lib/analytics-utils"
import type { InheritanceCase, Assignee, Referrer, AcceptanceStatus, HandlingStatus } from "@/types/shared"
import { formatId, formatReferrerLabel } from "@/types/shared"
import {
    FISCAL_YEARS, CASE_STATUS_OPTIONS, HANDLING_STATUS_OPTIONS, ACCEPTANCE_FORM_OPTIONS,
    STATUS_ENABLED_WHEN, ACCEPTANCE_AUTO_HANDLING, ACCEPTANCE_HINTS,
    MAX_SUMMARY_LENGTH,
} from "@/types/constants"

interface BasicInfoSectionProps {
    formData: InheritanceCase
    isCreateMode: boolean
    assignees: Assignee[]
    referrers: Referrer[]
    returnToPath: string
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
    setFormData: React.Dispatch<React.SetStateAction<InheritanceCase>>
}

type ReferrerMode = "none" | "internal" | "external"

function ReferrerToggleSelect({
    formData, assignees, referrers, returnToPath, setFormData
}: Pick<BasicInfoSectionProps, "formData" | "assignees" | "referrers" | "returnToPath" | "setFormData">) {
    const initialMode: ReferrerMode = formData.referrerId ? "external"
        : formData.internalReferrerId ? "internal" : "none"
    const [mode, setMode] = useState<ReferrerMode>(initialMode)

    const activeAssignees = useMemo(() => assignees.filter(a => a.active !== false), [assignees])

    // Group assignees by department (sortOrder順、部門なしは末尾)
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

    const activeReferrers = useMemo(() => referrers.filter(r => r.active !== false), [referrers])

    const handleModeSwitch = (newMode: ReferrerMode) => {
        if (newMode === mode) return
        setMode(newMode)
        // Clear both IDs, the selected mode's select will set the appropriate one
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
                    {([["none", "なし"], ["internal", "社内"], ["external", "社外"]] as const).map(([m, label]) => (
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
                        <Link href={`/settings/assignees?returnTo=${returnToPath}`} className="text-muted-foreground hover:underline hover:text-primary">
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
                        {activeReferrers.map(r => (
                            <option key={r.id} value={r.id}>{formatReferrerLabel(r)}</option>
                        ))}
                    </SelectField>
                    <div className="text-right text-xs">
                        <Link href={`/settings/referrers?returnTo=${returnToPath}`} className="text-muted-foreground hover:underline hover:text-primary">
                            紹介者を追加・編集
                        </Link>
                    </div>
                </>
            ) : null}
        </div>
    )
}

export function BasicInfoSection({
    formData, isCreateMode, assignees, referrers, returnToPath, handleChange, setFormData
}: BasicInfoSectionProps) {
    const acceptance = formData.acceptanceStatus || "未判定"
    const hint = ACCEPTANCE_HINTS[acceptance]

    return (
        <CollapsibleSection title="基本情報" icon={User} defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {!isCreateMode && (
                    <div className="space-y-2">
                        <Label htmlFor="id">案件ID (変更不可)</Label>
                        <Input id="id" value={formatId(formData.id)} disabled className="bg-muted" />
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="deceasedName">被相続人氏名 <span className="text-red-500">*</span></Label>
                    <Input id="deceasedName" name="deceasedName" value={formData.deceasedName} onChange={handleChange} placeholder="例：山田 太郎" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="fiscalYear">年度</Label>
                    <SelectField id="fiscalYear" name="fiscalYear" value={formData.fiscalYear} onChange={handleChange}>
                        {FISCAL_YEARS.map(year => (
                            <option key={year} value={year}>{year}年度</option>
                        ))}
                    </SelectField>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="dateOfDeath">相続開始日</Label>
                    <Input id="dateOfDeath" name="dateOfDeath" type="date" value={formData.dateOfDeath} onChange={handleChange} />
                    {formData.dateOfDeath && <p className="text-xs text-muted-foreground">{toWareki(formData.dateOfDeath)}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="acceptanceStatus">受託</Label>
                    <SelectField
                        id="acceptanceStatus"
                        name="acceptanceStatus"
                        value={acceptance}
                        onChange={(e) => {
                            const val = e.target.value as AcceptanceStatus
                            const autoHandling = ACCEPTANCE_AUTO_HANDLING[val]
                            setFormData(prev => ({
                                ...prev,
                                acceptanceStatus: val,
                                ...(autoHandling ? { handlingStatus: autoHandling } : {}),
                            }))
                        }}
                    >
                        {ACCEPTANCE_FORM_OPTIONS.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </SelectField>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status">進み具合</Label>
                    <SelectField
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        disabled={acceptance === "受託不可"}
                    >
                        {CASE_STATUS_OPTIONS.map(s => (
                            <option key={s} value={s} disabled={!STATUS_ENABLED_WHEN[s].includes(acceptance)}>
                                {s}
                            </option>
                        ))}
                    </SelectField>
                    {hint && (
                        <p className="flex items-start gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            {hint}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="handlingStatus">対応状況</Label>
                    <SelectField
                        id="handlingStatus"
                        name="handlingStatus"
                        value={formData.handlingStatus || "対応中"}
                        onChange={handleChange}
                    >
                        {HANDLING_STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </SelectField>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="summary">特記事項（{MAX_SUMMARY_LENGTH}文字まで）</Label>
                    <div className="relative">
                        <Input
                            id="summary"
                            name="summary"
                            value={formData.summary || ""}
                            onChange={handleChange}
                            placeholder={`特記事項を入力（${MAX_SUMMARY_LENGTH}文字以内）`}
                            maxLength={MAX_SUMMARY_LENGTH}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                            {(formData.summary || "").length}/{MAX_SUMMARY_LENGTH}
                        </span>
                    </div>
                </div>

                <MasterSelect
                    id="assigneeId"
                    label="担当者"
                    value={formData.assigneeId || ""}
                    items={assignees}
                    placeholder="担当者を選択"
                    editHref={`/settings/assignees?returnTo=${returnToPath}`}
                    editLabel="担当者を追加・編集"
                    renderOption={(a) => ({
                        value: a.id,
                        label: a.department?.name ? `${a.department.name} / ${a.name}` : a.name,
                    })}
                    onChange={handleChange}
                />

                <ReferrerToggleSelect
                    formData={formData}
                    assignees={assignees}
                    referrers={referrers}
                    returnToPath={returnToPath}
                    setFormData={setFormData}
                />
            </div>
        </CollapsibleSection>
    )
}
