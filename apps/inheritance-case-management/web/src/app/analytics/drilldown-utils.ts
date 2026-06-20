import { ANALYTICS_STATUS_CSV } from "@/types/constants"

export function appendSelectedYears(params: URLSearchParams, selectedYears: Set<number>) {
    const years = [...selectedYears].sort((a, b) => b - a)
    if (years.length === 1) {
        params.set("fiscalYear", String(years[0]))
    } else if (years.length > 1) {
        params.set("fiscalYears", years.join(","))
    }
}

export function appendAnalyticsStatuses(params: URLSearchParams) {
    params.set("status", ANALYTICS_STATUS_CSV)
}
