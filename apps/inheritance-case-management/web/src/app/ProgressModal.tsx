"use client"

import { useState, useCallback } from "react"
import { MoreHorizontal, Save, Check, Plus, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { SetTodayButton } from "@/components/ui/SetTodayButton"
import type { InheritanceCase, CaseStatus, ProgressStep } from "@/types/shared"
import { updateCase } from "@/lib/api/cases"
import { addVisitStep, shouldShowAddVisit, STEP_NAMES } from "@/lib/progress-utils"
import { toProgressSteps, toProgressItems } from "@/lib/case-converters"
import { useProgressSteps } from "@/hooks/use-progress-steps"
import Link from "next/link"
import { DndContext, closestCenter } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

function SortableRow({
    step,
    index,
    steps,
    checked,
    onToggle,
    onDateChange,
    onMemoChange,
    onAddVisit,
}: {
    step: ProgressStep
    index: number
    steps: ProgressStep[]
    checked: boolean
    onToggle: () => void
    onDateChange: (date: string) => void
    onMemoChange: (memo: string) => void
    onAddVisit: () => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id })

    return (
        <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
            <div className="grid grid-cols-[20px_20px_1fr_130px_1fr] gap-1 p-2 text-sm items-center">
                <button type="button" className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none" {...attributes} {...listeners}>
                    <GripVertical className="h-3.5 w-3.5" />
                </button>
                <input type="checkbox" checked={checked} onChange={onToggle} className="h-3.5 w-3.5 rounded border-gray-300 accent-primary" />
                <div className="font-medium text-xs truncate">{step.name}</div>
                <div>
                    <input type="date" value={step.date || ""} onChange={(e) => onDateChange(e.target.value)} className="w-full text-xs border rounded px-1.5 py-1 bg-background" />
                </div>
                <div>
                    <input type="text" value={step.memo || ""} onChange={(e) => onMemoChange(e.target.value)} placeholder="-" className="w-full text-xs border rounded px-1.5 py-1 bg-background" />
                </div>
            </div>
            {shouldShowAddVisit(steps, step, index) && (
                <div className="px-2 pb-1.5 text-center border-t border-dashed">
                    <button type="button" onClick={onAddVisit} className="text-xs text-primary hover:text-primary/80 py-1 inline-flex items-center gap-1">
                        <Plus className="h-3 w-3" />
                        訪問追加
                    </button>
                </div>
            )}
        </div>
    )
}

/** 進捗ステップの日付入力に応じてステータス変更を提案するルール（優先度順） */
const STATUS_PROMPT_RULES: { stepName: string; status: CaseStatus; excludeStatuses: CaseStatus[]; message: string }[] = [
    { stepName: STEP_NAMES.PAYMENT, status: "入金済", excludeStatuses: ["入金済"], message: `「${STEP_NAMES.PAYMENT}」に日付が入力されました。\nステータスを「入金済」に変更しますか？` },
    { stepName: STEP_NAMES.BILLING, status: "請求済", excludeStatuses: ["請求済", "入金済"], message: `「${STEP_NAMES.BILLING}」に日付が入力されました。\nステータスを「請求済」に変更しますか？` },
    { stepName: STEP_NAMES.FILING, status: "申告済", excludeStatuses: ["申告済", "請求済", "入金済"], message: `「${STEP_NAMES.FILING}」に日付が入力されました。\nステータスを「申告済」に変更しますか？` },
]

function detectStatusPrompt(steps: ProgressStep[], currentStatus: CaseStatus) {
    for (const rule of STATUS_PROMPT_RULES) {
        const step = steps.find(s => s.name === rule.stepName)
        if (step?.date && !rule.excludeStatuses.includes(currentStatus)) {
            return { status: rule.status, message: rule.message }
        }
    }
    return null
}

export function ProgressModalButton({ caseData }: { caseData: InheritanceCase }) {
    const [showModal, setShowModal] = useState(false)
    const [steps, setSteps] = useState<ProgressStep[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const onChange = useCallback((newSteps: ProgressStep[]) => {
        setSteps(newSteps)
        setSaved(false)
    }, [])

    const {
        sensors, stepIds, checkedIds,
        handleDateChange, handleMemoChange, toggleCheck, setTodayForChecked, resetChecked, handleDragEnd,
    } = useProgressSteps({ steps, onChange })

    const openModal = () => {
        setSteps(caseData.progress ? toProgressSteps(caseData.progress) : [])
        setSaved(false)
        resetChecked()
        setShowModal(true)
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const statusPrompt = detectStatusPrompt(steps, caseData.status)
            let newStatus: CaseStatus | undefined
            if (statusPrompt && window.confirm(statusPrompt.message)) {
                newStatus = statusPrompt.status
            }

            await updateCase(caseData.id, { progress: steps, ...(newStatus && { status: newStatus }) })
            if (newStatus) caseData.status = newStatus
            caseData.progress = toProgressItems(steps)
            setSaved(true)
        } catch {
            // エラー時は何もしない
        } finally {
            setIsSaving(false)
        }
    }

    const currentSteps = toProgressSteps(caseData.progress ?? [])
    const hasChanges = JSON.stringify(steps) !== JSON.stringify(currentSteps)

    return (
        <>
            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); openModal() }}>
                <span className="sr-only">進捗を開く</span>
                <MoreHorizontal className="h-4 w-4" />
            </Button>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${caseData.deceasedName} 様 - 進捗`}>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">相続開始日: {caseData.dateOfDeath}</div>
                        <SetTodayButton count={checkedIds.size} onClick={setTodayForChecked} />
                    </div>

                    <div className="border rounded-md divide-y">
                        <div className="grid grid-cols-[20px_20px_1fr_130px_1fr] gap-1 bg-muted/50 p-2 text-xs font-semibold">
                            <div /><div />
                            <div>工程</div><div>完了日</div><div>備考</div>
                        </div>
                        {steps.length > 0 ? (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
                                    {steps.map((step, index) => (
                                        <SortableRow
                                            key={step.id}
                                            step={step}
                                            index={index}
                                            steps={steps}
                                            checked={checkedIds.has(step.id)}
                                            onToggle={() => toggleCheck(step.id)}
                                            onDateChange={(date) => handleDateChange(step.id, date)}
                                            onMemoChange={(memo) => handleMemoChange(step.id, memo)}
                                            onAddVisit={() => onChange(addVisitStep(steps, index))}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        ) : (
                            <div className="p-4 text-center text-muted-foreground text-sm">進捗データがありません</div>
                        )}
                    </div>

                    <div className="flex justify-between pt-4 border-t">
                        <Link href={`/${caseData.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline" size="sm">詳細を編集</Button>
                        </Link>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>閉じる</Button>
                            {steps.length > 0 && (
                                <Button size="sm" onClick={handleSave} disabled={isSaving || !hasChanges}>
                                    {saved ? (<><Check className="mr-1.5 h-3.5 w-3.5" />保存済み</>) : (<><Save className="mr-1.5 h-3.5 w-3.5" />{isSaving ? "保存中..." : "保存"}</>)}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    )
}
