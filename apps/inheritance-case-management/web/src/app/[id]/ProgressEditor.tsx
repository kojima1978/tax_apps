"use client"

import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { SetTodayButton } from "@/components/ui/SetTodayButton"
import type { InheritanceCase, ProgressStep } from "@/types/shared"
import { addVisitStep, removeVisitStep, DEFAULT_PROGRESS_STEPS } from "@/lib/progress-utils"
import { useProgressSteps } from "@/hooks/use-progress-steps"
import { DndContext, closestCenter } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { ProgressStatusSummary } from "./ProgressStatusSummary"
import { SortableProgressStep } from "./SortableProgressStep"

interface ProgressEditorProps {
    progress: ProgressStep[]
    onChange: (progress: ProgressStep[]) => void
    formData: InheritanceCase
    isCreateMode?: boolean
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
    setFormData: React.Dispatch<React.SetStateAction<InheritanceCase>>
    onNeedsConfirmedFee?: () => void
}

export function ProgressEditor({
    progress,
    onChange,
    formData,
    isCreateMode,
    handleChange,
    setFormData,
    onNeedsConfirmedFee,
}: ProgressEditorProps) {
    const {
        sensors, stepIds, checkedIds,
        handleStepChange, toggleCheck, setTodayForChecked, handleDragEnd,
    } = useProgressSteps({ steps: progress, onChange })

    const handleDeleteStep = (index: number) => {
        if (!confirm("この訪問日時を削除してもよろしいですか？")) return
        onChange(removeVisitStep(progress, index))
    }

    const statusSummary = (
        <ProgressStatusSummary
            formData={formData}
            isCreateMode={isCreateMode}
            handleChange={handleChange}
            setFormData={setFormData}
            onNeedsConfirmedFee={onNeedsConfirmedFee}
        />
    )

    return (
        <div className="space-y-4">
            {statusSummary}

            <details className="group rounded-lg border bg-card/50 p-3">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold">
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                    工程メモ（任意・手続中の進捗）
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {progress.filter(s => s.date).length}/{progress.length}
                    </span>
                </summary>

                <div className="mt-3">
                    {checkedIds.size > 0 && (
                        <div className="mb-3 flex justify-end">
                            <SetTodayButton count={checkedIds.size} onClick={setTodayForChecked} />
                        </div>
                    )}

                    {progress.length === 0 ? (
                        <div className="rounded-lg border bg-muted/30 py-6 text-center">
                            <p className="mb-2 text-sm text-muted-foreground">進捗データがありません</p>
                            <Button type="button" variant="outline" size="sm" onClick={() => onChange([...DEFAULT_PROGRESS_STEPS])}>
                                + デフォルトステップを追加
                            </Button>
                        </div>
                    ) : (
                        <div className="relative">
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
                                    {progress.map((step, index) => (
                                        <SortableProgressStep
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
                    )}
                </div>
            </details>
        </div>
    )
}
