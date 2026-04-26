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

export function ProgressDots({ caseData }: { caseData: InheritanceCase }) {
    const toast = useToast()
    const [isSaving, setIsSaving] = useState(false)
    const steps = caseData.progress ?? []

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

    if (steps.length === 0) return null

    const firstIncompleteIdx = steps.findIndex(s => !s.date)

    return (
        <div className="flex items-center gap-0.5">
            {steps.map((step, i) => {
                const isComplete = !!step.date
                const isCurrent = i === firstIncompleteIdx
                return (
                    <button
                        key={step.stepId}
                        type="button"
                        disabled={isSaving}
                        className={`h-2.5 w-2.5 rounded-full transition-colors ${
                            isComplete
                                ? "bg-green-500 hover:bg-green-400"
                                : isCurrent
                                    ? "bg-blue-400 animate-pulse hover:bg-blue-300"
                                    : "bg-gray-300 hover:bg-gray-400"
                        } ${isSaving ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                        title={`${step.name}${step.date ? ` (${step.date})` : ""}\nクリックで切替`}
                        onClick={(e) => {
                            e.stopPropagation()
                            handleToggle(i)
                        }}
                    />
                )
            })}
        </div>
    )
}
