import { describe, expect, it } from "vitest";
import {
    calcBuildingPrice,
    constructionUnitPrice,
    eraLabel,
    formatAreaInput,
    guessConsumptionTaxRate,
    parseArea,
    type BuildingPriceInput,
} from "./building-price";

const input = (overrides: Partial<BuildingPriceInput> = {}): BuildingPriceInput => ({
    method: "table",
    totalCost: 30_000_000,
    taxRate: 0.1,
    consumptionTax: 0,
    landAssessedValue: 0,
    buildingAssessedValue: 0,
    builtDate: "",
    acquisitionDate: "",
    constructionStructure: "wood",
    floorArea: 0,
    structureKey: "wood",
    buildingUsage: "non-business",
    ...overrides,
});

describe("建築価額表", () => {
    it("改元の年は元年と書く", () => {
        expect(eraLabel(1959)).toBe("昭和34年");
        expect(eraLabel(1988)).toBe("昭和63年");
        expect(eraLabel(1989)).toBe("平成元年");
        expect(eraLabel(2018)).toBe("平成30年");
        expect(eraLabel(2019)).toBe("令和元年");
        expect(eraLabel(2023)).toBe("令和5年");
    });

    it("単価は千円単位の表を円にして引き、表に無い年は null", () => {
        expect(constructionUnitPrice(1959, "wood")).toBe(8_700);
        expect(constructionUnitPrice(2000, "steel")).toBe(132_300);
        expect(constructionUnitPrice(2023, "src")).toBe(366_700);
        expect(constructionUnitPrice(1958, "wood")).toBeNull();
        expect(constructionUnitPrice(2024, "wood")).toBeNull();
    });

    it("単価×床面積から新築から購入までの償却費を引く", () => {
        const r = calcBuildingPrice(
            input({ builtDate: "2000-06-01", acquisitionDate: "2010-06-01", floorArea: 100 }),
        );
        expect(r.resolved).toBe(true);
        // 159,000円/㎡ × 100㎡ = 15,900,000円、0.9 × 0.031 × 10年 = 27.9%
        expect(r.buildingCost).toBe(15_900_000 - 4_436_100);
        expect(r.landCost).toBe(30_000_000 - 11_463_900);
        expect(r.warnings).toEqual([]);
    });

    it("入力が足りなければ何が要るかを返す", () => {
        expect(calcBuildingPrice(input()).warnings[0]).toContain("新築年月日");
        expect(calcBuildingPrice(input({ builtDate: "2000-06-01" })).warnings[0]).toContain("延べ床面積");
        expect(calcBuildingPrice(input({ builtDate: "2024-06-01", floorArea: 100 })).warnings[0]).toContain(
            "昭和34年（1959年）から令和5年（2023年）まで",
        );
    });

    it("取得日が無い・事業用のときは注意を出す", () => {
        const r = calcBuildingPrice(input({ builtDate: "2000-06-01", floorArea: 100, buildingUsage: "business" }));
        expect(r.buildingCost).toBe(15_900_000);
        expect(r.warnings).toHaveLength(2);
    });
});

describe("消費税から逆算・固定資産税評価額で按分", () => {
    it("消費税額を税率で割り戻して税込の建物価額にする", () => {
        const r = calcBuildingPrice(input({ method: "tax", consumptionTax: 2_000_000 }));
        expect(r.buildingCost).toBe(22_000_000);
        expect(r.landCost).toBe(8_000_000);
        expect(calcBuildingPrice(input({ method: "tax", consumptionTax: 800_000, taxRate: 0.08 })).buildingCost).toBe(10_800_000);
    });

    it("評価額の比で按分し、建物の消費税を含めて割り戻す", () => {
        const r = calcBuildingPrice(
            input({ method: "assessed", landAssessedValue: 10_000_000, buildingAssessedValue: 5_000_000 }),
        );
        // 30,000,000 ÷（2 + 1 + 0.1）= 9,677,419、消費税 967,741
        expect(r.buildingCost).toBe(10_645_160);
        expect(r.landCost).toBe(19_354_840);
    });

    it("建物が合計を超えたら土地は0で止めて注意、合計が未入力なら入力を促す", () => {
        const over = calcBuildingPrice(input({ method: "tax", consumptionTax: 3_000_000 }));
        expect(over.landCost).toBe(0);
        expect(over.warnings[0]).toContain("合計取得価額を超えています");

        const noTotal = calcBuildingPrice(input({ method: "tax", consumptionTax: 2_000_000, totalCost: 0 }));
        expect(noTotal.resolved).toBe(true);
        expect(noTotal.landCost).toBe(0);
        expect(noTotal.warnings).toEqual(["土地建物の合計取得価額を入力すると、土地の取得価額も求められます。"]);
    });

    it("直接入力では何も算出しない", () => {
        expect(calcBuildingPrice(input({ method: "direct" }))).toMatchObject({ resolved: false, steps: [] });
    });
});

describe("消費税率の既定値と面積の入力", () => {
    it("取得日から税率を選ぶ", () => {
        expect(guessConsumptionTaxRate("2019-10-01")).toBe("0.1");
        expect(guessConsumptionTaxRate("2019-09-30")).toBe("0.08");
        expect(guessConsumptionTaxRate("2014-03-31")).toBe("0.05");
        expect(guessConsumptionTaxRate("1997-03-31")).toBe("0.03");
        expect(guessConsumptionTaxRate("1989-03-31")).toBe("0");
        expect(guessConsumptionTaxRate("")).toBe("0.1");
    });

    it("面積は半角の数字と小数点だけにする", () => {
        expect(formatAreaInput("１２．５㎡")).toBe("12.5");
        expect(parseArea("12.")).toBe(12);
        expect(parseArea("abc")).toBe(0);
    });
});
