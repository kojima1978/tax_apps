import { CalendarCheck, Info, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { SelectField } from "@/components/ui/SelectField"
import { cn } from "@/lib/utils"
import type { AcceptanceStatus, InheritanceCase } from "@/types/shared"
import {
    ACCEPTANCE_AUTO_HANDLING,
    ACCEPTANCE_FORM_OPTIONS,
    ACCEPTANCE_HINTS,
    CASE_STATUS_OPTIONS,
    COMPLETED_STATUSES,
    HANDLING_STATUS_OPTIONS,
    STATUS_ENABLED_WHEN,
} from "@/types/constants"
import { isCompletedHandlingStatus, todayIsoDate } from "./progress-editor-utils"

interface ProgressStatusSummaryProps {
    formData: InheritanceCase
    isCreateMode?: boolean
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
    setFormData: React.Dispatch<React.SetStateAction<InheritanceCase>>
    onNeedsConfirmedFee?: () => void
}

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

export function ProgressStatusSummary({
    formData,
    isCreateMode,
    handleChange,
    setFormData,
    onNeedsConfirmedFee,
}: ProgressStatusSummaryProps) {
    const acceptance = formData.acceptanceStatus || "未判定"
    const hint = ACCEPTANCE_HINTS[acceptance]

    const applyCompletionEffects = () => {
        if (!formData.feeAmount) onNeedsConfirmedFee?.()
        setFormData(prev => prev.caseCompletedDate ? prev : { ...prev, caseCompletedDate: todayIsoDate() })
    }

    const handleAcceptanceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value as AcceptanceStatus
        const autoHandling = ACCEPTANCE_AUTO_HANDLING[val]
        setFormData(prev => ({
            ...prev,
            acceptanceStatus: val,
            ...(val === "受託" && !prev.caseAddedDate ? { caseAddedDate: todayIsoDate() } : {}),
            ...(autoHandling ? { handlingStatus: autoHandling } : {}),
        }))
    }

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        handleChange(e)
        const val = e.target.value
        if ((COMPLETED_STATUSES as readonly string[]).includes(val)) applyCompletionEffects()
        if (val === "入金済") setFormData(prev => prev.handlingStatus === "対応終了" ? prev : { ...prev, handlingStatus: "対応終了" })
    }

    const handleHandlingStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        handleChange(e)
        if (isCompletedHandlingStatus(e.target.value)) applyCompletionEffects()
    }

    const setDateField = (field: "caseAddedDate" | "caseCompletedDate", value: string | null) => {
        if (field === "caseCompletedDate" && value) applyCompletionEffects()
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    return (
        <div className="rounded-lg border bg-card/50 p-3">
            <div className="mb-2.5">
                <h3 className="text-sm font-semibold">必須ステータス・関連日付</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">進み具合・受託・対応状況は最終的に必ず確認してください</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="status" className="flex items-center gap-1.5 text-xs">
                        進み具合
                        <FieldBadge>必須</FieldBadge>
                    </Label>
                    <SelectField
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleStatusChange}
                        disabled={acceptance === "見送り"}
                    >
                        {CASE_STATUS_OPTIONS.map(s => (
                            <option key={s} value={s} disabled={!STATUS_ENABLED_WHEN[s].includes(acceptance)}>
                                {s}
                            </option>
                        ))}
                    </SelectField>
                    {hint && (
                        <p className="flex items-start gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-gray-700">
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {hint}
                        </p>
                    )}
                </div>

                <div className="space-y-1">
                    <Label htmlFor="acceptanceStatus" className="flex items-center gap-1.5 text-xs">
                        受託
                        <FieldBadge>必須</FieldBadge>
                    </Label>
                    <SelectField
                        id="acceptanceStatus"
                        name="acceptanceStatus"
                        value={acceptance}
                        onChange={handleAcceptanceChange}
                    >
                        {ACCEPTANCE_FORM_OPTIONS.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </SelectField>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="caseAddedDate" className="flex items-center gap-1.5 text-xs">
                        受託日
                        <FieldBadge variant="info">手動修正可</FieldBadge>
                    </Label>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                        <Input id="caseAddedDate" name="caseAddedDate" type="date" value={formData.caseAddedDate || ""} onChange={handleChange} />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-10"
                            onClick={() => setDateField("caseAddedDate", todayIsoDate())}
                        >
                            <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
                            今日
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-10 text-muted-foreground"
                            onClick={() => setDateField("caseAddedDate", null)}
                        >
                            <X className="mr-1.5 h-3.5 w-3.5" />
                            クリア
                        </Button>
                    </div>
                </div>

                <div className="space-y-1">
                    <Label htmlFor="handlingStatus" className="flex items-center gap-1.5 text-xs">
                        対応状況
                        <FieldBadge>必須</FieldBadge>
                    </Label>
                    <SelectField
                        id="handlingStatus"
                        name="handlingStatus"
                        value={formData.handlingStatus || "対応中"}
                        onChange={handleHandlingStatusChange}
                    >
                        {HANDLING_STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </SelectField>
                </div>
                {!isCreateMode && (
                    <div className="space-y-1">
                        <Label htmlFor="caseCompletedDate" className="flex items-center gap-1.5 text-xs">
                            申告完了日
                            <FieldBadge variant="info">手動修正可</FieldBadge>
                        </Label>
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                            <Input
                                id="caseCompletedDate"
                                name="caseCompletedDate"
                                type="date"
                                value={formData.caseCompletedDate || ""}
                                onChange={handleChange}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-10"
                                onClick={() => setDateField("caseCompletedDate", todayIsoDate())}
                            >
                                <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
                                今日
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-10 text-muted-foreground"
                                onClick={() => setDateField("caseCompletedDate", null)}
                            >
                                <X className="mr-1.5 h-3.5 w-3.5" />
                                クリア
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
