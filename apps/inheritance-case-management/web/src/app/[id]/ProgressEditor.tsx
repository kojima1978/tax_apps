"use client"

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

    if (progress.length === 0) {
        return (
            <>
                {statusSummary}
                <div className="mb-2">
                    <h3 className="text-sm font-semibold">工程日付</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">発生した工程から順に入力してください</p>
                </div>
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
            {statusSummary}
            <div className="mb-3">
                <h3 className="text-sm font-semibold">工程日付</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">発生した工程から順に入力してください</p>
            </div>
            {checkedIds.size > 0 && (
                <div className="mb-4">
                    <SetTodayButton count={checkedIds.size} onClick={setTodayForChecked} />
                </div>
            )}
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
    )
}
