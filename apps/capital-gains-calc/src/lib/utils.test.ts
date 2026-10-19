import { describe, expect, it } from "vitest";
import { netProceedsRows, taxBreakdownRows, taxTotalRows } from "./result-rows";
import { LONG_TERM_RATE, SHORT_TERM_RATE } from "./tax-rates";
import { formatInputValue, formatJapaneseDate, formatRate, formatYen, parseFormattedNumber } from "./utils";

describe("金額の入力と表示", () => {
    it("全角数字・カンマ・数字以外の文字を整えてカンマ区切りにする", () => {
        expect(formatInputValue("１２３４５６７")).toBe("1,234,567");
        expect(formatInputValue("1,234abc")).toBe("1,234");
        expect(formatInputValue(1234567)).toBe("1,234,567");
        expect(formatInputValue("")).toBe("");
        expect(formatInputValue(null)).toBe("");
    });

    it("カンマ区切りを数値に戻す", () => {
        expect(parseFormattedNumber("1,234,567")).toBe(1_234_567);
        expect(parseFormattedNumber("１２３")).toBe(123);
        expect(parseFormattedNumber("")).toBe(0);
        expect(parseFormattedNumber("abc")).toBe(0);
    });

    it("税率・円・日付の書式", () => {
        expect(formatRate(0.15)).toBe("15%");
        expect(formatRate(0.00315)).toBe("0.315%");
        expect(formatRate(0.021)).toBe("2.1%");
        expect(formatRate(0.225)).toBe("22.5%");
        expect(formatYen(1_234_567)).toBe("1,234,567円");
        expect(formatJapaneseDate(new Date(2024, 0, 5))).toBe("2024年1月5日");
    });
});

describe("結果表の行", () => {
    const amounts = { incomeTax: 3_000_000, reconstruction: 63_000, residentTax: 900_000, total: 3_963_000 };

    it("内訳3行は税率を括弧書きで併記する", () => {
        expect(taxBreakdownRows(amounts, LONG_TERM_RATE).map((r) => r.label)).toEqual([
            "所得税（15%）",
            "復興特別所得税（所得税額の2.1%）",
            "住民税（5%）",
        ]);
    });

    it("所得税＋復興税で小計を挟み、合計のときは税率を書かない", () => {
        expect(taxTotalRows(amounts, SHORT_TERM_RATE).map((r) => [r.label, r.value])).toEqual([
            ["所得税（30%）", "3,000,000円"],
            ["復興特別所得税（所得税額の2.1%）", "63,000円"],
            ["小計", "3,063,000円"],
            ["住民税（9%）", "900,000円"],
        ]);
        expect(taxTotalRows(amounts, undefined, true).map((r) => r.label)).toEqual([
            "所得税 合計",
            "復興特別所得税 合計",
            "小計",
            "住民税 合計",
        ]);
    });

    it("手取りは内訳のあとに置く", () => {
        const rows = netProceedsRows({ transferPrice: 10_000_000, transferExpense: 100_000, tax: 1_401_735, netProceeds: 8_498_265 });
        expect(rows.map((r) => r.value)).toEqual(["10,000,000円", "− 100,000円", "− 1,401,735円", "8,498,265円"]);
        expect(rows[3].highlight).toBe(true);
    });
});
