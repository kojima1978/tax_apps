
export type Referrer = {
    id: string
    company: string
    department?: string
    name: string
    active?: boolean // true = 有効, false = 無効化済み, undefined = true (下位互換性)
}

export const initialReferrers: Referrer[] = [
    { id: "1", company: "銀行A", department: "本店営業部", name: "佐藤 銀行員" },
    { id: "2", company: "銀行B", name: "鈴木 担当" },
    { id: "3", company: "葬儀社A", name: "高橋 担当" },
    { id: "4", company: "税理士法人D", name: "田中 税理士" },
]
