import { useState, useMemo, useCallback } from "react"
import type { ProgressStep } from "@/types/shared"
import {
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable"

interface UseProgressStepsOptions {
    steps: ProgressStep[]
    onChange: (steps: ProgressStep[]) => void
}

export function useProgressSteps({ steps, onChange }: UseProgressStepsOptions) {
    const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const stepIds = useMemo(() => steps.map((s) => s.id), [steps])

    const handleDateChange = useCallback((stepId: string, date: string) => {
        onChange(steps.map((s) => (s.id === stepId ? { ...s, date: date || null } : s)))
    }, [steps, onChange])

    const handleMemoChange = useCallback((stepId: string, memo: string) => {
        onChange(steps.map((s) => (s.id === stepId ? { ...s, memo } : s)))
    }, [steps, onChange])

    const handleStepChange = useCallback((index: number, field: "date" | "memo", value: string) => {
        const updated = [...steps]
        updated[index] = {
            ...updated[index],
            ...(field === "date" ? { date: value || null } : { memo: value }),
        }
        onChange(updated)
    }, [steps, onChange])

    const toggleCheck = useCallback((stepId: string) => {
        setCheckedIds((prev) => {
            const next = new Set(prev)
            if (next.has(stepId)) next.delete(stepId)
            else next.add(stepId)
            return next
        })
    }, [])

    const setTodayForChecked = useCallback(() => {
        const today = new Date().toISOString().split("T")[0]
        onChange(steps.map((s) => (checkedIds.has(s.id) ? { ...s, date: today } : s)))
        setCheckedIds(new Set())
    }, [steps, checkedIds, onChange])

    const resetChecked = useCallback(() => setCheckedIds(new Set()), [])

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIndex = steps.findIndex((s) => s.id === active.id)
        const newIndex = steps.findIndex((s) => s.id === over.id)
        onChange(arrayMove(steps, oldIndex, newIndex))
    }, [steps, onChange])

    return {
        sensors,
        stepIds,
        checkedIds,
        handleDateChange,
        handleMemoChange,
        handleStepChange,
        toggleCheck,
        setTodayForChecked,
        resetChecked,
        handleDragEnd,
    }
}
