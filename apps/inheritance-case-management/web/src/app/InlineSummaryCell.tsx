"use client"

import { useState, useRef, useEffect } from "react"
import type { InheritanceCase } from "@/types/shared"
import { updateCase } from "@/lib/api/cases"
import { MAX_SUMMARY_LENGTH } from "@/types/constants"

export function InlineSummaryCell({ caseData }: { caseData: InheritanceCase }) {
    const [isEditing, setIsEditing] = useState(false)
    const [value, setValue] = useState(caseData.summary || "")
    const [isSaving, setIsSaving] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setValue(caseData.summary || "")
    }, [caseData.summary])

    useEffect(() => {
        if (isEditing) inputRef.current?.focus()
    }, [isEditing])

    const save = async (newValue: string) => {
        const trimmed = newValue.trim()
        if (trimmed === (caseData.summary || "")) {
            setIsEditing(false)
            return
        }
        setIsSaving(true)
        try {
            await updateCase(caseData.id, { summary: trimmed || null })
            caseData.summary = trimmed || undefined
            setValue(trimmed)
        } catch {
            setValue(caseData.summary || "")
        } finally {
            setIsSaving(false)
            setIsEditing(false)
        }
    }

    if (isEditing) {
        return (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    maxLength={MAX_SUMMARY_LENGTH}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={() => save(value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") save(value)
                        if (e.key === "Escape") {
                            setValue(caseData.summary || "")
                            setIsEditing(false)
                        }
                    }}
                    className="w-full text-xs border rounded px-1.5 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    disabled={isSaving}
                />
                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">
                    {value.length}/{MAX_SUMMARY_LENGTH}
                </span>
            </div>
        )
    }

    return (
        <div
            className="text-xs cursor-pointer hover:bg-muted/50 rounded px-1.5 py-1 min-h-[28px] flex items-center min-w-[80px]"
            onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
            }}
            title="クリックして編集"
        >
            {value || <span className="text-muted-foreground/50">-</span>}
        </div>
    )
}
