"use client"

import { useRef, useState, useCallback } from "react"
import { Input } from "@/components/ui/Input"
import { useClickOutside } from "@/hooks/use-click-outside"

interface CompanySuggestInputProps {
    value: string
    onChange: (val: string) => void
    suggestions: string[]
    placeholder?: string
    className?: string
    onKeyDown?: (e: React.KeyboardEvent) => void
}

export function CompanySuggestInput({ value, onChange, suggestions, placeholder, className, onKeyDown }: CompanySuggestInputProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const close = useCallback(() => setOpen(false), [])
    useClickOutside(ref, close)

    const filtered = value.trim()
        ? suggestions.filter(s => s !== value && s.includes(value.trim()))
        : []

    return (
        <div ref={ref} className="relative">
            <Input
                placeholder={placeholder}
                value={value}
                onChange={(e) => { onChange(e.target.value); setOpen(true) }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                className={className}
            />
            {open && filtered.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-md py-1 max-h-40 overflow-y-auto">
                    {filtered.map(s => (
                        <button
                            key={s}
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                            onClick={() => { onChange(s); setOpen(false) }}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
