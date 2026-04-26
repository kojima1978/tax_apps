"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { SelectField } from "@/components/ui/SelectField"
import { SetTodayButton } from "@/components/ui/SetTodayButton"
import type { AcceptanceStatus, InheritanceCase, ProgressStep } from "@/types/shared"
import { addVisitStep, removeVisitStep, shouldShowAddVisit, DEFAULT_PROGRESS_STEPS } from "@/lib/progress-utils"
import { useProgressSteps } from "@/hooks/use-progress-steps"
import { cn } from "@/lib/utils"
import { GripVertical, Info, Plus, Trash2 } from "lucide-react"
import { toWareki } from "@/lib/analytics-utils"
import {
    ACCEPTANCE_AUTO_HANDLING,
    ACCEPTANCE_FORM_OPTIONS,
    ACCEPTANCE_HINTS,
    CASE_STATUS_OPTIONS,
    HANDLING_STATUS_OPTIONS,
    STATUS_ENABLED_WHEN,
} from "@/types/constants"
import { DndContext, closestCenter } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface ProgressEditorProps {
    progress: ProgressStep[]
    onChange: (progress: ProgressStep[]) => void
    formData: InheritanceCase
    isCreateMode?: boolean
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
    setFormData: React.Dispatch<React.SetStateAction<InheritanceCase>>
}

function SortableStep({
    step,
    index,
    progress,
    checked,
    onToggle,
    onStepChange,
    onDelete,
    onAddVisit,
}: {
    step: ProgressStep
    index: number
    progress: ProgressStep[]
    checked: boolean
    onToggle: () => void
    onStepChange: (index: number, field: "date" | "memo", value: string) => void
    onDelete: (index: number) => void
    onAddVisit: (index: number) => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id })
    const isCompleted = !!step.date
    const isLast = index === progress.length - 1

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
            className="relative pl-9"
        >
            {!isLast && <div className="absolute left-[17px] top-12 bottom-0 w-0.5 bg-border" />}
            <div
                className={cn(
                    "absolute left-[7px] top-6 h-4 w-4 rounded-full border-2 transition-colors",
                    isCompleted ? "border-green-500 bg-green-500" : "border-muted-foreground/40 bg-background",
                )}
            />
            <div className="pb-4">
                <div
                    className={cn(
                        "rounded-lg border bg-card/60 p-3 transition-colors",
                        checked && "border-primary/60 bg-primary/5",
                        isDragging && "shadow-md",
                    )}
                >
                    <div className="mb-3 flex items-start gap-2">
                        <button
                            type="button"
                            aria-label={`${step.name}をドラッグして順序変更`}
                            className="flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
                            {...attributes}
                            {...listeners}
                        >
                            <GripVertical className="h-4 w-4" />
                        </button>
                        <label className="flex min-h-11 flex-1 cursor-pointer items-start gap-3 rounded-md px-1 py-1.5">
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={onToggle}
                                className="mt-1 h-4 w-4 rounded border-gray-300 accent-primary"
                                aria-label={`${step.name}を一括日付設定の対象にする`}
                            />
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-sm">{step.name}</span>
                                </span>
                                {step.date && <span className="mt-1 block text-xs text-muted-foreground">{toWareki(step.date)}</span>}
                            </span>
                        </label>
                        {step.isDynamic && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 shrink-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                                onClick={() => onDelete(index)}
                                aria-label={`${step.name}を削除`}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[minmax(150px,0.75fr)_minmax(0,1fr)]">
                        <Input
                            type="date"
                            value={step.date || ""}
                            onChange={(e) => onStepChange(index, "date", e.target.value)}
                            aria-label={`${step.name}の完了日`}
                        />
                        <Input
                            placeholder="備考（場所、結果など）"
                            value={step.memo || ""}
                            onChange={(e) => onStepChange(index, "memo", e.target.value)}
                            aria-label={`${step.name}の備考`}
                        />
                    </div>
                </div>
                {shouldShowAddVisit(progress, step, index) && (
                    <div className="pt-2 pl-4">
                        <Button type="button" variant="outline" size="sm" onClick={() => onAddVisit(index)}>
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            訪問日を追加
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

export function ProgressEditor({ progress, onChange, formData, isCreateMode, handleChange, setFormData }: ProgressEditorProps) {
    const {
        sensors, stepIds, checkedIds,
        handleStepChange, toggleCheck, setTodayForChecked, handleDragEnd,
    } = useProgressSteps({ steps: progress, onChange })
    const acceptance = formData.acceptanceStatus || "未判定"
    const hint = ACCEPTANCE_HINTS[acceptance]

    const handleDeleteStep = (index: number) => {
        if (!confirm("この訪問日時を削除してもよろしいですか？")) return
        onChange(removeVisitStep(progress, index))
    }

    const handleAcceptanceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value as AcceptanceStatus
        const autoHandling = ACCEPTANCE_AUTO_HANDLING[val]
        setFormData(prev => ({
            ...prev,
            acceptanceStatus: val,
            ...(autoHandling ? { handlingStatus: autoHandling } : {}),
        }))
    }

    const dateSummary = (
        <div className="mb-5 grid gap-4 rounded-lg border bg-card/50 p-3 md:grid-cols-2">
            <div className="space-y-1">
                <Label htmlFor="acceptanceStatus" className="text-xs">受託</Label>
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
                <Label htmlFor="caseAddedDate" className="text-xs">受託日</Label>
                <Input id="caseAddedDate" name="caseAddedDate" type="date" value={formData.caseAddedDate || ""} onChange={handleChange} />
            </div>

            <div className="space-y-1">
                <Label htmlFor="handlingStatus" className="text-xs">対応状況</Label>
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
            {!isCreateMode && (
                <div className="space-y-1">
                    <Label htmlFor="caseCompletedDate" className="text-xs">申告完了日（自動）</Label>
                    <Input id="caseCompletedDate" value={formData.caseCompletedDate || ""} disabled className="bg-muted" />
                </div>
            )}

            <div className="space-y-1 md:col-span-2">
                <Label htmlFor="status" className="text-xs">進み具合</Label>
                <SelectField
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={acceptance === "見送り"}
                >
                    {CASE_STATUS_OPTIONS.map(s => (
                        <option key={s} value={s} disabled={!STATUS_ENABLED_WHEN[s].includes(acceptance)}>
                            {s}
                        </option>
                    ))}
                </SelectField>
                {hint && (
                    <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-600">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {hint}
                    </p>
                )}
            </div>
        </div>
    )

    if (progress.length === 0) {
        return (
            <>
                {dateSummary}
                <div className="text-center py-6 border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-2">進捗データがありません</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => onChange([...DEFAULT_PROGRESS_STEPS])}>
                        + デフォルトステップを追加
                    </Button>
                </div>
            </>
        )
    }

    return (
        <div className="relative">
            {dateSummary}
            {checkedIds.size > 0 && (
                <div className="mb-4">
                    <SetTodayButton count={checkedIds.size} onClick={setTodayForChecked} />
                </div>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
                    {progress.map((step, index) => (
                        <SortableStep
                            key={step.id}
                            step={step}
                            index={index}
                            progress={progress}
                            checked={checkedIds.has(step.id)}
                            onToggle={() => toggleCheck(step.id)}
                            onStepChange={handleStepChange}
                            onDelete={handleDeleteStep}
                            onAddVisit={(i) => onChange(addVisitStep(progress, i))}
                        />
                    ))}
                </SortableContext>
            </DndContext>
        </div>
    )
}
