import { describe, expect, it } from "vitest"

import { SETTINGS_MENU, SETTINGS_NAV_LINKS, isSettingsPathCurrent } from "./settings-menu"

describe("SETTINGS_NAV_LINKS", () => {
    it("設定トップを先頭に、設定の画面をすべて1行で並べる", () => {
        expect(SETTINGS_NAV_LINKS[0]).toEqual({ href: "/settings", label: "設定トップ" })
        expect(SETTINGS_NAV_LINKS).toHaveLength(SETTINGS_MENU.length + 1)
        expect(SETTINGS_NAV_LINKS.map(link => link.href).slice(1)).toEqual(SETTINGS_MENU.map(item => item.href))
    })

    it("見出しは幅をそろえた1行に収まる短さ（6文字まで）で重複しない", () => {
        const labels = SETTINGS_NAV_LINKS.map(link => link.label)
        expect(new Set(labels).size).toBe(labels.length)
        for (const label of labels) expect(label.length).toBeLessThanOrEqual(6)
    })
})

describe("isSettingsPathCurrent", () => {
    it("設定トップは完全一致のときだけ選択状態になる", () => {
        expect(isSettingsPathCurrent("/settings", "/settings")).toBe(true)
        expect(isSettingsPathCurrent("/settings/staff", "/settings")).toBe(false)
    })

    it("下の階層を開いていても親の画面が選択状態になる", () => {
        expect(isSettingsPathCurrent("/settings/staff", "/settings/staff")).toBe(true)
        expect(isSettingsPathCurrent("/settings/staff/12", "/settings/staff")).toBe(true)
        expect(isSettingsPathCurrent("/settings/heir-persons", "/settings/staff")).toBe(false)
    })
})
