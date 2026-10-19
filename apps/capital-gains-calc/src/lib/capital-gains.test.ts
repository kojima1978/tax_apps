import { describe, expect, it } from "vitest";
import {
    calcNonBusinessDepreciation,
    calcRealEstate,
    calcSecurities,
    depreciationLimit,
    elapsedYearsForDepreciation,
    ownershipYearsAtJan1,
    type RealEstateInput,
} from "./capital-gains";
import { BUILDING_STRUCTURES } from "./tax-rates";

describe("所有期間（譲渡した年の1月1日時点）", () => {
    it("満年数を数え、1月1日に満5年ちょうどはまだ長期ではない", () => {
        expect(ownershipYearsAtJan1("2015-01-01", "2020-06-01")).toBe(5);
        expect(ownershipYearsAtJan1("2014-12-31", "2020-06-01")).toBe(5);
        expect(ownershipYearsAtJan1("2014-12-31", "2021-01-15")).toBe(6);
    });

    it("譲渡した年に取得したものは0年", () => {
        expect(ownershipYearsAtJan1("2020-03-01", "2020-12-01")).toBe(0);
    });

    it("日付が未入力・不正なら null", () => {
        expect(ownershipYearsAtJan1("", "2020-01-01")).toBeNull();
        expect(ownershipYearsAtJan1("2020-01-01", "")).toBeNull();
        expect(ownershipYearsAtJan1("abc", "2020-01-01")).toBeNull();
    });
});

describe("償却の経過年数", () => {
    it("6ヶ月以上の端数は切上げ、6ヶ月未満は切捨て", () => {
        expect(elapsedYearsForDepreciation("2010-04-01", "2020-09-30")).toBe(10);
        expect(elapsedYearsForDepreciation("2010-04-01", "2020-10-01")).toBe(11);
        // 応当日の前日までは月に数えない
        expect(elapsedYearsForDepreciation("2010-04-15", "2020-10-14")).toBe(10);
    });

    it("同じ日・逆転した日付は0年、未入力は null", () => {
        expect(elapsedYearsForDepreciation("2020-04-01", "2020-04-01")).toBe(0);
        expect(elapsedYearsForDepreciation("2020-04-01", "2019-04-01")).toBe(0);
        expect(elapsedYearsForDepreciation("", "2020-04-01")).toBeNull();
    });
});

describe("非事業用建物の償却費相当額", () => {
    it("取得価額 × 0.9 × 償却率 × 経過年数を1円も落とさない", () => {
        // 小数のまま掛けると 492992.99999… になり、切り捨てで 492,992円になっていた
        expect(calcNonBusinessDepreciation(1_178_000, "wood", 15)).toBe(492_993);
        expect(calcNonBusinessDepreciation(10_000_000, "rc", 20)).toBe(2_700_000);
    });

    it("どの構造・金額・年数でも整数で計算した値と一致する", () => {
        const mismatches: string[] = [];
        for (const s of BUILDING_STRUCTURES) {
            const rateMilli = BigInt(Math.round(s.rate * 1000));
            for (let cost = 1_000_000; cost <= 5_000_000; cost += 1_000) {
                for (let years = 1; years <= 40; years++) {
                    const exact = BigInt(cost) * 9n * rateMilli * BigInt(years) / 10_000n;
                    const expected = Math.min(Number(exact), Math.floor(cost * 95 / 100));
                    const actual = calcNonBusinessDepreciation(cost, s.key, years);
                    if (actual !== expected && mismatches.length < 5) {
                        mismatches.push(`${s.key} ${cost}円 ${years}年: ${actual} ≠ ${expected}`);
                    }
                }
            }
        }
        expect(mismatches).toEqual([]);
    });

    it("取得価額の95%で止まる", () => {
        // 木造 0.9×0.031×34年 = 94.86%、35年 = 97.65%
        expect(calcNonBusinessDepreciation(10_000_000, "wood", 34)).toBe(9_486_000);
        expect(calcNonBusinessDepreciation(10_000_000, "wood", 35)).toBe(9_500_000);
        expect(depreciationLimit(1_000_001)).toBe(950_000);
    });

    it("取得価額・経過年数が0なら0、知らない構造は木造で計算する", () => {
        expect(calcNonBusinessDepreciation(0, "wood", 10)).toBe(0);
        expect(calcNonBusinessDepreciation(10_000_000, "wood", 0)).toBe(0);
        expect(calcNonBusinessDepreciation(1_178_000, "unknown", 15)).toBe(492_993);
    });
});

