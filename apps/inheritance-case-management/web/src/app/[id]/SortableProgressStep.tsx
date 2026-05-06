import { GripVertical, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { shouldShowAddVisit } from "@/lib/progress-utils"
import { cn } from "@/lib/utils"
import { toWareki } from "@/lib/analytics-utils"
import type { ProgressStep } from "@/types/shared"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface SortableProgressStepProps {
    step: ProgressStep
    index: number
    progress: ProgressStep[]
    checked: boolean
    onToggle: () => void
    onStepChange: (index: number, field: "date" | "memo", value: string) => void
    onDelete: (index: number) => void
    onAddVisit: (index: number) => void
}

export function SortableProgressStep({
    step,
    index,
    progress,
    checked,
    onToggle,
    onStepChange,
    onDelete,
    onAddVisit,
}: SortableProgressStepProps) {
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
                    isCompleted ? "border-black bg-black" : "border-muted-foreground/40 bg-background",
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
                                    {step.date && (
                                        <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                                            {toWareki(step.date)}
                                        </span>
                                    )}
                                </span>
                            </span>
                        </label>
                        {step.isDynamic && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 shrink-0 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
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
