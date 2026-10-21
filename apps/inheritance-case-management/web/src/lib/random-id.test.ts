import { afterEach, describe, expect, it, vi } from "vitest"
import { randomId } from "./random-id"

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe("randomId", () => {
    afterEach(() => vi.unstubAllGlobals())

    it("randomUUID があればそれを使う", () => {
        expect(randomId()).toMatch(UUID_V4)
    })

    it("http で開いて randomUUID が無くても v4 の形で作る", () => {
        // 安全でないコンテキストのブラウザと同じく getRandomValues だけを持たせる
        const real = globalThis.crypto
        vi.stubGlobal("crypto", { getRandomValues: real.getRandomValues.bind(real) })
        const ids = new Set(Array.from({ length: 100 }, randomId))
        expect(ids.size).toBe(100)
        for (const id of ids) expect(id).toMatch(UUID_V4)
    })
})
