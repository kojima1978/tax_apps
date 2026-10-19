import { describe, expect, it } from "vitest";
import { calcBrokerFee } from "./broker-fee";
import { calcMinimumTax } from "./minimum-tax";
import { calcStampDuty, isStampDutyReduced } from "./stamp-duty";

describe("仲介手数料の上限額", () => {
    it("速算式（5% / 4%＋2万円 / 3%＋6万円）に消費税10%", () => {
        expect(calcBrokerFee(0)).toBe(0);
        expect(calcBrokerFee(1_000_000)).toBe(55_000);
        expect(calcBrokerFee(30_000_000)).toBe(1_056_000);
        expect(calcBrokerFee(4_000_001)).toBe(198_000);
    });

    it("区分の境目で金額が飛ばない", () => {
        expect(calcBrokerFee(2_000_000)).toBe(110_000);
        expect(calcBrokerFee(2_000_001)).toBe(110_000);
        expect(calcBrokerFee(4_000_000)).toBe(198_000);
    });
});

describe("印紙税（不動産の譲渡に関する契約書）", () => {
    it("1万円未満は非課税、境目は「以下」で次の区分へ", () => {
        expect(calcStampDuty(9_999)).toBe(0);
        expect(calcStampDuty(10_000)).toBe(200);
        expect(calcStampDuty(100_000, "2028-01-01")).toBe(200);
        expect(calcStampDuty(100_001, "2028-01-01")).toBe(400);
        expect(calcStampDuty(50_000_000, "2028-01-01")).toBe(20_000);
        expect(calcStampDuty(50_000_001, "2028-01-01")).toBe(60_000);
        expect(calcStampDuty(10_000_000_000, "2028-01-01")).toBe(600_000);
    });

    it("軽減措置は令和9年3月31日作成分まで（未入力は期間内）", () => {
        expect(isStampDutyReduced("2027-03-31")).toBe(true);
        expect(isStampDutyReduced("2027-04-01")).toBe(false);
        expect(isStampDutyReduced("")).toBe(true);
        expect(calcStampDuty(50_000_000)).toBe(10_000);
        expect(calcStampDuty(50_000_001, "2027-03-31")).toBe(30_000);
        expect(calcStampDuty(10_000_000_000, "2024-01-01")).toBe(480_000);
    });
});

describe("ミニマムタックス", () => {
    const input = { year: 2025, capitalGainsIncome: 0, capitalGainsIncomeTax: 0, otherIncome: 0, otherIncomeTax: 0 };

    it("（基準所得金額−3.3億円）×22.5% が基準所得税額を超えた分に復興税を乗せる", () => {
        const r = calcMinimumTax({ ...input, capitalGainsIncome: 1_000_000_000, capitalGainsIncomeTax: 150_000_000 });
        expect(r.excessIncome).toBe(670_000_000);
        expect(r.calculatedTax).toBe(150_750_000);
        expect(r.applies).toBe(true);
        expect(r.additionalIncomeTax).toBe(750_000);
        expect(r.additionalReconstruction).toBe(15_750);
        expect(r.additionalTotal).toBe(765_750);
    });

    it("通常の所得税額のほうが大きければ追加は無い", () => {
        const r = calcMinimumTax({ ...input, capitalGainsIncome: 400_000_000, capitalGainsIncomeTax: 60_000_000 });
        expect(r.applies).toBe(false);
        expect(r.additionalTotal).toBe(0);
        expect(r.notes[0]).toContain("通常の所得税額（基準所得税額）が上回る");
    });

    it("3.3億円ちょうどまでは対象外", () => {
        const r = calcMinimumTax({ ...input, otherIncome: 330_000_000 });
        expect(r.excessIncome).toBe(0);
        expect(r.notes[0]).toContain("3億3,000万円以下");
    });

    it("令和6年分以前は適用しない", () => {
        const r = calcMinimumTax({ ...input, year: 2024, capitalGainsIncome: 10_000_000_000 });
        expect(r.isApplicableYear).toBe(false);
        expect(r.applies).toBe(false);
        expect(r.additionalTotal).toBe(0);
        expect(r.notes[0]).toContain("2024年分の譲渡は対象外");
    });
});
