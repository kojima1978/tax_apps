"use client"

import { useRef, useState, useCallback } from "react"
import { ChevronDown } from "lucide-react"
import { useClickOutside } from "@/hooks/use-click-outside"

interface MultiSelectDropdownProps {
    placeholder: string
    options: readonly { value: string | number; label: string }[]
    selected: Set<string>
    onChange: (values: Set<string>) => void
}

export function MultiSelectDropdown({ placeholder, options, selected, onChange }: MultiSelectDropdownProps) {
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
                className={`h-10 px-3 text-sm border rounded-md bg-background flex items-center gap-1.5 min-w-[100px] ${selected.size > 0 ? "border-primary text-foreground" : "text-muted-foreground"}`}
            >
                <span className="truncate">{label}</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="absolute z-50 mt-1 bg-white border rounded-md shadow-md py-1 min-w-[180px]">
                    {options.map(({ value, label: optLabel }) => {
                        const val = String(value)
                        const checked = selected.has(val)
                        return (
                            <label key={val} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted cursor-pointer">
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
                            className="w-full text-xs text-muted-foreground hover:text-foreground py-1.5 border-t"
                        >
                            クリア
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
