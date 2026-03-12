"use client"

import { useState } from "react"
import { MoreHorizontal, Save, Check, Plus } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import type { InheritanceCase, ProgressStep } from "@/types/shared"
import { updateCase } from "@/lib/api/cases"
import { addVisitStep, shouldShowAddVisit } from "@/lib/progress-utils"
import { toProgressSteps, toProgressItems } from "@/lib/case-converters"
import Link from "next/link"

export function ProgressModalButton({ caseData }: { caseData: InheritanceCase }) {
    const [showModal, setShowModal] = useState(false)
    const [steps, setSteps] = useState<ProgressStep[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const openModal = () => {
        setSteps(caseData.progress ? toProgressSteps(caseData.progress) : [])
        setSaved(false)
        setShowModal(true)
    }

    const handleDateChange = (stepId: string, date: string) => {
        setSteps((prev) =>
            prev.map((s) => (s.id === stepId ? { ...s, date: date || null } : s))
        )
        setSaved(false)
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await updateCase(caseData.id, { progress: steps })
            // Update caseData with normalized shape
            caseData.progress = toProgressItems(steps)
            setSaved(true)
        } catch {
            // エラー時は何もしない（モーダルは開いたまま）
        } finally {
            setIsSaving(false)
        }
    }

    // Compare using stepId-based shape for both sides
    const currentSteps = toProgressSteps(caseData.progress ?? [])
    const hasChanges = JSON.stringify(steps) !== JSON.stringify(currentSteps)

    return (
        <>
            <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                    e.stopPropagation()
                    openModal()
                }}
            >
                <span className="sr-only">進捗を開く</span>
                <MoreHorizontal className="h-4 w-4" />
            </Button>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={`${caseData.deceasedName} 様 - 進捗`}
            >
                <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        相続開始日: {caseData.dateOfDeath}
                    </div>

                    <div className="border rounded-md divide-y">
                        <div className="grid grid-cols-12 bg-muted/50 p-2 text-xs font-semibold">
                            <div className="col-span-4">工程</div>
                            <div className="col-span-4">完了日</div>
                            <div className="col-span-4">備考</div>
                        </div>
                        {steps.length > 0 ? (
                            steps.map((step, index) => (
                                <div key={step.id}>
                                    <div className="grid grid-cols-12 p-2 text-sm items-center">
                                        <div className="col-span-4 font-medium text-xs">{step.name}</div>
                                        <div className="col-span-4">
                                            <input
                                                type="date"
                                                value={step.date || ""}
                                                onChange={(e) => handleDateChange(step.id, e.target.value)}
                                                className="w-full text-xs border rounded px-1.5 py-1 bg-background"
                                            />
                                        </div>
                                        <div className="col-span-4 text-xs text-muted-foreground truncate pl-1">
                                            {step.memo || "-"}
                                        </div>
                                    </div>
                                    {shouldShowAddVisit(steps, step, index) && (
                                        <div className="px-2 pb-1.5 text-center border-t border-dashed">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSteps(addVisitStep(steps, index))
                                                    setSaved(false)
                                                }}
                                                className="text-xs text-primary hover:text-primary/80 py-1 inline-flex items-center gap-1"
                                            >
                                                <Plus className="h-3 w-3" />
                                                訪問追加
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-muted-foreground text-sm">
                                進捗データがありません
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between pt-4 border-t">
                        <Link href={`/${caseData.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline" size="sm">
                                詳細を編集
                            </Button>
                        </Link>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>
                                閉じる
                            </Button>
                            {steps.length > 0 && (
                                <Button
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={isSaving || !hasChanges}
                                >
                                    {saved ? (
                                        <>
                                            <Check className="mr-1.5 h-3.5 w-3.5" />
                                            保存済み
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-1.5 h-3.5 w-3.5" />
                                            {isSaving ? "保存中..." : "保存"}
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    )
}
