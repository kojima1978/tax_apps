import type { LucideIcon } from "lucide-react"
import { Briefcase, Contact, HardDriveDownload, Network, ScrollText, Users } from "lucide-react"

export const SETTINGS_GROUPS = [
    { id: "organization", title: "担当・紹介", description: "案件の担当体制と紹介元を管理します。" },
    { id: "fees", title: "報酬・料金", description: "報酬の見積りに使う料金表を管理します。" },
    { id: "persons", title: "人物情報", description: "案件で利用する人物の連絡先を管理します。" },
    { id: "data", title: "データ管理", description: "データの保存と復元を行います。" },
] as const

type SettingsMenuItem = {
    href: string
    group: (typeof SETTINGS_GROUPS)[number]["id"]
    /** 画面の名前。設定トップのカードと画面の見出しに出す。「〜管理」「〜マスタ」は付けない（中身の名前だけにする） */
    title: string
    /** タブ行に出す短い名前。title が6文字に収まるならそのまま使うので書かない */
    navLabel?: string
    icon: LucideIcon
    description: string
    action: string
}

export const SETTINGS_MENU: readonly SettingsMenuItem[] = [
    { href: "/settings/staff", group: "organization", title: "担当者", icon: Users,
        description: "担当者の氏名・社員ID・所属部署を登録・編集します。", action: "担当者・部署を管理" },
    { href: "/settings/referral-sources", group: "organization", title: "紹介元", icon: Network,
        description: "紹介元の会社・部門・紹介者をツリー形式で管理します。", action: "紹介元を管理" },
    { href: "/settings/administrative-fees", group: "fees", title: "遺産整理料金表", navLabel: "料金表", icon: ScrollText,
        description: "遺産整理業務の手続きと料金を登録・編集します（Excel の出力・取込つき）。", action: "料金表を管理" },
    { href: "/settings/heir-persons", group: "persons", title: "相続人", icon: Contact,
        description: "相続人の氏名・生年月日・電話番号・住所を登録・編集します。", action: "相続人の情報を管理" },
    { href: "/settings/related-party-persons", group: "persons", title: "関係者", icon: Briefcase,
        description: "税理士・弁護士・司法書士など、外部関係者の連絡先を管理します。", action: "関係者の情報を管理" },
    { href: "/settings/backup", group: "data", title: "バックアップ / リストア", navLabel: "バックアップ", icon: HardDriveDownload,
        description: "全データをJSONファイルに保存し、保存したファイルから復元します。", action: "データを保存・復元" },
]

/** 設定の中を移動するタブ行。見出しは短い名前だけ（幅をそろえた1行に収める） */
export const SETTINGS_NAV_LINKS: { href: string, label: string }[] = [
    { href: "/settings", label: "設定トップ" },
    ...SETTINGS_MENU.map(item => ({ href: item.href, label: item.navLabel ?? item.title })),
]

/** いま開いている設定の画面か（設定トップは完全一致。下の階層は前方一致で親を選択状態にする） */
export function isSettingsPathCurrent(pathname: string, href: string): boolean {
    return pathname === href || (href !== "/settings" && pathname.startsWith(`${href}/`))
}
