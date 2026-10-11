import { z } from "zod"

export const LIST_COLUMN_OPTIONS = [
    { id: "dateOfDeath", label: "申告期限" },
    { id: "status", label: "進捗" },
    { id: "assignee", label: "担当" },
    { id: "amount", label: "売上" },
    { id: "paymentDates", label: "請求・入金日" },
    { id: "summary", label: "特記事項" },
] as const

type ListColumnId = typeof LIST_COLUMN_OPTIONS[number]["id"]
export const LIST_VIEWS: Record<"standard" | "deadlines" | "finance", { label: string; columns: ListColumnId[] }> = {
    standard: { label: "標準", columns: LIST_COLUMN_OPTIONS.filter(c => c.id !== "paymentDates").map(c => c.id) },
    deadlines: { label: "期限・進捗中心", columns: ["dateOfDeath", "status", "assignee", "summary"] },
    finance: { label: "売上・入金中心", columns: ["status", "assignee", "amount", "paymentDates", "summary"] },
} as const

const caseLinkSchema = z.object({ id: z.number().int().positive(), name: z.string().max(200) })
const preferencesSchema = z.object({
    savedSearches: z.array(z.object({ id: z.string().max(100), name: z.string().min(1).max(40), query: z.string().max(4000) })).max(30).default([]),
    recentCases: z.array(caseLinkSchema).max(10).default([]),
    favorites: z.array(caseLinkSchema).max(50).default([]),
    listView: z.enum(["standard", "deadlines", "finance"]).default("standard"),
    columns: z.array(z.enum(["dateOfDeath", "status", "assignee", "amount", "paymentDates", "summary"])).max(6).optional(),
    density: z.enum(["standard", "compact"]).default("standard"),
})

export type WorkspacePreferences = z.infer<typeof preferencesSchema>
export type CaseLink = z.infer<typeof caseLinkSchema>
export const PREFERENCES_KEY = "itcm:workspace-preferences:v1"
export const PREFERENCES_EVENT = "itcm:preferences-changed"

export function parseWorkspacePreferences(raw: string | null): WorkspacePreferences {
    try {
        const parsed = preferencesSchema.safeParse(raw ? JSON.parse(raw) : {})
        if (parsed.success) return parsed.data
    } catch { /* Invalid stored data falls back to defaults. */ }
    return preferencesSchema.parse({})
}

export function addRecentCase(preferences: WorkspacePreferences, item: CaseLink): WorkspacePreferences {
    return { ...preferences, recentCases: [item, ...preferences.recentCases.filter(c => c.id !== item.id)].slice(0, 10),
        favorites: preferences.favorites.map(c => c.id === item.id ? item : c) }
}

export function toggleFavorite(preferences: WorkspacePreferences, item: CaseLink): WorkspacePreferences {
    return { ...preferences, favorites: preferences.favorites.some(c => c.id === item.id)
        ? preferences.favorites.filter(c => c.id !== item.id)
        : [item, ...preferences.favorites].slice(0, 50) }
}
