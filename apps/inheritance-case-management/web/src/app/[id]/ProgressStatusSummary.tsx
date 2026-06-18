import { CalendarCheck, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { cn } from "@/lib/utils"
import type { InheritanceCase } from "@/types/shared"
import {
    CASE_STATUS_OPTIONS,
    COMPLETED_STATUSES,
    MILESTONE_DATES,
    isMilestoneTriggered,
    type MilestoneDateField,
} from "@/types/constants"
import { todayIsoDate } from "./progress-editor-utils"

interface ProgressStatusSummaryProps {
    formData: InheritanceCase
    isCreateMode?: boolean
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
    setFormData: React.Dispatch<React.SetStateAction<InheritanceCase>>
    onNeedsConfirmedFee?: () => void
}

// メインフロー（見送りは分岐・終端のため分離して表示）
const MAIN_FLOW = CASE_STATUS_OPTIONS.filter(s => s !== "見送り")

function FieldBadge({ children, variant = "required" }: { children: React.ReactNode; variant?: "required" | "info" }) {
    return (
        <span
            className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium leading-none",
                variant === "required" ? "bg-white text-black border border-black/10" : "bg-muted text-muted-foreground",
            )}
        >
            {children}
        </span>
    )
}

function StatusButton({ value, selected, onSelect }: { value: string; selected: boolean; onSelect: (v: string) => void }) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(value)}
            className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                selected
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-input bg-white text-muted-foreground hover:bg-muted",
            )}
        >
            <span
                className={cn(
                    "h-2.5 w-2.5 rounded-full border",
                    selected ? "border-white bg-white" : "border-muted-foreground/40",
                )}
            />
            {value}
        </button>
    )
}

function MilestoneDate({
    field,
    label,
    triggerStatus,
    value,
    relevant,
    handleChange,
    onSet,
    onClear,
}: {
    field: MilestoneDateField
    label: string
    triggerStatus: string
    value: string
    relevant: boolean
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onSet: () => void
    onClear: () => void
}) {
    return (
        <div className={cn("space-y-1", !relevant && "opacity-50")}>
            <Label htmlFor={field} className="flex items-center gap-1.5 text-xs">
                {label}日
                <FieldBadge variant="info">手動修正可</FieldBadge>
            </Label>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <Input id={field} name={field} type="date" value={value} onChange={handleChange} />
                <Button type="button" variant="outline" size="sm" className="h-10" onClick={onSet}>
                    <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
                    今日
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-10 text-muted-foreground" onClick={onClear}>
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    クリア
                </Button>
            </div>
            {!relevant && <p className="text-[11px] text-muted-foreground">{triggerStatus}で自動入力されます</p>}
        </div>
    )
}

export function ProgressStatusSummary({
    formData,
    handleChange,
    setFormData,
    onNeedsConfirmedFee,
}: ProgressStatusSummaryProps) {
    const selectStatus = (val: string) => {
        // 既存の handleChange（status更新＋報酬確認セクション展開）を流用
        handleChange({ target: { name: "status", value: val } } as React.ChangeEvent<HTMLSelectElement>)
        // 到達した全マイルストンの日付を自動セット（空欄のみ）
        setFormData(prev => {
            const patch: Partial<InheritanceCase> = {}
            for (const { field } of MILESTONE_DATES) {
                if (isMilestoneTriggered(field, val) && !prev[field]) {
                    (patch as Record<string, string>)[field] = todayIsoDate()
                }
            }
            return { ...prev, ...patch }
        })
        // 申告済以降で報酬額チェック
        if ((COMPLETED_STATUSES as readonly string[]).includes(val) && !formData.feeAmount) onNeedsConfirmedFee?.()
    }

    const setDateField = (field: MilestoneDateField, value: string | null) => {
        if (field === "caseCompletedDate" && value && !formData.feeAmount) onNeedsConfirmedFee?.()
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    return (
        <div className="rounded-lg border bg-card/50 p-3">
            <div className="mb-2.5">
                <h3 className="text-sm font-semibold">案件ステータスと日付</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    ステータスをクリックで選択（1つ）。到達した日付は自動入力され、手動修正もできます
                </p>
            </div>

            <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                    ステータス
                    <FieldBadge>必須</FieldBadge>
                </Label>
                <div className="flex flex-wrap items-center gap-1.5">
                    {MAIN_FLOW.map(s => (
                        <StatusButton key={s} value={s} selected={formData.status === s} onSelect={selectStatus} />
                    ))}
                    <span className="mx-0.5 h-6 w-px bg-border" aria-hidden="true" />
                    <StatusButton value="見送り" selected={formData.status === "見送り"} onSelect={selectStatus} />
                </div>
            </div>

            <label className="mt-3 flex cursor-pointer items-center gap-2 border-t pt-3 text-xs">
                <input
                    type="checkbox"
                    name="isUndivided"
                    checked={!!formData.isUndivided}
                    onChange={(e) => setFormData(prev => ({ ...prev, isUndivided: e.target.checked }))}
                    className="h-4 w-4 rounded border-input"
                />
                遺産未分割
                <span className="text-[11px] text-muted-foreground">（申告済以降で有効）</span>
            </label>

            <div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-2">
                {MILESTONE_DATES.map(({ field, label, statuses }) => (
                    <MilestoneDate
                        key={field}
                        field={field}
                        label={label}
                        triggerStatus={statuses[0]}
                        value={(formData[field] as string | null) || ""}
                        relevant={isMilestoneTriggered(field, formData.status)}
                        handleChange={handleChange}
                        onSet={() => setDateField(field, todayIsoDate())}
                        onClear={() => setDateField(field, null)}
                    />
                ))}
            </div>
        </div>
    )
}
