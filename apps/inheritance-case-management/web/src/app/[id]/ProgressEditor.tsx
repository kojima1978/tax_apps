"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"

type ProgressStep = {
    id: string
    name: string
    date: string | null
    memo?: string
    isDynamic?: boolean
}

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

    const handleAddVisit = (index: number) => {
        const newProgress = [...progress]
        let visitCount = 2
        newProgress.forEach(p => {
            const match = p.name.match(/(\d+)回目訪問/)
            if (match) {
                const num = parseInt(match[1])
                if (num > visitCount) visitCount = num
            }
        })

        const newStep: ProgressStep = {
            id: `step-visit-${Date.now()}`,
            name: `${visitCount + 1}回目訪問`,
            date: null,
            isDynamic: true
        }

        newProgress.splice(index + 1, 0, newStep)
        onChange(newProgress)
    }

    const handleDeleteStep = (index: number) => {
        if (!confirm("この訪問日時を削除してもよろしいですか？")) return

        const newProgress = [...progress]
        newProgress.splice(index, 1)

        let visitIndex = 0
        newProgress.forEach((p) => {
            if (p.name.includes("回目訪問")) {
                visitIndex++
                p.name = `${visitIndex + 1}回目訪問`
            }
        })

        onChange(newProgress)
    }

    const showAddVisitButton = (step: ProgressStep, index: number) => {
        if (!step.name.includes("回目訪問") && step.name !== "2回目訪問") return false
        const nextStep = progress[index + 1]
        return nextStep && !nextStep.name.includes("回目訪問")
    }

    return (
        <div className="space-y-4 col-span-2 border-t pt-6">
            <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">進捗管理</Label>
            </div>
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
                        {showAddVisitButton(step, index) && (
                            <div className="col-span-12 pt-2 text-center">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddVisit(index)}
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
