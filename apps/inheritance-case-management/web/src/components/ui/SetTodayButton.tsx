"use client"

import { CalendarCheck } from "lucide-react"
import { Button } from "./Button"

export function SetTodayButton({ count, onClick }: { count: number; onClick: () => void }) {
    if (count === 0) return null
    return (
        <Button type="button" variant="outline" size="sm" onClick={onClick}>
            <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
            今日の日付を設定 ({count}件)
        </Button>
    )
}
