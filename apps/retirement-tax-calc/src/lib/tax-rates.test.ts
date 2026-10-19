import { describe, expect, it } from "vitest";
import { AVAILABLE_YEARS, TAX_RATES, formatBracketRange, formatRate, isBracketActive, pickDefaultYear, unregisteredYearNotice } from "./tax-rates";

/** 日本時間のその時刻 */
const jst = (iso: string) => new Date(`${iso}+09:00`);

describe("年度の表", () => {
    it("古い順に並ぶ", () => {
        expect(AVAILABLE_YEARS).toEqual([...AVAILABLE_YEARS].sort());
    });

    it("令和8年までは復興2.1%のみ、令和9年からは復興1.1% + 防衛1%", () => {
        expect(TAX_RATES["2026"]).toMatchObject({ reconstructionTaxRate: 0.021, defenseTaxRate: 0 });
        expect(TAX_RATES["2027"]).toMatchObject({ reconstructionTaxRate: 0.011, defenseTaxRate: 0.01 });
    });

    it("どの年も速算表は上限の昇順で、最後は上限なし", () => {
        for (const year of AVAILABLE_YEARS) {
            const limits = TAX_RATES[year].brackets.map((b) => b.limit);
            expect(limits).toEqual([...limits].sort((a, b) => a - b));
            expect(limits.at(-1)).toBe(Infinity);
        }
    });

    it("速算表の控除額は区分の境目で税額がつながるように決まっている", () => {
        for (const year of AVAILABLE_YEARS) {
            const brackets = TAX_RATES[year].brackets;
            for (let i = 1; i < brackets.length; i++) {
                const edge = brackets[i - 1].limit;
                const below = edge * brackets[i - 1].rate - brackets[i - 1].deduction;
                const above = edge * brackets[i].rate - brackets[i].deduction;
                expect(Math.round(above)).toBe(Math.round(below));
            }
        }
    });
});

describe("pickDefaultYear / unregisteredYearNotice", () => {
    it("今年の表があれば今年", () => {
        expect(pickDefaultYear(jst("2026-10-20T12:00:00"))).toBe("2026");
        expect(unregisteredYearNotice(jst("2026-10-20T12:00:00"))).toBeNull();
    });

    it("年が明けたら日本時間で切り替わる（UTC ではまだ大晦日でも）", () => {
        expect(pickDefaultYear(jst("2027-01-01T00:30:00"))).toBe("2027");
    });

    it("今年の表が無ければ登録済みの最新年を使い、そのことを知らせる", () => {
        const date = jst("2030-05-01T12:00:00");
        const latest = AVAILABLE_YEARS.at(-1)!;
        expect(pickDefaultYear(date)).toBe(latest);
        expect(unregisteredYearNotice(date)).toBe(`2030年の税率表は未登録です。${TAX_RATES[latest].label}の税率で計算しています。`);
    });

    it("登録より前の年なら一番古い年", () => {
        expect(pickDefaultYear(jst("2020-01-01T12:00:00"))).toBe(AVAILABLE_YEARS[0]);
    });
});

describe("表示用", () => {
    it("formatRate は浮動小数の誤差を出さない", () => {
        expect(formatRate(0.021)).toBe("2.1%");
        expect(formatRate(0.011)).toBe("1.1%");
        expect(formatRate(0.01)).toBe("1%");
        expect(formatRate(0.06)).toBe("6%");
    });

    it("formatBracketRange", () => {
        const brackets = TAX_RATES["2026"].brackets;
        const fmt = (n: number) => n.toLocaleString("ja-JP");
        expect(formatBracketRange(0, brackets[0], brackets, fmt)).toBe("1,950,000円以下");
        expect(formatBracketRange(1, brackets[1], brackets, fmt)).toBe("1,950,000円超〜3,300,000円以下");
        expect(formatBracketRange(brackets.length - 1, brackets.at(-1)!, brackets, fmt)).toBe("40,000,000円超");
    });

    it("isBracketActive は境目の金額を下の区分に入れ、0円はどこにも入れない", () => {
        const brackets = TAX_RATES["2026"].brackets;
        expect(isBracketActive(1_950_000, 0, brackets)).toBe(true);
        expect(isBracketActive(1_950_000, 1, brackets)).toBe(false);
        expect(isBracketActive(1_951_000, 1, brackets)).toBe(true);
        expect(brackets.some((_, i) => isBracketActive(0, i, brackets))).toBe(false);
    });
});
