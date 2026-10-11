import { z } from "zod"

const KEY = "itcm:case-list-navigation:v1"
const schema = z.object({
    query: z.string(), scrollY: z.number().nonnegative(), openedId: z.number().int().positive(),
    cases: z.array(z.object({ id: z.number().int().positive(), name: z.string() })).max(100),
})
export type CaseListNavigation = z.infer<typeof schema>

export function readCaseListNavigation(): CaseListNavigation | null {
    if (typeof window === "undefined") return null
    try { return schema.parse(JSON.parse(sessionStorage.getItem(KEY) ?? "null")) } catch { return null }
}

export function saveCaseListNavigation(context: CaseListNavigation) {
    try { sessionStorage.setItem(KEY, JSON.stringify(context)) } catch { /* Navigation remains usable without browser storage. */ }
}

export function getCaseListReturnHref(id: number): string {
    const context = readCaseListNavigation()
    return context?.cases.some(item => item.id === id) ? `/${context.query ? `?${context.query}` : ""}` : "/"
}
