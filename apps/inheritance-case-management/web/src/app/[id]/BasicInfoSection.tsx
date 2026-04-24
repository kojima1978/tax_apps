import { Label } from "@/components/ui/Label"
import { Input } from "@/components/ui/Input"
import { SelectField } from "@/components/ui/SelectField"
import { CollapsibleSection } from "@/components/ui/CollapsibleSection"
import { MasterSelect } from "@/components/ui/MasterSelect"
import { User, Info } from "lucide-react"
import { toWareki } from "@/lib/analytics-utils"
import type { InheritanceCase, Assignee, Referrer, AcceptanceStatus } from "@/types/shared"
import { formatId } from "@/types/shared"
import {
    FISCAL_YEARS, CASE_STATUS_OPTIONS, HANDLING_STATUS_OPTIONS, ACCEPTANCE_FORM_OPTIONS,
    STATUS_ENABLED_WHEN, ACCEPTANCE_AUTO_HANDLING, ACCEPTANCE_HINTS,
    MAX_SUMMARY_LENGTH,
} from "@/types/constants"
import { ReferrerToggleSelect } from "./ReferrerToggleSelect"

interface BasicInfoSectionProps {
    formData: InheritanceCase
    isCreateMode: boolean
    assignees: Assignee[]
    referrers: Referrer[]
    returnToPath: string
    isOpen?: boolean
    onToggle?: () => void
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
    setFormData: React.Dispatch<React.SetStateAction<InheritanceCase>>
}

export function BasicInfoSection({
    formData, isCreateMode, assignees, referrers, returnToPath, isOpen, onToggle, handleChange, setFormData
}: BasicInfoSectionProps) {
    const acceptance = formData.acceptanceStatus || "未判定"
    const hint = ACCEPTANCE_HINTS[acceptance]

    return (
        <CollapsibleSection title="基本情報" icon={User} isOpen={isOpen} onToggle={onToggle}>
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
                    <Label htmlFor="fiscalYear">年度（{toWareki(new Date(formData.fiscalYear, 0, 1))}度）</Label>
                    <SelectField id="fiscalYear" name="fiscalYear" value={formData.fiscalYear} onChange={handleChange}>
                        {FISCAL_YEARS.map(year => (
                            <option key={year} value={year}>{year}年度</option>
                        ))}
                    </SelectField>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="dateOfDeath">相続開始日{formData.dateOfDeath ? `（${toWareki(formData.dateOfDeath)}）` : ""}</Label>
                    <Input id="dateOfDeath" name="dateOfDeath" type="date" value={formData.dateOfDeath} onChange={handleChange} />
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
                    <Label htmlFor="caseAddedDate">受託日</Label>
                    <Input id="caseAddedDate" name="caseAddedDate" type="date" value={formData.caseAddedDate || ""} onChange={handleChange} />
                </div>

                {!isCreateMode && formData.caseCompletedDate && (
                    <div className="space-y-2">
                        <Label htmlFor="caseCompletedDate">申告完了日（自動）</Label>
                        <Input id="caseCompletedDate" value={formData.caseCompletedDate} disabled className="bg-muted" />
                    </div>
                )}

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
                    editHref={`/settings/staff?returnTo=${returnToPath}`}
                    editLabel="担当者を追加・編集"
                    renderOption={(a) => ({ value: a.id, label: a.name })}
                    groupBy={{
                        key: (a) => a.department?.name || "部門なし",
                        sortOrder: (a) => a.department?.sortOrder ?? Number.MAX_SAFE_INTEGER,
                    }}
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
