import type { InheritanceCase } from "@/types/shared"

/**
 * 案件詳細の区分。以前は8つのセクションを縦に積み、上のリンクで位置へ飛ばしていた
 * （全部開くと 4,000px を超えて、目的の欄を探すのに縦スクロールが要った）。
 * 今は4つのタブに分けて1つだけ表示する。フォームの状態は1つのままで、
 * タブは表示の切り替えだけ ── 隠れているタブの入力も保存され、検証もされる。
 */
export const CASE_DETAIL_TABS = [
    { id: "basic", label: "基本・進捗", sectionKeys: ["basicInfo", "progress", "memo"] },
    { id: "money", label: "金額", sectionKeys: ["financial", "expenses"] },
    { id: "people", label: "相続人・関係者", sectionKeys: ["heirs", "relatedParties"] },
    { id: "history", label: "変更履歴", sectionKeys: ["auditLog"] },
] as const

export type CaseDetailTab = typeof CASE_DETAIL_TABS[number]
export type CaseDetailTabId = CaseDetailTab["id"]
export type CaseSectionKey = CaseDetailTab["sectionKeys"][number]

export const CASE_DETAIL_TAB_PARAM = "tab"
export const DEFAULT_CASE_DETAIL_TAB: CaseDetailTabId = "basic"

/** 節の id。旧リンク（`#case-progress` など）とスクロール位置の両方がこれを使う */
export const CASE_SECTION_ANCHORS = {
    basicInfo: "case-basic-info",
    progress: "case-progress",
    memo: "case-memo",
    financial: "case-financial",
    expenses: "case-expenses",
    heirs: "case-heirs",
    relatedParties: "case-related-parties",
    auditLog: "case-audit-log",
} as const satisfies Record<CaseSectionKey, string>

const TAB_BY_SECTION_KEY = new Map<string, CaseDetailTabId>(
    CASE_DETAIL_TABS.flatMap(tab => tab.sectionKeys.map(key => [key as string, tab.id] as const)),
)

const TAB_BY_ANCHOR = new Map<string, CaseDetailTabId>(
    Object.entries(CASE_SECTION_ANCHORS).map(([key, anchor]) => [anchor, getTabForSectionKey(key)] as const),
)

export function isCaseDetailTabId(value: unknown): value is CaseDetailTabId {
    return typeof value === "string" && CASE_DETAIL_TABS.some(tab => tab.id === value)
}

export function getTabForSectionKey(sectionKey: string): CaseDetailTabId {
    return TAB_BY_SECTION_KEY.get(sectionKey) ?? DEFAULT_CASE_DETAIL_TAB
}

/** `#case-progress` / `case-progress` → その節を含むタブ。知らないアンカーなら null */
export function getTabForSectionAnchor(hash: string): CaseDetailTabId | null {
    return TAB_BY_ANCHOR.get(hash.replace(/^#/, "")) ?? null
}

/** 新規登録の画面には変更履歴が無い（まだ1度も保存していない） */
export function getAvailableCaseDetailTabs(isCreateMode: boolean): readonly CaseDetailTab[] {
    return isCreateMode ? CASE_DETAIL_TABS.filter(tab => tab.id !== "history") : CASE_DETAIL_TABS
}

/** URL の `?tab=` を読む。知らない値・その画面に無いタブなら既定のタブ */
export function resolveCaseDetailTab(
    value: string | null | undefined,
    available: readonly { id: CaseDetailTabId }[] = CASE_DETAIL_TABS,
): CaseDetailTabId {
    if (isCaseDetailTabId(value) && available.some(tab => tab.id === value)) return value
    if (available.some(tab => tab.id === DEFAULT_CASE_DETAIL_TAB)) return DEFAULT_CASE_DETAIL_TAB
    return available[0]?.id ?? DEFAULT_CASE_DETAIL_TAB
}

/** 現在のタブを URL に入れる。既定のタブには付けない（パラメータ無し＝基本・進捗） */
export function buildCaseDetailTabUrl(pathname: string, tab: CaseDetailTabId): string {
    return tab === DEFAULT_CASE_DETAIL_TAB ? pathname : `${pathname}?${CASE_DETAIL_TAB_PARAM}=${tab}`
}

export function getCaseDetailTabHref(caseId: number, tab: CaseDetailTabId): string {
    return buildCaseDetailTabUrl(`/${caseId}`, tab)
}

export interface CaseDetailTabStatus {
    /** タブのラベルに添える件数（相続人 N人・立替金 N件 など） */
    counts: string[]
    /** 未保存の変更があるタブ */
    hasChanges: boolean
    /** 未入力・入力エラーの件数 */
    missingCount: number
}

export function getCaseDetailTabStatuses(
    data: InheritanceCase,
    changedSections: readonly string[],
    missingInputs: readonly { sectionKey: string }[],
): Record<CaseDetailTabId, CaseDetailTabStatus> {
    const expenses = data.expenses?.length ?? 0
    const heirs = data.heirs?.length ?? 0
    const relatedParties = data.relatedParties?.length ?? 0
    const countsByTab: Record<CaseDetailTabId, string[]> = {
        basic: [],
        money: expenses > 0 ? [`立替金${expenses}件`] : [],
        people: [
            ...(heirs > 0 ? [`相続人${heirs}人`] : []),
            ...(relatedParties > 0 ? [`関係者${relatedParties}人`] : []),
        ],
        history: [],
    }
    const statuses = {} as Record<CaseDetailTabId, CaseDetailTabStatus>
    for (const tab of CASE_DETAIL_TABS) {
        statuses[tab.id] = {
            counts: countsByTab[tab.id],
            hasChanges: changedSections.some(key => getTabForSectionKey(key) === tab.id),
            missingCount: missingInputs.filter(item => getTabForSectionKey(item.sectionKey) === tab.id).length,
        }
    }
    return statuses
}
