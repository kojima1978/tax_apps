import { Label } from "@/components/ui/Label"
import { Input } from "@/components/ui/Input"
import { SelectField } from "@/components/ui/SelectField"
import { CollapsibleSection } from "@/components/ui/CollapsibleSection"
import { User, Info } from "lucide-react"
import type { InheritanceCase, Assignee, Referrer } from "@/types/shared"
import { formatId } from "@/types/shared"
import { FISCAL_YEARS } from "@/types/constants"

const STATUS_HINTS: Record<string, string> = {
    "未判定": "「進行中」「完了」を選択するには、受託を「受託可」または「受託不可」に変更してください",
    "受託不可": "受託不可のため「進行」は自動的に「完了」に設定されます",
}

interface BasicInfoSectionProps {
    formData: InheritanceCase
    isCreateMode: boolean
    assignees: Assignee[]
    referrers: Referrer[]
    returnToPath: string
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
    setFormData: React.Dispatch<React.SetStateAction<InheritanceCase>>
}

export function BasicInfoSection({
    formData, isCreateMode, assignees, referrers, returnToPath, handleChange, setFormData
}: BasicInfoSectionProps) {
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
                </div>

                <div className="space-y-2">
                    <Label htmlFor="acceptanceStatus">受託</Label>
                    <SelectField
                        id="acceptanceStatus"
                        name="acceptanceStatus"
                        value={formData.acceptanceStatus || "未判定"}
                        onChange={(e) => {
                            const val = e.target.value as "受託可" | "受託不可" | "未判定" | undefined
                            setFormData(prev => {
                                let newStatus = prev.status
                                if (val === "未判定") newStatus = "未着手"
                                else if (val === "受託不可") newStatus = "完了"
                                return { ...prev, acceptanceStatus: val, status: newStatus }
                            })
                        }}
                    >
                        <option value="未判定">未判定</option>
                        <option value="受託可">受託可</option>
                        <option value="受託不可">受託不可</option>
                    </SelectField>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status">進行</Label>
                    <SelectField
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        disabled={formData.acceptanceStatus === "受託不可"}
                    >
                        <option value="未着手" disabled={formData.acceptanceStatus === "受託不可"}>未着手</option>
                        <option value="進行中" disabled={formData.acceptanceStatus === "未判定" || formData.acceptanceStatus === "受託不可"}>進行中</option>
                        <option value="完了" disabled={formData.acceptanceStatus === "未判定"}>完了</option>
                    </SelectField>
                    {STATUS_HINTS[formData.acceptanceStatus || ""] && (
                        <p className="flex items-start gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            {STATUS_HINTS[formData.acceptanceStatus || ""]}
                        </p>
                    )}
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
                        label: a.department ? `${a.department} / ${a.name}` : a.name,
                    })}
                    onChange={handleChange}
                />

                <MasterSelect
                    id="referrerId"
                    label="紹介者"
                    value={formData.referrerId || ""}
                    items={referrers}
                    placeholder="紹介者を選択"
                    editHref={`/settings/referrers?returnTo=${returnToPath}`}
                    editLabel="紹介者を追加・編集"
                    renderOption={(r) => ({
                        value: r.id,
                        label: r.department ? `${r.company} / ${r.department} / ${r.name}` : `${r.company} / ${r.name}`,
                    })}
                    onChange={handleChange}
                />
            </div>
        </CollapsibleSection>
    )
}

// Generic MasterSelect for assignee/referrer dropdowns
interface MasterSelectProps<T extends { id: number; active: boolean }> {
    id: string
    label: string
    value: string
    items: T[]
    placeholder: string
    editHref: string
    editLabel: string
    renderOption: (item: T) => { value: string; label: string }
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

function MasterSelect<T extends { id: number; active: boolean }>({
    id, label, value, items, placeholder, editHref, editLabel, renderOption, onChange,
}: MasterSelectProps<T>) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <SelectField id={id} name={id} value={value} onChange={onChange}>
                <option value="">{placeholder}</option>
                {items.filter(item => item.active !== false).map((item) => {
                    const opt = renderOption(item)
                    return <option key={item.id} value={opt.value}>{opt.label}</option>
                })}
            </SelectField>
            <div className="text-right text-xs">
                <a href={editHref} className="text-muted-foreground hover:underline hover:text-primary">
                    {editLabel}
                </a>
            </div>
        </div>
    )
}
