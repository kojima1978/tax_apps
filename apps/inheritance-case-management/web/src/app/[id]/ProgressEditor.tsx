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
        <div className="space-y-4">
            <div className="space-y-4">
                {progress.map((step, index) => (
                    <div key={step.id} className="grid grid-cols-12 gap-4 items-center p-4 border rounded-lg bg-card/50">
                        <div className="col-span-3">
                            <Label className="font-medium">{step.name}</Label>
                        </div>
                        <div className="col-span-3">
                            <Input
                                type="date"
                                value={step.date || ""}
                                onChange={(e) => handleStepChange(index, "date", e.target.value)}
                            />
                        </div>
                        <div className="col-span-6">
                            <Input
                                placeholder="備考（場所、結果など）"
                                value={step.memo || ""}
                                onChange={(e) => handleStepChange(index, "memo", e.target.value)}
                            />
                        </div>
                        {shouldShowAddVisit(progress, step, index) && (
                            <div className="col-span-12 pt-2 text-center">
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
                        {step.isDynamic && (
                            <div className="col-span-12 flex justify-end -mt-2 mb-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 h-8 px-2"
                                    onClick={() => handleDeleteStep(index)}
                                >
                                    削除
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
