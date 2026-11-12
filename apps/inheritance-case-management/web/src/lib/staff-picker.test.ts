import { describe, expect, it } from "vitest"
import { buildStaffPickerSections, flattenStaffPickerRows, markOf } from "@/lib/staff-picker"
import type { Assignee } from "@/types/shared"

// 名前はすべて架空。id は案件管理の写しの ID、staffDirectoryId が台帳ID（わざとずらしてある）
// 部署の sortOrder は台帳の部署の画面の何番目か（名前順なら大阪が先だが、台帳の順で東京が先）
const tokyo = { id: 1, name: "東京", sortOrder: 1, active: true }
const osaka = { id: 2, name: "大阪", sortOrder: 2, active: true }
const assignees: Assignee[] = [
    { id: 11, name: "架空 一郎", employeeId: "E1", department: tokyo, active: true, staffDirectoryId: 1 },
    { id: 12, name: "架空 二郎", employeeId: "E2", department: osaka, active: true, staffDirectoryId: 2 },
    { id: 13, name: "架空 三郎", employeeId: "E3", department: osaka, active: true, staffDirectoryId: 3 },
    { id: 14, name: "架空 四郎", department: osaka, active: false, staffDirectoryId: 4 },
    { id: 15, name: "架空 五郎", department: null, active: true, staffDirectoryId: null },
]
const ids = (rows: { assignee: Assignee }[]) => rows.map((row) => row.assignee.id)
const today = "2026-11-12"

describe("buildStaffPickerSections", () => {
    it("自分・最近選んだ人を台帳ID から写しの行へ引き当てて先頭に出す", () => {
        const sections = buildStaffPickerSections(assignees, { query: "", value: "", quick: { meId: 1, recentIds: [3, 1, 99] }, today })
        expect(sections.map((s) => [s.kind, s.label])).toEqual([
            ["me", "自分（操作者）"],
            ["recent", "最近選んだ人"],
            ["department", "東京"],
            ["department", "大阪"],
            ["department", "部署なし"],
        ])
        expect(ids(sections[0].rows)).toEqual([11])
        // 自分は最近の塊に重ねない・台帳に居ない ID（99）は飛ばす
        expect(ids(sections[1].rows)).toEqual([13])
        // 自分・最近の行には部署名を添え、部署の塊では添えない
        expect(sections[1].rows[0].detail).toBe("大阪")
        expect(sections[3].rows[0].detail).toBe("")
    })

    it("quick を渡さない（社内紹介者）ときは部署ごとだけ", () => {
        const sections = buildStaffPickerSections(assignees, { query: "", value: "", today })
        expect(sections.every((s) => s.kind === "department")).toBe(true)
    })

    it("退職者は候補から外すが、いま選ばれていれば残して「退職」の印を付ける", () => {
        const notSelected = flattenStaffPickerRows(buildStaffPickerSections(assignees, { query: "", value: "", today }))
        expect(ids(notSelected)).not.toContain(14)
        const selected = flattenStaffPickerRows(buildStaffPickerSections(assignees, { query: "", value: "14", today }))
        expect(selected.find((row) => row.assignee.id === 14)?.mark).toBe("退職")
    })

    it("検索は空白で区切った語をすべて含む人（氏名・部署・社員番号）", () => {
        const hit = (query: string) => ids(flattenStaffPickerRows(buildStaffPickerSections(assignees, { query, value: "", today })))
        expect(hit("大阪 三郎")).toEqual([13])
        expect(hit("架空")).toHaveLength(4)
        expect(hit("E2")).toEqual([12])
        const [section] = buildStaffPickerSections(assignees, { query: "大阪", value: "", today })
        expect(section.label).toBe("検索結果（2人）")
    })

    it("フリガナで引け、部署の中はフリガナのある人が読み順で先、無い人は氏名順で後ろ", () => {
        const withKana = assignees.map((a) => a.id === 13 ? { ...a, nameKana: "アイウ サブロウ" } : a)
        const hit = ids(flattenStaffPickerRows(buildStaffPickerSections(withKana, { query: "あいう", value: "", today })))
        expect(hit).toEqual([13])
        const osakaSection = buildStaffPickerSections(withKana, { query: "", value: "", today }).find((s) => s.label === "大阪")
        expect(ids(osakaSection!.rows)).toEqual([13, 12])
    })

    it("同じ人が自分と部署の塊に出ても行の key は重ならない", () => {
        const rows = flattenStaffPickerRows(buildStaffPickerSections(assignees, { query: "", value: "", quick: { meId: 1, recentIds: [] }, today }))
        expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length)
    })
})

describe("markOf", () => {
    it("台帳の退職日で退職予定の印を付ける（写しは退職日を持たない）", () => {
        const retiredOn = new Map([[2, "2026-12-31"], [3, null]])
        expect(markOf(assignees[1], retiredOn, today)).toBe("12/31 退職予定")
        expect(markOf(assignees[2], retiredOn, today)).toBe("")
        // 台帳に届かない（退職日が引けない）ときは印を出さない
        expect(markOf(assignees[1], undefined, today)).toBe("")
        expect(markOf(assignees[4], retiredOn, today)).toBe("")
    })
})