const realEstate = (overrides: Partial<RealEstateInput> = {}): RealEstateInput => ({
    transferPrice: 0,
    transferExpense: 0,
    costMode: "actual",
    landCost: 0,
    buildingCost: 0,
    buildingUsage: "non-business",
    structureKey: "wood",
    depreciationInput: 0,
    acquisitionDate: "",
    transferDate: "",
    isResidence: false,
    useSpecialDeduction: false,
    useReducedRate: false,
    inheritedCostAddition: 0,
    ...overrides,
});

describe("不動産の譲渡所得", () => {
    it("長期: 償却費を引いた実額の取得費で計算する", () => {
        const r = calcRealEstate(
            realEstate({
                transferPrice: 50_000_000,
                transferExpense: 1_500_000,
                landCost: 20_000_000,
                buildingCost: 10_000_000,
                acquisitionDate: "2010-04-01",
                transferDate: "2024-05-10",
            }),
        );
        expect(r.elapsedYears).toBe(14);
        expect(r.depreciation).toBe(3_906_000);
        expect(r.actualCost).toBe(26_094_000);
        expect(r.estimatedCost).toBe(2_500_000);
        expect(r.grossProfit).toBe(22_406_000);
        expect(r.ownershipYears).toBe(13);
        expect(r.term).toBe("long");
        expect(r.reducedRateApplied).toBe(false);
        expect(r.brackets.map((b) => b.label)).toEqual(["長期譲渡所得（税率 20.315%）"]);
        expect(r.tax).toEqual({
            incomeTax: 3_360_900,
            reconstruction: 70_578, // 3,360,900 × 2.1% = 70,578.9 → 切捨て
            nationalTax: 3_431_400, // 3,431,478 → 100円未満切捨て
            // 1,120,300 を 3：2 に分けて 672,180 → 672,100 と 448,120 → 448,100。
            // 合計で一度に切り捨てると 1,120,300 のままで、申告より100円多くなる
            residentTax: 1_120_200,
            total: 4_551_600,
        });
        expect(r.netProceeds).toBe(50_000_000 - 1_500_000 - 4_551_600);
        expect(r.notes).toHaveLength(2);
        expect(r.notes[0]).toContain("納付時期");
        expect(r.notes[1]).toContain("1,000円未満");
    });

    it("居住用: 3,000万円控除のあと6,000万円で税率を分ける", () => {
        const r = calcRealEstate(
            realEstate({
                transferPrice: 150_000_000,
                costMode: "estimated",
                acquisitionDate: "2000-01-01",
                transferDate: "2024-03-01",
                isResidence: true,
                useSpecialDeduction: true,
                useReducedRate: true,
            }),
        );
        expect(r.acquisitionCost).toBe(7_500_000);
        expect(r.specialDeduction).toBe(30_000_000);
        expect(r.taxableIncome).toBe(112_500_000);
        expect(r.reducedRateApplied).toBe(true);
        expect(r.brackets.map((b) => [b.label, b.taxableAmount])).toEqual([
            ["6,000万円以下の部分（軽減税率 14.21%）", 60_000_000],
            ["6,000万円超の部分（税率 20.315%）", 52_500_000],
        ]);
        expect(r.tax).toEqual({
            incomeTax: 6_000_000 + 7_875_000,
            reconstruction: 126_000 + 165_375,
            nationalTax: 14_166_300, // 14,166,375 → 100円未満切捨て
            residentTax: 2_400_000 + 2_625_000,
            total: 19_191_300,
        });
        // 区分ごとの明細は切り捨てない（申告書でも区分ごとの税額は1円単位）
        expect(r.brackets[1].amounts.reconstruction).toBe(165_375);
        expect(r.notes.some((n) => n.includes("概算取得費（譲渡価額の5%）"))).toBe(true);
    });

    it("1,000円未満の課税譲渡所得は税額0（切捨て後に税率を掛ける）", () => {
        const r = calcRealEstate(
            realEstate({ transferPrice: 30_000_999, landCost: 30_000_000, acquisitionDate: "2010-01-01", transferDate: "2024-06-01" }),
        );
        expect(r.grossProfit).toBe(999);
        expect(r.incomeAfterDeduction).toBe(999);
        expect(r.taxableIncome).toBe(0);
        expect(r.tax.total).toBe(0);
        expect(r.notes.some((n) => n.includes("1,000円未満"))).toBe(false);
    });

    it("申告納税額・住民税はどの金額でも100円単位で、切り捨て幅は100円未満", () => {
        for (let gain = 1_000; gain <= 5_000_000; gain += 7_919) {
            for (const dates of [
                { acquisitionDate: "2010-01-01", transferDate: "2024-06-01" },
                { acquisitionDate: "2023-01-01", transferDate: "2024-06-01" },
            ]) {
                const r = calcRealEstate(realEstate({ transferPrice: 30_000_000 + gain, landCost: 30_000_000, ...dates }));
                const [b] = r.brackets;
                expect(r.tax.nationalTax % 100).toBe(0);
                expect(r.tax.residentTax % 100).toBe(0);
                const rawNational = b.amounts.incomeTax + b.amounts.reconstruction;
                expect(rawNational - r.tax.nationalTax).toBeGreaterThanOrEqual(0);
                expect(rawNational - r.tax.nationalTax).toBeLessThan(100);
                // 市町村民税・道府県民税それぞれで切り捨てるので、ずれは2回分（200円未満）まで
                expect(b.amounts.residentTax - r.tax.residentTax).toBeGreaterThanOrEqual(0);
                expect(b.amounts.residentTax - r.tax.residentTax).toBeLessThan(200);
                expect(r.tax.total).toBe(r.tax.nationalTax + r.tax.residentTax);
            }
        }
    });

    it("3,000万円控除は譲渡益までしか引かず、税額0なら納付時期を出さない", () => {
        const r = calcRealEstate(
            realEstate({
                transferPrice: 40_000_000,
                transferExpense: 5_000_000,
                landCost: 15_000_000,
                acquisitionDate: "2020-01-01",
                transferDate: "2024-06-01",
                isResidence: true,
                useSpecialDeduction: true,
                useReducedRate: true,
            }),
        );
        expect(r.grossProfit).toBe(20_000_000);
        expect(r.specialDeduction).toBe(20_000_000);
        expect(r.taxableIncome).toBe(0);
        expect(r.brackets).toEqual([]);
        expect(r.tax.total).toBe(0);
        expect(r.notes.some((n) => n.includes("納付時期"))).toBe(false);
        expect(r.notes.some((n) => n.includes("10年超が要件です（現在 4年）"))).toBe(true);
    });

    it("短期: 居住用でなければ控除も軽減税率も使わず、理由を出す", () => {
        const r = calcRealEstate(
            realEstate({
                transferPrice: 30_000_000,
                landCost: 20_000_000,
                acquisitionDate: "2022-01-01",
                transferDate: "2024-02-01",
                useSpecialDeduction: true,
                useReducedRate: true,
            }),
        );
        expect(r.term).toBe("short");
        expect(r.specialDeduction).toBe(0);
        expect(r.brackets.map((b) => b.label)).toEqual(["短期譲渡所得（税率 39.63%）"]);
        expect(r.tax).toEqual({
            incomeTax: 3_000_000,
            reconstruction: 63_000,
            nationalTax: 3_063_000,
            residentTax: 900_000,
            total: 3_963_000,
        });
        expect(r.notes.some((n) => n.startsWith("3,000万円特別控除は居住用財産が対象です"))).toBe(true);
        expect(r.notes).toContain("軽減税率の特例は居住用財産が対象です。");
    });

    it("日付が未入力なら短期で計算し、区分名にもそれを書く", () => {
        const r = calcRealEstate(realEstate({ transferPrice: 10_000_000, landCost: 5_000_000, buildingCost: 3_000_000 }));
        expect(r.ownershipYears).toBeNull();
        expect(r.elapsedYears).toBe(0);
        expect(r.depreciation).toBe(0);
        expect(r.brackets[0].label).toBe("短期譲渡所得（日付未入力・税率 39.63%）");
        expect(r.notes[0]).toContain("取得日と譲渡日を入力すると");
    });

    it("実額より概算が大きいときは差額を案内する", () => {
        const r = calcRealEstate(realEstate({ transferPrice: 10_000_000, landCost: 100_000 }));
        expect(r.notes).toContain(
            "概算取得費（500,000円）のほうが実額（100,000円）より大きいため、概算を選択すると譲渡所得が 400,000円 少なくなります。",
        );
    });

    it("譲渡損失は税額0で、損失の案内を出す", () => {
        const r = calcRealEstate(realEstate({ transferPrice: 10_000_000, landCost: 15_000_000 }));
        expect(r.grossProfit).toBe(-5_000_000);
        expect(r.isLoss).toBe(true);
        expect(r.taxableIncome).toBe(0);
        expect(r.tax.total).toBe(0);
        expect(r.notes.some((n) => n.startsWith("譲渡損失が生じています"))).toBe(true);
    });

    it("事業用は入力した償却費累計額を使い、95%で止める", () => {
        const base = { transferPrice: 30_000_000, buildingCost: 10_000_000, buildingUsage: "business" as const };
        expect(calcRealEstate(realEstate({ ...base, depreciationInput: 12_000_000 })).depreciation).toBe(9_500_000);
        expect(calcRealEstate(realEstate({ ...base, depreciationInput: 1_234_567.8 })).depreciation).toBe(1_234_567);
    });

    it("取得費加算は負の値を0にして足し、建物の算出根拠は実額のときだけ載せる", () => {
        const basis = "建物の取得価額は…により算出しています。";
        const actual = calcRealEstate(
            realEstate({ transferPrice: 30_000_000, landCost: 10_000_000, inheritedCostAddition: 2_000_000, buildingCostBasis: basis }),
        );
        expect(actual.acquisitionCost).toBe(12_000_000);
        expect(actual.notes).toContain(basis);

        const estimated = calcRealEstate(
            realEstate({ transferPrice: 30_000_000, costMode: "estimated", inheritedCostAddition: -1, buildingCostBasis: basis }),
        );
        expect(estimated.costAddition).toBe(0);
        expect(estimated.acquisitionCost).toBe(1_500_000);
        expect(estimated.notes).not.toContain(basis);
    });
});

