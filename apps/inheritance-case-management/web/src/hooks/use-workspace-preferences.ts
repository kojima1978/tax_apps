"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"
import { parseWorkspacePreferences, PREFERENCES_EVENT, PREFERENCES_KEY, type WorkspacePreferences } from "@/lib/workspace-preferences"

function subscribe(callback: () => void) {
    window.addEventListener("storage", callback)
    window.addEventListener(PREFERENCES_EVENT, callback)
    return () => {
        window.removeEventListener("storage", callback)
        window.removeEventListener(PREFERENCES_EVENT, callback)
    }
}

function getSnapshot() {
    try { return window.localStorage.getItem(PREFERENCES_KEY) } catch { return null }
}

export function useWorkspacePreferences() {
    const raw = useSyncExternalStore(subscribe, getSnapshot, () => null)
    const preferences = useMemo(() => parseWorkspacePreferences(raw), [raw])
    const updatePreferences = useCallback((update: (current: WorkspacePreferences) => WorkspacePreferences): boolean => {
        try {
            window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(update(parseWorkspacePreferences(getSnapshot()))))
            window.dispatchEvent(new Event(PREFERENCES_EVENT))
            return true
        } catch { return false }
    }, [])
    return { preferences, updatePreferences }
}
