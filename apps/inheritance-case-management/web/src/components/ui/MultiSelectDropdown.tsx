"use client"

import { useRef, useState, useCallback } from "react"
import { ChevronDown } from "lucide-react"
import { useClickOutside } from "@/hooks/use-click-outside"

interface MultiSelectDropdownProps {
    placeholder: string
    ariaLabel?: string
    options: readonly { value: string | number; label: string }[]
    selected: Set<string>
    onChange: (values: Set<string>) => void
}

export function MultiSelectDropdown({ placeholder, ariaLabel, options, selected, onChange }: MultiSelectDropdownProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const close = useCallback(() => setOpen(false), [])
    useClickOutside(ref, close)

    const toggle = (val: string) => {
        const next = new Set(selected)
        if (next.has(val)) next.delete(val); else next.add(val)
        onChange(next)
    }

    const label = selected.size === 0
        ? placeholder
        : selected.size === 1
            ? options.find(o => selected.has(String(o.value)))?.label || placeholder
            : `${placeholder}(${selected.size})`

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-label={ariaLabel || placeholder}
                aria-expanded={open}
                aria-haspopup="listbox"
                className={`flex h-11 min-w-[112px] items-center gap-1.5 rounded-lg border px-3 text-sm sm:h-10 ${selected.size > 0 ? "border-primary text-foreground" : "text-muted-foreground"}`}
            >
                <span className="truncate">{label}</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="absolute z-50 mt-1 min-w-[200px] rounded-md border bg-white py-1 shadow-md" role="listbox" aria-label={ariaLabel || placeholder}>
                    {options.map(({ value, label: optLabel }) => {
                        const val = String(value)
                        const checked = selected.has(val)
                        return (
                            <label key={val} className="flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggle(val)}
                                    className="h-4 w-4 rounded border-2 border-gray-400 accent-primary bg-white appearance-auto"
                                />
                                {optLabel}
                            </label>
                        )
                    })}
                    {selected.size > 0 && (
                        <button
                            type="button"
                            onClick={() => onChange(new Set())}
                            className="min-h-11 w-full border-t py-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                            クリア
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