describe("株式等の譲渡所得", () => {
    const securities = { transferPrice: 10_000_000, transferExpense: 100_000, costMode: "actual" as const, actualCost: 3_000_000 };

    it("一律 20.315%", () => {
        const r = calcSecurities({ ...securities, listed: true });
        expect(r.grossProfit).toBe(6_900_000);
        expect(r.ratePercent).toBe(20.315);
        expect(r.tax).toEqual({
            incomeTax: 1_035_000,
            reconstruction: 21_735,
            nationalTax: 1_056_700,
            residentTax: 345_000,
            total: 1_401_700,
        });
        expect(r.netProceeds).toBe(8_498_300);
        expect(r.notes).toHaveLength(2);
    });

    it("課税譲渡所得金額は1,000円未満を切り捨て、ミニマムタックス用には切り捨て前を残す", () => {
        const r = calcSecurities({ ...securities, actualCost: 3_000_999, listed: true });
        expect(r.grossProfit).toBe(6_899_001);
        expect(r.incomeAfterDeduction).toBe(6_899_001);
        expect(r.taxableIncome).toBe(6_899_000);
        expect(r.tax.incomeTax).toBe(1_034_850);
    });

    it("一般株式等の譲渡益は上場株式等の損失と通算できない旨を出す", () => {
        const r = calcSecurities({ ...securities, listed: false });
        expect(r.notes.some((n) => n.startsWith("一般株式等（非上場株式）の譲渡益は"))).toBe(true);
    });

    it("譲渡損失は上場・一般で案内が分かれる", () => {
        const loss = { ...securities, actualCost: 12_000_000 };
        const listed = calcSecurities({ ...loss, listed: true });
        expect(listed.isLoss).toBe(true);
        expect(listed.tax.total).toBe(0);
        expect(listed.notes.some((n) => n.includes("上場株式等の損失は"))).toBe(true);
        expect(calcSecurities({ ...loss, listed: false }).notes.some((n) => n.includes("一般株式等の損失は"))).toBe(true);
    });

    it("概算取得費は譲渡価額の5%", () => {
        const r = calcSecurities({ ...securities, costMode: "estimated", listed: true });
        expect(r.acquisitionCost).toBe(500_000);
        expect(r.notes[0]).toContain("概算取得費（譲渡価額の5%）");
    });
});
