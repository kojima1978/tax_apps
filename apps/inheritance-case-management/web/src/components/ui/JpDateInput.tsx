"use client"

import { useEffect, useState } from "react"
import { Input } from "./Input"
import {
    JAPANESE_ERAS,
    gregorianToWareki,
    warekiToGregorian,
    type JapaneseEra,
} from "@/lib/japanese-era"

interface JpDateInputProps {
    value: string                 // YYYY-MM-DD or ""
    onChange: (value: string) => void
    id?: string
    className?: string
    disabled?: boolean
}

type Mode = "seireki" | "wareki"

export function JpDateInput({ value, onChange, id, className, disabled }: JpDateInputProps) {
    const [mode, setMode] = useState<Mode>(() => {
        if (!value) return "seireki"
        const w = gregorianToWareki(value)
        return w && w.era.startYear < 1989 ? "wareki" : "seireki"
    })

    const w = value ? gregorianToWareki(value) : null
    const [eraCode, setEraCode] = useState<JapaneseEra["code"]>(w?.era.code ?? "reiwa")
    const [eraYear, setEraYear] = useState<string>(w ? String(w.eraYear) : "")
    const [month, setMonth] = useState<string>(w ? String(w.month) : "")
    const [day, setDay] = useState<string>(w ? String(w.day) : "")

    useEffect(() => {
        const next = value ? gregorianToWareki(value) : null
        if (next) {
            setEraCode(next.era.code)
            setEraYear(String(next.eraYear))
            setMonth(String(next.month))
            setDay(String(next.day))
        } else {
            setEraYear("")
            setMonth("")
            setDay("")
        }
    }, [value])

    const commitWareki = (code: JapaneseEra["code"], y: string, m: string, d: string) => {
        const yi = Number(y), mi = Number(m), di = Number(d)
        if (!y || !m || !d || !Number.isFinite(yi) || !Number.isFinite(mi) || !Number.isFinite(di)) {
            onChange("")
            return
        }
        const result = warekiToGregorian(code, yi, mi, di)
        onChange(result ?? "")
    }

    if (mode === "wareki") {
        return (
            <div className={`flex items-center gap-1 ${className ?? ""}`}>
                <select
                    id={id}
                    value={eraCode}
                    disabled={disabled}
                    onChange={(e) => {
                        const v = e.target.value as JapaneseEra["code"]
                        setEraCode(v)
                        commitWareki(v, eraYear, month, day)
                    }}
                    className="h-10 rounded-md border-2 border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    {JAPANESE_ERAS.map(e => (
                        <option key={e.code} value={e.code}>{e.label}</option>
                    ))}
                </select>
                <Input
                    type="number"
                    min={1}
                    max={99}
                    inputMode="numeric"
                    value={eraYear}
                    disabled={disabled}
                    onChange={(e) => { setEraYear(e.target.value); commitWareki(eraCode, e.target.value, month, day) }}
                    className="w-16 text-center"
                    placeholder="年"
                />
                <span className="text-sm text-muted-foreground">年</span>
                <Input
                    type="number"
                    min={1}
                    max={12}
                    inputMode="numeric"
                    value={month}
                    disabled={disabled}
                    onChange={(e) => { setMonth(e.target.value); commitWareki(eraCode, eraYear, e.target.value, day) }}
                    className="w-14 text-center"
                    placeholder="月"
                />
                <span className="text-sm text-muted-foreground">月</span>
                <Input
                    type="number"
                    min={1}
                    max={31}
                    inputMode="numeric"
                    value={day}
                    disabled={disabled}
                    onChange={(e) => { setDay(e.target.value); commitWareki(eraCode, eraYear, month, e.target.value) }}
                    className="w-14 text-center"
                    placeholder="日"
                />
                <span className="text-sm text-muted-foreground">日</span>
                <button
                    type="button"
                    className="ml-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setMode("seireki")}
                    title="西暦入力に切替"
                    disabled={disabled}
                >
                    西暦
                </button>
            </div>
        )
    }

    return (
        <div className={`flex items-center gap-1 ${className ?? ""}`}>
            <Input
                id={id}
                type="date"
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1"
            />
            <button
                type="button"
                className="px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setMode("wareki")}
                title="和暦入力に切替"
                disabled={disabled}
            >
                和暦
            </button>
        </div>
    )
}
