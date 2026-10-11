export const ANALYTICS_TABS = ["overview", "trend", "breakdown", "referrer"] as const
export type AnalyticsTab = typeof ANALYTICS_TABS[number]
export const ALL_DEPARTMENTS_VALUE = "__all__"

export function parseAnalyticsView(search: string, currentYear: number, currentMonth: string) {
    const params = new URLSearchParams(search)
    const rawYears = params.get("years")
    const years = rawYears === "all" ? [] : [...new Set((rawYears ?? String(currentYear)).split(",").map(Number).filter(year => Number.isInteger(year) && year >= 1900 && year <= 2200))]
    const rawTab = params.get("tab")
    const tab = ANALYTICS_TABS.includes(rawTab as AnalyticsTab) ? rawTab as AnalyticsTab : "overview"
    const rawMonth = params.get("baseMonth")
    const baseMonth = rawMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) && rawMonth <= currentMonth ? rawMonth : currentMonth
    return { tab, years: rawYears === "all" ? [] : years.length ? years : [currentYear], baseMonth, department: params.get("department") || ALL_DEPARTMENTS_VALUE }
}

export function updateAnalyticsUrl(search: string, view: ReturnType<typeof parseAnalyticsView>, currentMonth: string) {
    const params = new URLSearchParams(search)
    params.set("tab", view.tab)
    params.set("years", view.years.length ? [...view.years].sort((a, b) => b - a).join(",") : "all")
    if (view.baseMonth === currentMonth) params.delete("baseMonth")
    else params.set("baseMonth", view.baseMonth)
    if (view.department === ALL_DEPARTMENTS_VALUE) params.delete("department")
    else params.set("department", view.department)
    return params.toString()
}
