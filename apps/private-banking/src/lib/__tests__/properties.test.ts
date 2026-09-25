import { describe, expect, it } from "vitest";
import { searchTerms } from "@/lib/clients";
import type { Position } from "@/lib/portfolio-view";
import {
  PROPERTY_FILTER_ALL,
  type PropertyOwner,
  filterProperties,
  propertiesCsv,
  propertiesCsvFileName,
  propertyRows,
  toPropertyRow,
} from "@/lib/properties";

const position = (fields: Partial<Position>) => ({
  id: 1, side: "ASSET", category: "HOME_REAL_ESTATE", name: "自宅土地", institution: "",
  currency: "JPY", originalAmount: 0, fxRate: 1, valueJpy: 50_000_000, liquidity: "LOW",
  includedInNetWorth: true, valuationMethod: "路線価", valuationFormula: "LAND_ROADSIDE",
  valuationQuantity: null, valuationUnitPrice: null, adjustmentRate: 1,
  landArea: 180, roadsideValue: 300_000, fixedAssetTaxValue: null, valuationMultiplier: null,
  ownershipShare: null, ownershipNumerator: 1, ownershipDenominator: 2,
  assetDetails: null, note: "",
  ...fields,
} as Position);

const owner = (fields: Partial<PropertyOwner> = {}): PropertyOwner => ({
  householdId: 3, clientCode: "PB-000003", clientName: "山田 太郎", clientNameKana: "ヤマダタロウ",
  assignedStaff: "佐藤", fiscalYear: 2026, asOfDate: "2026-12-31",
  ...fields,
});

describe("toPropertyRow", () => {
  it("土地は地目と地積を出す", () => {
    const row = toPropertyRow(position({ assetDetails: { propertyType: "LAND", propertyAddress: "東京都港区1-2-3", landCategory: "RESIDENTIAL", smallLotType: "RESIDENTIAL" } }), owner());
    expect(row).toMatchObject({
      clientName: "山田 太郎",
      categoryLabel: "居宅",
      propertyTypeLabel: "土地",
      address: "東京都港区1-2-3",
      useLabel: "宅地",
      area: 180,
      ownership: "1/2",
      smallLotLabel: "特定居住用宅地",
      valueJpy: 50_000_000,
    });
    expect(row.valuationDetail).toContain("持分1/2");
  });

  it("建物は建物用途と床面積を出す", () => {
    const row = toPropertyRow(position({
      category: "REAL_ESTATE", name: "賃貸アパート", valuationFormula: "BUILDING", landArea: null,
      assetDetails: { propertyType: "BUILDING", propertyAddress: "千葉県船橋市4-5", buildingType: "APARTMENT", floorArea: 245.5 },
    }), owner());
    expect(row).toMatchObject({ categoryLabel: "収益不動産", propertyTypeLabel: "建物", useLabel: "共同住宅", area: 245.5 });
  });

  it("未入力の面積は 0 と区別して null にする", () => {
    expect(toPropertyRow(position({ landArea: null }), owner()).area).toBeNull();
  });
});

describe("propertyRows", () => {
  it("顧客の順を保ったまま、顧客内は科目→土地・建物の順に並べる", () => {
    const rows = propertyRows([
      { position: position({ id: 1, category: "IDLE_REAL_ESTATE", name: "遊休地" }), owner: owner() },
      { position: position({ id: 2, category: "HOME_REAL_ESTATE", name: "自宅建物", valuationFormula: "BUILDING" }), owner: owner() },
      { position: position({ id: 3, category: "HOME_REAL_ESTATE", name: "自宅土地" }), owner: owner() },
      { position: position({ id: 4, category: "HOME_REAL_ESTATE", name: "別宅土地" }), owner: owner({ householdId: 9, clientName: "鈴木 花子" }) },
    ]);
    expect(rows.map((row) => row.positionId)).toEqual([3, 2, 1, 4]);
  });
});

describe("filterProperties", () => {
  const rows = propertyRows([
    { position: position({ id: 1, name: "自宅土地", assetDetails: { propertyAddress: "東京都港区1-2-3", landCategory: "RESIDENTIAL" } }), owner: owner() },
    {
      position: position({ id: 2, category: "REAL_ESTATE", name: "賃貸アパート", valuationFormula: "BUILDING", assetDetails: { propertyType: "BUILDING", propertyAddress: "千葉県船橋市4-5", buildingType: "APARTMENT" } }),
      owner: owner({ householdId: 9, clientCode: "PB-000009", clientName: "鈴木 花子", clientNameKana: "スズキハナコ", assignedStaff: "高橋" }),
    },
  ]);
  const all = { category: PROPERTY_FILTER_ALL, propertyType: PROPERTY_FILTER_ALL };

  it("検索語なし・絞り込みなしでは全件返す", () => {
    expect(filterProperties(rows, [], all)).toHaveLength(2);
  });

  it("顧客名・所在地・地目のいずれかに当たれば残す（ひらがな・カナの違いは吸収する）", () => {
    expect(filterProperties(rows, searchTerms("東京"), all).map((row) => row.positionId)).toEqual([1]);
    expect(filterProperties(rows, searchTerms("すずき"), all).map((row) => row.positionId)).toEqual([2]);
    expect(filterProperties(rows, searchTerms("共同住宅"), all).map((row) => row.positionId)).toEqual([2]);
  });

  it("検索語はすべて含まれていなければ残さない", () => {
    expect(filterProperties(rows, searchTerms("山田 船橋"), all)).toHaveLength(0);
  });

  it("科目と土地・建物の絞り込みは検索語と重ねて効く", () => {
    expect(filterProperties(rows, [], { ...all, category: "REAL_ESTATE" }).map((row) => row.positionId)).toEqual([2]);
    expect(filterProperties(rows, [], { ...all, propertyType: "LAND" }).map((row) => row.positionId)).toEqual([1]);
    expect(filterProperties(rows, searchTerms("鈴木"), { ...all, propertyType: "LAND" })).toHaveLength(0);
  });
});

describe("propertiesCsv", () => {
  const rows = propertyRows([{
    position: position({ name: 'A"棟', note: "備考,あり", assetDetails: { propertyAddress: "東京都港区1-2-3", landCategory: "RESIDENTIAL" } }),
    owner: owner(),
  }]);
  const csv = propertiesCsv(rows);

  it("Excel 向けに BOM と CRLF を付ける", () => {
    expect(csv.startsWith("﻿\"顧客コード\",\"顧客名\"")).toBe(true);
    expect(csv.split("\r\n")).toHaveLength(3);
  });

  it("引用符は二重にし、カンマを含む値も1つの列に収める", () => {
    const cells = csv.split("\r\n")[1];
    expect(cells).toContain('"A""棟"');
    expect(cells).toContain('"備考,あり"');
  });

  it("明細が無くても見出しだけは書き出す", () => {
    expect(propertiesCsv([]).split("\r\n").filter(Boolean)).toHaveLength(1);
  });
});

describe("propertiesCsvFileName", () => {
  it("JST の日時を付ける", () => {
    expect(propertiesCsvFileName(new Date("2026-09-25T15:30:00.000Z"))).toBe("private-banking-properties-20260926-0030.csv");
  });
});
