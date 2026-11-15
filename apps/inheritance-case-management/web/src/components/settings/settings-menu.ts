import { Briefcase, Contact, HardDriveDownload, Network, Users } from "lucide-react"

export const SETTINGS_GROUPS = [
    { id: "organization", title: "担当・紹介", description: "案件の担当体制と紹介元を管理します。" },
    { id: "persons", title: "人物情報", description: "案件で利用する人物の連絡先を管理します。" },
    { id: "data", title: "データ管理", description: "データの保存と復元を行います。" },
] as const

export const SETTINGS_MENU = [
    { href: "/settings/staff", group: "organization", title: "担当者管理", navLabel: "担当者", icon: Users,
        description: "担当者の氏名・社員ID・所属部署を登録・編集します。", action: "担当者・部署を管理" },
    { href: "/settings/referral-sources", group: "organization", title: "紹介元管理", navLabel: "紹介元", icon: Network,
        description: "紹介元の会社・部門・紹介者をツリー形式で管理します。", action: "紹介元を管理" },
    { href: "/settings/heir-persons", group: "persons", title: "相続人マスタ", navLabel: "相続人", icon: Contact,
        description: "相続人の氏名・生年月日・電話番号・住所を登録・編集します。", action: "相続人の情報を管理" },
    { href: "/settings/related-party-persons", group: "persons", title: "関係者マスタ", navLabel: "関係者", icon: Briefcase,
        description: "税理士・弁護士・司法書士など、外部関係者の連絡先を管理します。", action: "関係者の情報を管理" },
    { href: "/settings/backup", group: "data", title: "バックアップ / リストア", navLabel: "バックアップ", icon: HardDriveDownload,
        description: "全データをJSONファイルに保存し、保存したファイルから復元します。", action: "データを保存・復元" },
] as const

/** 設定の中を移動するタブ行。見出しは短い名前だけ（幅をそろえた1行に収める） */
export const SETTINGS_NAV_LINKS: { href: string, label: string }[] = [
    { href: "/settings", label: "設定トップ" },
    ...SETTINGS_MENU.map(item => ({ href: item.href, label: item.navLabel })),
]

/** いま開いている設定の画面か（設定トップは完全一致。下の階層は前方一致で親を選択状態にする） */
export function isSettingsPathCurrent(pathname: string, href: string): boolean {
    return pathname === href || (href !== "/settings" && pathname.startsWith(`${href}/`))
}
