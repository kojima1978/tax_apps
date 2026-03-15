/** 申告期限 = 相続開始日 + N ヶ月 */
const DECLARATION_DEADLINE_MONTHS = 10
/** 赤色警告の閾値（日） */
const DEADLINE_URGENT_DAYS = 30
/** 黄色警告の閾値（日） */
const DEADLINE_WARNING_DAYS = 90

/** 相続開始日から申告期限（10ヶ月後）を計算 */
export function getDeadlineDate(dateOfDeath: string | Date): Date {
    const death = new Date(dateOfDeath)
    const deadline = new Date(death)
    deadline.setMonth(deadline.getMonth() + DECLARATION_DEADLINE_MONTHS)
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
    if (daysLeft <= DEADLINE_URGENT_DAYS) {
        return {
            className: "text-red-600 font-semibold",
            badge: `残${daysLeft}日`,
            badgeClassName: "bg-red-50 text-red-600",
        }
    }
    if (daysLeft <= DEADLINE_WARNING_DAYS) {
        return {
            className: "text-amber-600 font-medium",
            badge: `残${daysLeft}日`,
            badgeClassName: "bg-amber-50 text-amber-600",
        }
    }
    return null
}
