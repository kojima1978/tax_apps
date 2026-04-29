"use client"

import { useState, useCallback } from "react"
import type { InheritanceCase, ProgressStep } from "@/types/shared"
import { updateCase } from "@/lib/api/cases"
import { toProgressSteps, toProgressItems } from "@/lib/case-converters"
import { isConflictError, CONFLICT_MESSAGE } from "@/lib/error-utils"
import { useToast } from "@/components/ui/Toast"

function todayStr(): string {
    return new Date().toISOString().slice(0, 10)
}

function isOptionalVisitStep(stepName: string): boolean {
    const match = stepName.match(/^(\d+)回目訪問$/)
    return !!match && Number(match[1]) >= 2
}

export function ProgressDots({ caseData }: { caseData: InheritanceCase }) {
    const toast = useToast()
    const [isSaving, setIsSaving] = useState(false)
    const steps = caseData.progress ?? []
    const visibleSteps = steps
        .map((step, originalIndex) => ({ step, originalIndex }))
        .filter(({ step }) => !isOptionalVisitStep(step.name))

    const handleToggle = useCallback(async (stepIndex: number) => {
        if (isSaving) return
        const currentSteps = toProgressSteps(caseData.progress ?? [])
        if (currentSteps.length === 0) return

        const target = currentSteps[stepIndex]
        const today = todayStr()
        const newDate = target.date ? null : today
        const message = target.date
            ? `${target.name} の完了日（${target.date}）を削除しますか？`
            : `${target.name} に今日の日付（${today}）を入力しますか？`

        if (!window.confirm(message)) return

        const newSteps: ProgressStep[] = currentSteps.map((s, i) =>
            i === stepIndex ? { ...s, date: newDate } : s
        )

        const prevProgress = caseData.progress
        caseData.progress = toProgressItems(newSteps)

        setIsSaving(true)
        try {
            const updatedAt = caseData.updatedAt ? new Date(caseData.updatedAt).toISOString() : undefined
            const result = await updateCase(caseData.id, { progress: newSteps }, updatedAt)
            caseData.progress = result.progress ?? toProgressItems(newSteps)
            caseData.updatedAt = result.updatedAt
        } catch (e) {
            caseData.progress = prevProgress
            if (isConflictError(e)) {
                toast.error(CONFLICT_MESSAGE)
            } else {
                toast.error("進捗の更新に失敗しました")
            }
        } finally {
            setIsSaving(false)
        }
    }, [caseData, isSaving, toast])

    if (visibleSteps.length === 0) return null

    const firstIncompleteIdx = visibleSteps.find(({ step }) => !step.date)?.originalIndex ?? -1

    return (
        <div className="flex h-5 items-center gap-[2px]">
            {visibleSteps.map(({ step, originalIndex }) => {
                const isComplete = !!step.date
                const isCurrent = originalIndex === firstIncompleteIdx
                return (
                    <button
                        key={step.stepId}
                        type="button"
                        disabled={isSaving}
                        className={`h-1.5 w-1.5 rounded-full transition-colors ${
                            isComplete
                                ? "bg-black hover:bg-black/80"
                                : isCurrent
                                    ? "bg-black/60 animate-pulse hover:bg-black/50"
                                    : "bg-white border border-black/20 hover:bg-gray-50"
                        } ${isSaving ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                        title={`${step.name}${step.date ? ` (${step.date})` : ""}\nクリックで切替`}
                        onClick={(e) => {
                            e.stopPropagation()
                            handleToggle(originalIndex)
                        }}
                    />
                )
            })}
        </div>
    )
}
