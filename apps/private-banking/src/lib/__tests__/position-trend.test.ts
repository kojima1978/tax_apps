import { describe, expect, it } from "vitest";
import { compactYen } from "@/lib/format";
import { type Position, type Snapshot } from "@/lib/portfolio-view";
import { changeText, changeTone, lineageHistory, positionTrendRows } from "@/lib/position-trend";

// 名称・金融機関・所在はすべて架空のもの

let nextId = 1;
const position = (lineageKey: string | undefined, name: string, valueJpy: number, extra: Partial<Position> = {}) => ({
  id: nextId++, side: "ASSET", category: "DEPOSIT", name, institution: "テスト銀行", currency: "JPY", originalAmount: valueJpy, fxRate: 1,
  valueJpy, liquidity: "", includedInNetWorth: true, valuationMethod: "", valuationFormula: "MANUAL", valuationQuantity: null,
  valuationUnitPrice: null, adjustmentRate: null, landArea: null, roadsideValue: null, fixedAssetTaxValue: null, valuationMultiplier: null,
  ownershipShare: null, ownershipNumerator: null, ownershipDenominator: null, assetDetails: null, note: "", lineageKey, ...extra,
} as Position);

const snapshot = (id: number, fiscalYear: number, positions: Position[]) => ({
  id, fiscalYear, label: "", asOfDate: `${fiscalYear}-12-31`, isCurrent: false, estimatedInheritanceTax: 0, inheritanceTaxCalculation: null,
  otherTaxes: 0, successionCosts: 0, inheritanceTaxUpdatedAt: null, fxRates: {}, updatedAt: "", positions,
} as unknown as Snapshot);

describe("明細ごとの推移（3期）", () => {
  it("系統キーで年度をまたいでつなぎ、名称を変えた明細も1行にまとめる（旧名称を添える）", () => {
    const rows = positionTrendRows([
      snapshot(1, 2024, [position("a", "普通預金", 1_000_000)]),
      snapshot(2, 2025, [position("a", "普通預金", 1_500_000)]),
      snapshot(3, 2026, [position("a", "普通預金（生活費）", 1_200_000)]),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ lineageKey: "a", name: "普通預金（生活費）", formerNames: ["普通預金"], detail: "テスト銀行", caption: "預金・現金", values: [1_000_000, 1_500_000, 1_200_000], change: -300_000, status: null });
  });

  it("直前に無く最新にある明細は「新規」、直前にあって最新に無い明細は「最新年度に無し」。無い年度は0円として差を出す", () => {
    const rows = positionTrendRows([
      null,
      snapshot(2, 2025, [position("sold", "上場株式", 3_000_000, { category: "SECURITIES" })]),
      snapshot(3, 2026, [position("new", "定期預金", 2_000_000)]),
    ]);
    const byKey = new Map(rows.map((row) => [row.lineageKey, row]));
    expect(byKey.get("new")).toMatchObject({ values: [null, null, 2_000_000], change: 2_000_000, status: "new" });
    expect(byKey.get("sold")).toMatchObject({ values: [null, 3_000_000, null], change: -3_000_000, status: "ended" });
  });

  it("直前か最新の期そのものが無ければ、差も新規・最新年度に無しの印も出さない", () => {
    const rows = positionTrendRows([null, null, snapshot(3, 2026, [position("a", "普通預金", 1_000_000)])]);
    expect(rows[0]).toMatchObject({ change: null, status: null, values: [null, null, 1_000_000] });
  });

  it("資産・負債・偶発債務の順、その中は科目の順、不動産は土地を建物より先に並べる", () => {
    const rows = positionTrendRows([null, null, snapshot(3, 2026, [
      position("guarantee", "連帯保証", 5_000_000, { side: "LIABILITY", category: "GUARANTEE", includedInNetWorth: false }),
      position("loan", "住宅ローン", 8_000_000, { side: "LIABILITY", category: "LOAN_HOME" }),
      position("building", "自宅建物", 6_000_000, { category: "HOME_REAL_ESTATE", assetDetails: { propertyType: "BUILDING", propertyAddress: "架空市1-1" } }),
      position("land", "自宅土地", 9_000_000, { category: "HOME_REAL_ESTATE", assetDetails: { propertyType: "LAND", propertyAddress: "架空市1-1" } }),
      position("deposit", "普通預金", 1_000_000),
    ])]);
    expect(rows.map((row) => row.lineageKey)).toEqual(["deposit", "land", "building", "loan", "guarantee"]);
    expect(rows.map((row) => row.section)).toEqual(["ASSET", "ASSET", "ASSET", "LIABILITY", "CONTINGENT"]);
    expect(rows[1].caption).toBe("居宅・土地");
  });

  it("同じ科目の中は最新の期の並び順。最新に無い明細はその後ろ", () => {
    const rows = positionTrendRows([
      null,
      snapshot(2, 2025, [position("old", "解約した預金", 1), position("b", "預金B", 1), position("a", "預金A", 1)]),
      snapshot(3, 2026, [position("a", "預金A", 1), position("b", "預金B", 1)]),
    ]);
    expect(rows.map((row) => row.lineageKey)).toEqual(["a", "b", "old"]);
  });

  it("キーの無い（保存前の）明細は他とつながない", () => {
    const rows = positionTrendRows([null, snapshot(2, 2025, [position(undefined, "普通預金", 1)]), snapshot(3, 2026, [position(undefined, "普通預金", 1)])]);
    expect(rows).toHaveLength(2);
  });
});

describe("1つの明細の全年度の推移", () => {
  it("初めて出てくる年度から最新の年度まで古い順に並べ、無くなった年度も残す", () => {
    const snapshots = [
      snapshot(4, 2026, [position("other", "別の預金", 1)]),
      snapshot(1, 2022, []),
      snapshot(2, 2023, [position("a", "普通預金", 1_000_000)]),
      snapshot(3, 2024, [position("a", "普通預金", 1_300_000)]),
      snapshot(5, 2025, [position("a", "普通預金", 900_000)]),
    ];
    const history = lineageHistory(snapshots, "a");
    expect(history.map((entry) => entry.snapshot.fiscalYear)).toEqual([2023, 2024, 2025, 2026]);
    expect(history.map((entry) => entry.position?.valueJpy ?? null)).toEqual([1_000_000, 1_300_000, 900_000, null]);
    expect(history.map((entry) => entry.change)).toEqual([null, 300_000, -400_000, null]);
  });

  it("どの年度にも無いキーは空", () => {
    expect(lineageHistory([snapshot(1, 2026, [])], "missing")).toEqual([]);
  });
});

describe("差の表示", () => {
  it("増えたら「+」、減ったら「△」、出せなければ「—」", () => {
    expect(changeText(1_230_000, compactYen)).toBe("+123万円");
    expect(changeText(-1_230_000, compactYen)).toBe("△123万円");
    expect(changeText(null, compactYen)).toBe("—");
    expect([changeTone(1), changeTone(-1), changeTone(0), changeTone(null)]).toEqual(["positive", "negative", "neutral", ""]);
  });
});
