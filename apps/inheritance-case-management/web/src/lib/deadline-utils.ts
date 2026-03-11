/** 相続開始日から申告期限（10ヶ月後）を計算 */
export function getDeadlineDate(dateOfDeath: string | Date): Date {
    const death = new Date(dateOfDeath)
    const deadline = new Date(death)
    deadline.setMonth(deadline.getMonth() + 10)
    return deadline
}

/** 期限までの残日数に基づくスタイルとバッジテキスト */
export function getDeadlineStatus(deadline: Date): { className: string; badge: string; badgeClassName: string } | null {
    const now = new Date()
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft < 0) {
        return {
            className: "text-red-600 font-bold",
            badge: "期限超過",
            badgeClassName: "bg-red-100 text-red-700",
        }
    }
    if (daysLeft <= 30) {
        return {
            className: "text-red-600 font-semibold",
            badge: `残${daysLeft}日`,
            badgeClassName: "bg-red-50 text-red-600",
        }
    }
    if (daysLeft <= 90) {
        return {
            className: "text-amber-600 font-medium",
            badge: `残${daysLeft}日`,
            badgeClassName: "bg-amber-50 text-amber-600",
        }
    }
    return null
}
