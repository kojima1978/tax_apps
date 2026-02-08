import type { Referrer } from "@tax-apps/shared"

export type { Referrer } from "@tax-apps/shared"

export const initialReferrers: Referrer[] = [
    { id: "1", company: "銀行A", department: "本店営業部", name: "佐藤 銀行員", active: true },
    { id: "2", company: "銀行B", name: "鈴木 担当", active: true },
    { id: "3", company: "葬儀社A", name: "高橋 担当", active: true },
    { id: "4", company: "税理士法人D", name: "田中 税理士", active: true },
]
