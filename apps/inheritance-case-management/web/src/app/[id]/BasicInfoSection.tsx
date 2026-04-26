import { Label } from "@/components/ui/Label"
import { Input } from "@/components/ui/Input"
import { SelectField } from "@/components/ui/SelectField"
import { CollapsibleSection } from "@/components/ui/CollapsibleSection"
import { MasterSelect } from "@/components/ui/MasterSelect"
import { User } from "lucide-react"
import { toWareki } from "@/lib/analytics-utils"
import type { InheritanceCase, Assignee, Referrer } from "@/types/shared"
import { formatId } from "@/types/shared"
import {
    FISCAL_YEARS,
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
                    renderOption={(a) => ({ value: a.id, label: a.department?.name ? `${a.department.name} / ${a.name}` : a.name })}
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
