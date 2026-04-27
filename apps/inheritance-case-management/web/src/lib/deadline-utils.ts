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

/** 期限までの残日数に基づくスタイルとバッジテキスト（常時返す） */
export function getDeadlineStatus(deadline: Date): { className: string; badge: string; badgeClassName: string } {
    const now = new Date()
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft < 0) {
        return {
            className: "text-black font-bold",
            badge: "期限超過",
            badgeClassName: "border border-black bg-white text-black",
        }
    }
    if (daysLeft <= DEADLINE_URGENT_DAYS) {
        return {
            className: "text-black font-semibold",
            badge: `残${daysLeft}日`,
            badgeClassName: "border border-black/20 bg-white text-black",
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
