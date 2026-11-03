import { describe, it, expect } from "vitest"
import { HELP_SECTIONS } from "./help-content"

// 目次（画面）は HELP_SECTIONS を .map() して作るので、ここが崩れていなければ
// 目次のリンクと見出しの id は1対1になる。
describe("HELP_SECTIONS", () => {
    it("節の id が重複していない", () => {
        const ids = HELP_SECTIONS.map(section => section.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("節の id はアンカーに使える文字だけ", () => {
        for (const section of HELP_SECTIONS) {
            expect(section.id).toMatch(/^[a-z][a-z0-9-]*$/)
        }
    })

    it("見出しの番号が目次の並び順と一致している（欠番・重複なし）", () => {
        HELP_SECTIONS.forEach((section, index) => {
            expect(section.title.startsWith(`${index + 1}. `)).toBe(true)
        })
    })

    it("どの節にも1行説明と本文がある", () => {
        for (const section of HELP_SECTIONS) {
            expect(section.summary.trim()).not.toBe("")
            expect(section.blocks.length).toBeGreaterThan(0)
        }
    })

    it("本文のブロックに空の文章・空の箇条書きが無い", () => {
        for (const section of HELP_SECTIONS) {
            for (const block of section.blocks) {
                if (block.kind === "paragraph" || block.kind === "note") {
                    expect(block.text.trim()).not.toBe("")
                } else if (block.kind === "list" || block.kind === "steps") {
                    expect(block.items.length).toBeGreaterThan(0)
                    for (const item of block.items) expect(item.trim()).not.toBe("")
                }
            }
        }
    })

    it("表の列数が見出しと揃っていて、空のセルが無い", () => {
        for (const section of HELP_SECTIONS) {
            for (const block of section.blocks) {
                if (block.kind !== "table") continue
                expect(block.headers.length).toBeGreaterThan(1)
                expect(block.rows.length).toBeGreaterThan(0)
                for (const row of block.rows) {
                    expect(row.length).toBe(block.headers.length)
                    for (const cell of row) expect(cell.trim()).not.toBe("")
                }
            }
        }
    })

    it("箇条書きと表の行に同じ内容が並んでいない（key の重複になる）", () => {
        for (const section of HELP_SECTIONS) {
            for (const block of section.blocks) {
                if (block.kind === "list" || block.kind === "steps") {
                    expect(new Set(block.items).size).toBe(block.items.length)
                } else if (block.kind === "table") {
                    const keys = block.rows.map(row => row.join("|"))
                    expect(new Set(keys).size).toBe(keys.length)
                }
            }
        }
    })
})
