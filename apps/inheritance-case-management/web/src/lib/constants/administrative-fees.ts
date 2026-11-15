/**
 * 遺産整理業務の料金表の既定値（伊勢文郎行政書士事務所「相続手続き内容及び料金」）。
 * ここは**初期値だけ**で、運用中の単価は設定画面（/settings/administrative-fees）で
 * 編集した DB の値が正。料金表が1件も無いときにだけこの並びを投入する。
 */
export interface AdministrativeFeeDefault {
    category: string
    name: string
    unitPrice: number
    note?: string
}

/** 手続き分類の並び（料金表・明細の表示順はこの並び） */
export const ADMINISTRATIVE_FEE_CATEGORIES = [
    "戸籍収集",
    "法定相続一覧図",
    "不動産情報取得",
    "金融機関",
    "生命保険契約照会",
    "遺産分割協議書作成",
    "相続登記（不動産名義変更）",
    "その他",
    "生前：事前の備え",
] as const

export const DEFAULT_ADMINISTRATIVE_FEE_ITEMS: readonly AdministrativeFeeDefault[] = [
    { category: "戸籍収集", name: "被相続人（出生〜死亡戸籍、除籍、除票）", unitPrice: 4000 },
    { category: "戸籍収集", name: "相続人1人につき（戸籍抄本、住民票）", unitPrice: 2000 },
    { category: "法定相続一覧図", name: "法定相続一覧図作成、申出、受領（法務局発行）", unitPrice: 20000 },
    { category: "不動産情報取得", name: "ネット謄本（1筆）", unitPrice: 500 },
    { category: "不動産情報取得", name: "固定資産評価証明書", unitPrice: 2000 },
    { category: "金融機関", name: "残高証明書（1金融機関）", unitPrice: 8000 },
    { category: "金融機関", name: "取引履歴（1金融機関）", unitPrice: 8000 },
    { category: "金融機関", name: "残高証明書・取引履歴の同時取得（1金融機関）", unitPrice: 10000 },
    { category: "金融機関", name: "預貯金照会（ゆうちょ）", unitPrice: 5000 },
    { category: "金融機関", name: "残高証明書（ゆうちょ）", unitPrice: 5000 },
    { category: "金融機関", name: "取引履歴（ゆうちょ）", unitPrice: 5000 },
    { category: "金融機関", name: "解約手続き（1金融機関）", unitPrice: 20000 },
    { category: "生命保険契約照会", name: "生命保険契約照会", unitPrice: 3000 },
    { category: "遺産分割協議書作成", name: "遺産分割協議書作成", unitPrice: 30000 },
    { category: "相続登記（不動産名義変更）", name: "戸籍収集／不動産情報取得／相続関係図／遺産分割協議書", unitPrice: 50000, note: "登記業務は提携先の司法書士へ依頼" },
    { category: "その他", name: "未登記家屋届出", unitPrice: 8000 },
    { category: "その他", name: "農地・山林所有者変更届", unitPrice: 10000 },
    { category: "その他", name: "自動車名義変更", unitPrice: 10000 },
    { category: "その他", name: "車庫証明が必要な場合", unitPrice: 10000 },
    { category: "その他", name: "ゴルフ会員権", unitPrice: 10000 },
    { category: "その他", name: "役員変更登記", unitPrice: 16000 },
    { category: "その他", name: "許可、登録役員変更届", unitPrice: 10000 },
    { category: "生前：事前の備え", name: "公正証書遺言書作成支援", unitPrice: 100000 },
]

/** 料金表の下に出す注記（料金表の紙に載っているもの） */
export const ADMINISTRATIVE_FEE_NOTES = [
    "上記料金に実費は含まれておりません。",
    "登記業務につきましては弊社提携先の司法書士へ依頼いたします。",
    "上記内容は代表的なものでありさまざまなケースにご対応させていただきます。",
] as const

/** 分類の並び順（料金表に無い分類は末尾） */
export function administrativeFeeCategoryOrder(category: string): number {
    const index = (ADMINISTRATIVE_FEE_CATEGORIES as readonly string[]).indexOf(category)
    return index === -1 ? ADMINISTRATIVE_FEE_CATEGORIES.length : index
}
