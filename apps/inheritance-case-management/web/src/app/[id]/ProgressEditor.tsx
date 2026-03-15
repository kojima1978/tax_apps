"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { SetTodayButton } from "@/components/ui/SetTodayButton"
import type { ProgressStep } from "@/types/shared"
import { addVisitStep, removeVisitStep, shouldShowAddVisit } from "@/lib/progress-utils"
import { useProgressSteps } from "@/hooks/use-progress-steps"
import { GripVertical } from "lucide-react"
import { DndContext, closestCenter } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface ProgressEditorProps {
    progress: ProgressStep[]
    onChange: (progress: ProgressStep[]) => void
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
        <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} className="relative pl-8">
            {!isLast && <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border" />}
            <div className={`absolute left-1 top-[18px] h-3 w-3 rounded-full border-2 transition-colors ${
                isCompleted ? 'bg-green-500 border-green-500' : 'bg-background border-muted-foreground/40'
            }`} />
            <div className="pb-5">
                <div className="p-3 border rounded-lg bg-card/50">
                    <div className="flex items-center gap-2 mb-2">
                        <button type="button" className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none" {...attributes} {...listeners}>
                            <GripVertical className="h-4 w-4" />
                        </button>
                        <input type="checkbox" checked={checked} onChange={onToggle} className="h-3.5 w-3.5 rounded border-gray-300 accent-primary" />
                        <Label className="font-medium text-sm">{step.name}</Label>
                        {step.isDynamic && (
                            <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-700 h-6 px-1.5 text-xs" onClick={() => onDelete(index)}>
                                削除
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Input type="date" value={step.date || ""} onChange={(e) => onStepChange(index, "date", e.target.value)} />
                        <Input placeholder="備考（場所、結果など）" value={step.memo || ""} onChange={(e) => onStepChange(index, "memo", e.target.value)} />
                    </div>
                </div>
                {shouldShowAddVisit(progress, step, index) && (
                    <div className="pt-2 pl-4">
                        <Button type="button" variant="outline" size="sm" onClick={() => onAddVisit(index)}>
                            + 訪問日を追加
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

export function ProgressEditor({ progress, onChange }: ProgressEditorProps) {
    const {
        sensors, stepIds, checkedIds,
        handleStepChange, toggleCheck, setTodayForChecked, handleDragEnd,
    } = useProgressSteps({ steps: progress, onChange })

    const handleDeleteStep = (index: number) => {
        if (!confirm("この訪問日時を削除してもよろしいですか？")) return
        onChange(removeVisitStep(progress, index))
    }

    return (
        <div className="relative">
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
