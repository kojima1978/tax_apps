"use client"

import { useState, useCallback, useEffect } from "react"

const STORAGE_KEY = "itcm-section-state"

type SectionStates = Record<string, boolean>

interface SectionStateOptions {
    /** localStorage に保存するか（デフォルト: true） */
    persist?: boolean
}

/**
 * セクション開閉状態の管理（localStorage永続化 + すべて開く/閉じる）
 *
 * @param sectionIds セクション識別子の配列
 * @param defaults セクションIDごとの初期値
 * @param options オプション
 */
export function useSectionState(
    sectionIds: string[],
    defaults: Record<string, boolean>,
    options: SectionStateOptions = {},
) {
    const { persist = true } = options

    const [states, setStates] = useState<SectionStates>(() => {
        if (persist) {
            try {
                const stored = localStorage.getItem(STORAGE_KEY)
                if (stored) {
                    const parsed = JSON.parse(stored) as SectionStates
                    const merged: SectionStates = {}
                    for (const id of sectionIds) {
                        merged[id] = id in parsed ? parsed[id] : (defaults[id] ?? false)
                    }
                    return merged
                }
            } catch { /* ignore */ }
        }
        return { ...defaults }
    })

    useEffect(() => {
        if (!persist) return
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(states))
        } catch { /* ignore */ }
    }, [states, persist])

    const toggle = useCallback((id: string) => {
        setStates(prev => ({ ...prev, [id]: !prev[id] }))
    }, [])

    const isOpen = useCallback((id: string) => states[id] ?? false, [states])

    const allOpen = sectionIds.every(id => states[id])

    const toggleAll = useCallback(() => {
        const newValue = !allOpen
        setStates(prev => {
            const next: SectionStates = { ...prev }
            for (const id of sectionIds) next[id] = newValue
            return next
        })
    }, [allOpen, sectionIds])

    return { isOpen, toggle, allOpen, toggleAll }
}
