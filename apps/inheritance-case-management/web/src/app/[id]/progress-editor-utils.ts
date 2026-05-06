export function todayIsoDate() {
    const today = new Date()
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset())
    return today.toISOString().slice(0, 10)
}

export function isCompletedHandlingStatus(value: string) {
    return value === "対応終了" || value === "対応終了（未分割）"
}
