"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import type { ProgressStep } from "@/types/shared"
import { addVisitStep, removeVisitStep, shouldShowAddVisit } from "@/lib/progress-utils"

interface ProgressEditorProps {
    progress: ProgressStep[]
    onChange: (progress: ProgressStep[]) => void
}

export function ProgressEditor({ progress, onChange }: ProgressEditorProps) {
    const handleStepChange = (index: number, field: "date" | "memo", value: string) => {
        const newProgress = [...progress]
        if (field === "date") {
            newProgress[index] = { ...newProgress[index], date: value || null }
        } else {
            newProgress[index] = { ...newProgress[index], memo: value }
        }
        onChange(newProgress)
    }

    const handleDeleteStep = (index: number) => {
        if (!confirm("この訪問日時を削除してもよろしいですか？")) return
        onChange(removeVisitStep(progress, index))
    }

    return (
        <div className="relative">
            {progress.map((step, index) => {
                const isCompleted = !!step.date
                const isLast = index === progress.length - 1

                return (
                    <div key={step.id} className="relative pl-8">
                        {/* 縦線 */}
                        {!isLast && (
                            <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border" />
                        )}
                        {/* ドット */}
                        <div className={`absolute left-1 top-[18px] h-3 w-3 rounded-full border-2 transition-colors ${
                            isCompleted
                                ? 'bg-green-500 border-green-500'
                                : 'bg-background border-muted-foreground/40'
                        }`} />
                        {/* カード */}
                        <div className="pb-5">
                            <div className="p-3 border rounded-lg bg-card/50">
                                <div className="flex items-center gap-3 mb-2">
                                    <Label className="font-medium text-sm">{step.name}</Label>
                                    {step.isDynamic && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700 h-6 px-1.5 text-xs"
                                            onClick={() => handleDeleteStep(index)}
                                        >
                                            削除
                                        </Button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        type="date"
                                        value={step.date || ""}
                                        onChange={(e) => handleStepChange(index, "date", e.target.value)}
                                    />
                                    <Input
                                        placeholder="備考（場所、結果など）"
                                        value={step.memo || ""}
                                        onChange={(e) => handleStepChange(index, "memo", e.target.value)}
                                    />
                                </div>
                            </div>
                            {shouldShowAddVisit(progress, step, index) && (
                                <div className="pt-2 pl-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onChange(addVisitStep(progress, index))}
                                    >
                                        + 訪問日を追加
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
