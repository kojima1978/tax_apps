import { describe, expect, it } from "vitest"
import { addRecentCase, parseWorkspacePreferences, toggleFavorite } from "./workspace-preferences"

describe("ブラウザ保存する案件ショートカット", () => {
    it("壊れたJSONや不正なIDが保存されていても画面を復元できる", () => {
        for (const raw of ["{broken", '{"recentCases":[{"id":-1,"name":"不正"}]}']) {
            expect(parseWorkspacePreferences(raw).recentCases).toEqual([])
            expect(parseWorkspacePreferences(raw).listView).toBe("standard")
        }
    })
    it("再訪問した案件を先頭へ移し、保存後の氏名をお気に入りにも反映する", () => {
        let preferences = parseWorkspacePreferences(null)
        preferences = toggleFavorite(preferences, { id: 1, name: "旧氏名" })
        for (let id = 1; id <= 12; id++) preferences = addRecentCase(preferences, { id, name: `案件${id}` })
        preferences = addRecentCase(preferences, { id: 1, name: "新氏名" })
        expect(preferences.recentCases).toHaveLength(10)
        expect(preferences.recentCases[0]).toEqual({ id: 1, name: "新氏名" })
        expect(preferences.favorites[0].name).toBe("新氏名")
        expect(toggleFavorite(preferences, { id: 1, name: "新氏名" }).favorites).toEqual([])
    })
})
