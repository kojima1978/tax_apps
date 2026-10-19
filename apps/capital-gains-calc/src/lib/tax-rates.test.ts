import { describe, expect, it } from "vitest";
import { BUILDING_STRUCTURES, LONG_TERM_RATE, REDUCED_RATE, SECURITIES_RATE, SHORT_TERM_RATE, findStructure, totalRate } from "./tax-rates";

describe("税率", () => {
    it("復興特別所得税は所得税率の2.1%で、合計は公表の税率どおり", () => {
        const table = [
            [LONG_TERM_RATE, 0.00315, "20.315"],
            [SHORT_TERM_RATE, 0.0063, "39.63"],
            [REDUCED_RATE, 0.0021, "14.21"],
            [SECURITIES_RATE, 0.00315, "20.315"],
        ] as const;
        for (const [rate, reconstruction, total] of table) {
            expect(rate.reconstruction).toBe(reconstruction);
            expect(String(Math.round(totalRate(rate) * 1e6) / 1e4)).toBe(total);
        }
    });
});

describe("非事業用建物の構造区分", () => {
    // 非事業用の耐用年数（法定×1.5、1年未満切捨て）に対応する旧定額法の償却率
    const expected: Record<string, [statutory: number, nonBusiness: number, rate: number]> = {
        wood: [22, 33, 0.031],
        "wood-mortar": [20, 30, 0.034],
        rc: [47, 70, 0.015],
        brick: [38, 57, 0.018],
        "steel-3": [19, 28, 0.036],
        "steel-4": [27, 40, 0.025],
        "steel-over4": [34, 51, 0.02],
    };

    it("耐用年数・償却率が表のとおりで、非事業用は法定の1.5倍（切捨て）", () => {
        expect(BUILDING_STRUCTURES.map((s) => s.key)).toEqual(Object.keys(expected));
        for (const s of BUILDING_STRUCTURES) {
            expect([s.statutoryYears, s.nonBusinessYears, s.rate]).toEqual(expected[s.key]);
            expect(s.nonBusinessYears).toBe(Math.floor(s.statutoryYears * 1.5));
        }
    });

    it("知らないキーは木造", () => {
        expect(findStructure("unknown").key).toBe("wood");
    });
});
