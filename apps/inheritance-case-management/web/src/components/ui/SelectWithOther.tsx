"use client"

import { useState } from "react"
import { Input } from "./Input"

interface SelectWithOtherProps {
    options: readonly string[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    otherPlaceholder?: string
    className?: string
    id?: string
}

const OTHER_VALUE = "__other__"

export function SelectWithOther({
    options,
    value,
    onChange,
    placeholder = "選択してください",
    otherPlaceholder = "自由入力",
    className,
    id,
}: SelectWithOtherProps) {
    const [otherChosen, setOtherChosen] = useState(false)
    const valueIsOther = value !== "" && !options.includes(value)
    const mode: "select" | "other" = otherChosen || valueIsOther ? "other" : "select"

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const v = e.target.value
        if (v === OTHER_VALUE) {
            setOtherChosen(true)
            onChange("")
        } else {
            setOtherChosen(false)
            onChange(v)
        }
    }

    if (mode === "other") {
        return (
            <div className={`flex gap-1 ${className ?? ""}`}>
                <Input
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={otherPlaceholder}
                    className="flex-1"
                />
                <button
                    type="button"
                    className="px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => { setOtherChosen(false); onChange("") }}
                    title="候補から選択に戻る"
                >
                    候補
                </button>
            </div>
        )
    }

    return (
        <select
            id={id}
            value={value}
            onChange={handleSelectChange}
            className={`h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${className ?? ""}`}
        >
            <option value="">{placeholder}</option>
            {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
            <option value={OTHER_VALUE}>その他（自由入力）</option>
        </select>
    )
}
