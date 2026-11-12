import { buildPickerSections, type PersonLike, type PickerSection } from "@/shared/staff-directory/assignee"
import { retirementMark } from "@/shared/staff-retirement/retirement"
import type { Assignee } from "@/types/shared"

/**
 * 担当者・社内紹介者を選ぶ欄（components/ui/StaffSelect.tsx）の中身。
 *
 * 並べ方・検索・自分・最近選んだ人は社員台帳を使う全アプリ共通の `buildPickerSections`
 * （shared/staff-directory/assignee.ts）を通し、退職予定の印は `retirementMark`
 * （shared/staff-retirement）を通す。見た目だけを案件管理の部品で持つ。
 *
 * 一覧は案件管理の写し（`Assignee`）から出すので台帳が止まっていても選べる。自分・最近は台帳ID で
 * 控えてあるので、写しの `staffDirectoryId` で行へ引き当てる。欄が返すのは写しの ID のまま。
 */

type Person = PersonLike & { assignee: Assignee }

export type StaffPickerRow = {
    /** 塊の番号つき（自分・最近の人は部署の塊にも出るので、ID だけでは行が重なる） */
    key: string
    assignee: Assignee
    /** 右に添える小さな字（検索結果・自分・最近では部署名） */
    detail: string
    /** 「退職」「12/31 退職予定」。在籍で退職日が無ければ空 */
    mark: string
}

export type StaffPickerSection = { kind: PickerSection<Person>["kind"]; label: string; showCount: boolean; rows: StaffPickerRow[] }

export function buildStaffPickerSections(assignees: readonly Assignee[], options: {
    query: string
    /** いま選ばれている写しの ID。退職していても候補から外さない（値が黙って消えないように） */
    value: string
    /** 自分・最近を出すとき（担当者）。社内紹介者は出さない */
    quick?: { meId: number | null; recentIds: readonly number[] }
    /** 台帳の退職日（台帳ID → 日付）。写しは退職日を持たない */
    retiredOnByDirectoryId?: ReadonlyMap<number, string | null>
    /** テスト用（既定は日本時間の今日） */
    today?: string
}): StaffPickerSection[] {
    const people = assignees
        .filter((a) => a.active !== false || String(a.id) === options.value)
        // 写しにはフリガナが無いので、部署の中は氏名の並び（今までどおり）。読み順ではない
        .sort((a, b) => a.name.localeCompare(b.name, "ja"))
        .map((a): Person => ({
            assignee: a,
            fullName: a.name,
            kana: "",
            companyName: "",
            departmentName: a.department?.name ?? "",
            searchExtra: a.employeeId ?? "",
        }))
    const sections = buildPickerSections(people, {
        query: options.query,
        directoryIdOf: (p) => p.assignee.staffDirectoryId ?? null,
        quick: options.quick,
    })
    return sections.map((section, s) => ({
        kind: section.kind,
        label: section.label,
        showCount: section.kind === "department",
        rows: section.people.map(({ assignee }) => ({
            key: `${s}-${assignee.id}`,
            assignee,
            detail: section.showDepartment ? assignee.department?.name ?? "" : "",
            mark: markOf(assignee, options.retiredOnByDirectoryId, options.today),
        })),
    }))
}

/** 写しで退職（active=false）なら「退職」、在籍なら台帳の退職日で「〇/〇 退職予定」 */
export function markOf(assignee: Assignee, retiredOnByDirectoryId?: ReadonlyMap<number, string | null>, today?: string): string {
    if (assignee.active === false) return "退職"
    const directoryId = assignee.staffDirectoryId ?? null
    return retirementMark(directoryId === null ? null : retiredOnByDirectoryId?.get(directoryId) ?? null, today) ?? ""
}

/** 上から1本に並べた行（↑↓と Enter はこの並びで数える） */
export function flattenStaffPickerRows(sections: readonly StaffPickerSection[]): StaffPickerRow[] {
    return sections.flatMap((section) => section.rows)
}
