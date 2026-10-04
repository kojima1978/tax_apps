"use client"

import { useState } from "react"
import { Input } from "./Input"
import {
    JAPANESE_ERAS,
    convertWareki,
    eraLastYear,
    gregorianToWareki,
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

function getWarekiInputParts(value: string) {
    const w = value ? gregorianToWareki(value) : null
    return {
        eraCode: w?.era.code ?? "reiwa",
        eraYear: w ? String(w.eraYear) : "",
        month: w ? String(w.month) : "",
        day: w ? String(w.day) : "",
    }
}

type WarekiDateFieldsProps = JpDateInputProps & {
    onSwitchMode: () => void
}

function WarekiDateFields({ value, onChange, id, className, disabled, onSwitchMode }: WarekiDateFieldsProps) {
    const initial = getWarekiInputParts(value)
    const [eraCode, setEraCode] = useState<JapaneseEra["code"]>(initial.eraCode)
    const [eraYear, setEraYear] = useState<string>(initial.eraYear)
    const [month, setMonth] = useState<string>(initial.month)
    const [day, setDay] = useState<string>(initial.day)
    const [error, setError] = useState<string | null>(null)

    // 自分が出した値が親から返ってきただけなのか、外から別の値が入ったのかを見分ける。
    // 入力途中に値が空になるたび入力欄を作り直すと、打ちかけの月日と下の理由まで消える。
    const [emitted, setEmitted] = useState<string | null>(null)
    const [lastValue, setLastValue] = useState(value)
    if (value !== lastValue) {
        setLastValue(value)
        if (value !== emitted) {
            const parts = getWarekiInputParts(value)
            setEraCode(parts.eraCode)
            setEraYear(parts.eraYear)
            setMonth(parts.month)
            setDay(parts.day)
            setError(null)
        }
    }

    // 誤った日付は保存しない（値は空にする）が、空にした理由は欄の下に出す。
    // 「平成4年」から「平成40年」へ打ち替える途中は必ず一度おかしな値を通るので、
    // 黙って消すと「入れたのに保存されない」になる。
    const commitWareki = (code: JapaneseEra["code"], y: string, m: string, d: string) => {
        // どれかが空のうちは「入力途中」なので理由も出さない
        const result = (!y || !m || !d) ? null : convertWareki(code, Number(y), Number(m), Number(d))
        setError(result && !result.ok ? result.reason : null)
        const next = result?.ok ? result.value : ""
        setEmitted(next)
        onChange(next)
    }

    return (
        <div className={className}>
            <div className="flex items-center gap-1">
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
                    max={eraLastYear(eraCode) ?? 99}
                    inputMode="numeric"
                    value={eraYear}
                    disabled={disabled}
                    aria-invalid={error ? true : undefined}
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
                    onClick={onSwitchMode}
                    title="西暦入力に切替"
                    disabled={disabled}
                >
                    西暦
                </button>
            </div>
            {error && (
                <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>
            )}
        </div>
    )
}

export function JpDateInput({ value, onChange, id, className, disabled }: JpDateInputProps) {
    const [mode, setMode] = useState<Mode>(() => {
        if (!value) return "seireki"
        const w = gregorianToWareki(value)
        return w && w.era.startYear < 1989 ? "wareki" : "seireki"
    })

    if (mode === "wareki") {
        return (
            <WarekiDateFields
                value={value}
                onChange={onChange}
                id={id}
                className={className}
                disabled={disabled}
                onSwitchMode={() => setMode("seireki")}
            />
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
