import { describe, expect, it } from "vitest";
import { calcEffectiveTaxRate, calcOfficerLimit, calcRetirementTax, calcServiceYears, type RetirementType } from "./retirement-tax";

const calc = (amount: number, serviceYears: number, retirementType: RetirementType = "general", taxYear = "2026", isDisability = false) =>
    calcRetirementTax({ amount, serviceYears, retirementType, isDisability, taxYear });

describe("calcServiceYears", () => {
    it("退職日も1日として数える（4/1入社なら翌年3/31でちょうど1年）", () => {
        expect(calcServiceYears("2000-04-01", "2001-03-31")).toBe(1);
        expect(calcServiceYears("2000-04-01", "2022-03-31")).toBe(22);
    });

    it("応当日の退職は1日はみ出すので切り上げる", () => {
        expect(calcServiceYears("2000-04-01", "2001-04-01")).toBe(2);
        expect(calcServiceYears("2000-04-01", "2022-04-01")).toBe(23);
    });

    it("1年未満の端数は切り上げる", () => {
        expect(calcServiceYears("2000-04-01", "2021-10-15")).toBe(22);
    });

    it("入社日と同じ日の退職は1年", () => {
        expect(calcServiceYears("2024-04-01", "2024-04-01")).toBe(1);
    });

    it("2月29日入社は翌年2月28日でちょうど1年", () => {
        expect(calcServiceYears("2000-02-29", "2001-02-28")).toBe(1);
        expect(calcServiceYears("2000-02-29", "2001-03-01")).toBe(2);
    });

    it("年末をまたぐ", () => {
        expect(calcServiceYears("2000-12-31", "2001-12-30")).toBe(1);
        expect(calcServiceYears("2000-12-31", "2001-12-31")).toBe(2);
    });

    it("退職日が先・空欄・実在しない日は 0", () => {
        expect(calcServiceYears("2024-04-02", "2024-04-01")).toBe(0);
        expect(calcServiceYears("", "2024-04-01")).toBe(0);
        expect(calcServiceYears("2024-02-30", "2025-04-01")).toBe(0);
    });
});

describe("calcRetirementTax", () => {
    it("一般: 3,000万円・22年（令和8年）", () => {
        const r = calc(30_000_000, 22);
        expect(r.deduction).toBe(9_400_000);
        expect(r.taxableIncome).toBe(10_300_000);
        expect(r.incomeTax).toBe(1_863_000);
        expect(r.reconstructionTax).toBe(39_123);
        expect(r.defenseTax).toBe(0);
        expect(r.municipalTax).toBe(618_000);
        expect(r.prefecturalTax).toBe(412_000);
        expect(r.residentTax).toBe(1_030_000);
        expect(r.totalTax).toBe(2_932_123);
        expect(r.netAmount).toBe(30_000_000 - 2_932_123);
    });

    it("令和9年は復興1.1%・防衛1%に分かれ、合計は令和8年と同じ", () => {
        const r = calc(30_000_000, 22, "general", "2027");
        expect(r.reconstructionTax).toBe(20_493);
        expect(r.defenseTax).toBe(18_630);
        expect(r.totalTax).toBe(2_932_123);
    });

    it("令和9年の復興特別所得税は1円少なく切り捨てない（所得税額 23,000円 → 253円）", () => {
        // 課税退職所得 46万円 × 5% = 23,000円。23,000 × 0.011 は浮動小数だと 252.999…
        const r = calc(1_720_000, 1, "general", "2027");
        expect(r.incomeTax).toBe(23_000);
        expect(r.reconstructionTax).toBe(253);
        expect(r.defenseTax).toBe(230);
    });

    it("どの所得税額でも、令和9年の復興＋防衛は令和8年の復興と一致する", () => {
        for (let amount = 900_000; amount <= 200_000_000; amount += 137_000) {
            const r8 = calc(amount, 1, "officer", "2026");
            const r9 = calc(amount, 1, "officer", "2027");
            expect(r9.incomeTax).toBe(r8.incomeTax);
            expect(r9.reconstructionTax + r9.defenseTax).toBe(r8.reconstructionTax);
            // 整数で計算した 2.1% と一致する（率の小数表現の誤差が入らない）
            expect(r8.reconstructionTax).toBe(Math.floor((r8.incomeTax * 21) / 1000));
        }
    });

    it("退職所得控除は20年以下 40万円/年（最低80万円）、20年超は 800万円 + 70万円/年", () => {
        expect(calc(10_000_000, 1).deduction).toBe(800_000);
        expect(calc(10_000_000, 2).deduction).toBe(800_000);
        expect(calc(10_000_000, 3).deduction).toBe(1_200_000);
        expect(calc(10_000_000, 20).deduction).toBe(8_000_000);
        expect(calc(10_000_000, 21).deduction).toBe(8_700_000);
    });

    it("障害者になったことによる退職は100万円を加算する", () => {
        expect(calc(10_000_000, 10, "general", "2026", true).deduction).toBe(5_000_000);
    });

    it("課税退職所得金額は1,000円未満を切り捨てる", () => {
        // (10,001,999 − 400万) ÷ 2 = 3,000,999.5
        expect(calc(10_001_999, 10).taxableIncome).toBe(3_000_000);
    });

    it("特定役員は 1/2 にしない", () => {
        const r = calc(10_000_000, 5, "officer");
        expect(r.taxableIncome).toBe(8_000_000);
        expect(r.incomeTax).toBe(1_204_000);
    });

    it("短期は控除後 300万円以下なら 1/2", () => {
        expect(calc(4_000_000, 5, "short_term").taxableIncome).toBe(1_000_000);
        expect(calc(5_000_000, 5, "short_term").taxableIncome).toBe(1_500_000);
    });

    it("短期は控除後 300万円を超えた部分を 1/2 にしない", () => {
        const r = calc(10_000_000, 5, "short_term");
        expect(r.taxableIncome).toBe(6_500_000);
        expect(r.incomeTax).toBe(872_500);
    });

    it("支給額が控除額以下なら税額は 0", () => {
        const r = calc(800_000, 1);
        expect(r.taxableIncome).toBe(0);
        expect(r.totalTax).toBe(0);
        expect(r.netAmount).toBe(800_000);
    });

    it("最高税率 45% の区分", () => {
        // 課税退職所得 5,000万円 × 45% − 479.6万円
        const r = calc(50_000_000 + 800_000, 1, "officer");
        expect(r.taxableIncome).toBe(50_000_000);
        expect(r.incomeTax).toBe(17_704_000);
    });
});

describe("calcOfficerLimit / calcEffectiveTaxRate", () => {
    it("限度額 = 最終月額報酬 × 功績倍率 × 勤続年数", () => {
        expect(calcOfficerLimit(1_000_000, 3, 30)).toBe(90_000_000);
    });

    it("実効税率は小数2桁、支給額 0 なら 0.00", () => {
        expect(calcEffectiveTaxRate(30_000_000, 2_932_123)).toBe("9.77");
        expect(calcEffectiveTaxRate(0, 0)).toBe("0.00");
    });
});
