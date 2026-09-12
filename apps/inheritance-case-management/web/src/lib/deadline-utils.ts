/** 申告期限 = 相続開始日 + N ヶ月 */
const DECLARATION_DEADLINE_MONTHS = 10
/** 赤色警告の閾値（日） */
const DEADLINE_URGENT_DAYS = 14
/** 黄色警告の閾値（日） */
const DEADLINE_WARNING_DAYS = 30

/** 相続開始日から申告期限（10ヶ月後）を計算 */
export function getDeadlineDate(dateOfDeath: string | Date): Date {
    const death = new Date(dateOfDeath)
    const deadline = new Date(death)
    deadline.setUTCMonth(deadline.getUTCMonth() + DECLARATION_DEADLINE_MONTHS)
    return deadline
}

/** 期限までの残日数に基づくスタイルとバッジテキスト（常時返す） */
export function getDeadlineStatus(deadline: Date): { className: string; badge: string; badgeClassName: string } {
    const now = new Date()
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    const dueDay = Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth(), deadline.getUTCDate())
    const daysLeft = Math.round((dueDay - today) / 86400000)

    if (daysLeft < 0) {
        return {
            className: "text-red-700 font-bold",
            badge: "期限超過",
            badgeClassName: "border border-red-200 bg-red-50 text-red-700",
        }
    }
    if (daysLeft <= DEADLINE_URGENT_DAYS) {
        return {
            className: "text-amber-800 font-semibold",
            badge: `残${daysLeft}日`,
            badgeClassName: "border border-amber-200 bg-amber-50 text-amber-800",
        }
    }
    if (daysLeft <= DEADLINE_WARNING_DAYS) {
        return {
            className: "text-black font-medium",
            badge: `残${daysLeft}日`,
            badgeClassName: "border border-black/10 bg-white text-black",
        }
    }
    return {
        className: "",
        badge: `残${daysLeft}日`,
        badgeClassName: "border border-black/10 bg-white text-black",
    }
}
