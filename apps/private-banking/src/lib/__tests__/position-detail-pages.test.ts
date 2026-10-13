import { describe, expect, it } from "vitest";
import { DETAIL_PAGES, defaultColumns, detailColumns, detailPageFor, parseColumnPreferences } from "@/lib/position-detail-pages";
import { type Position } from "@/lib/portfolio-view";

describe("科目別ページと列設定", () => {
  it("同じ居宅でも土地・建物を別ページへ振り分ける", () => {
    const property = { side: "ASSET", category: "HOME_REAL_ESTATE", assetDetails: { propertyType: "LAND" } } as Position;
    expect(detailPageFor(property)?.key).toBe("home-real-estate-land");
    expect(detailPageFor({ ...property, assetDetails: { propertyType: "BUILDING" } })?.key).toBe("home-real-estate-building");
  });
  it("標準表示は科目固有の主要列に絞り、コンパクトな幅にする", () => {
    const columns = detailColumns(DETAIL_PAGES.find((p) => p.key === "insurance")!);
    const defaults = defaultColumns(columns);
    expect(defaults.visible).not.toContain("method");
    expect(columns.map((column) => column.key)).not.toContain("allocation");
    expect(columns.map((column) => column.key)).toContain("受取人・取り分");
    expect(defaults.widths.name).toBe(150);
    expect(defaults.widths.value).toBe(130);
    expect(defaults.widths.formula).toBe(400);
  });
  it("数値・文字・日付の列配置を列定義で統一する", () => {
    const columns = detailColumns(DETAIL_PAGES.find((p) => p.key === "home-real-estate-land")!);
    const alignment = Object.fromEntries(columns.map((column) => [column.key, column.alignment]));
    const depositColumns = detailColumns(DETAIL_PAGES.find((p) => p.key === "deposit")!);
    expect(alignment).toMatchObject({ name: "text", 土地面積: "number", 持分: "number", 路線価: "number", value: "number", formula: "text", currency: "center" });
    expect(depositColumns.find((column) => column.key === "満期日")?.alignment).toBe("center");
  });
  it("貸付・負債・保証は科目固有の判断項目を列にする", () => {
    const loan = detailColumns(DETAIL_PAGES.find((p) => p.key === "loan-receivable")!);
    const guarantee = detailColumns(DETAIL_PAGES.find((p) => p.key === "guarantee")!);
    expect(loan.filter((column) => ["返済期限", "利率", "担保"].includes(column.key)).map((column) => column.label)).toEqual(["返済期限", "利率（年％）", "担保"]);
    expect(loan.find((column) => column.key === "返済期限")?.alignment).toBe("center");
    expect(loan.find((column) => column.key === "利率")?.alignment).toBe("number");
    expect(guarantee.map((column) => column.key)).toEqual(expect.arrayContaining(["主債務者", "保証期限"]));
  });
  it("壊れた設定は復旧し、必須列・幅の範囲・列の重複を検証する", () => {
    const columns = detailColumns(DETAIL_PAGES.find((p) => p.key === "insurance")!);
    expect(parseColumnPreferences("壊れたJSON", columns).visible).toContain("value");
    const result = parseColumnPreferences(JSON.stringify({ version: 1, order: ["value", "value", "unknown"], visible: ["unknown"], widths: { name: 99999, value: -1 } }), columns);
    expect(result.order[0]).toBe("name");
    expect(result.order.filter((k) => k === "value")).toHaveLength(1);
    expect(result.visible).toEqual(["name", "value"]);
    expect(result.widths.name).toBe(600);
    expect(result.widths.value).toBe(90);
    expect(result.order).not.toContain("unknown");
  });
  it("旧標準幅の計算根拠だけを新しい広い幅へ移行する", () => {
    const columns = detailColumns(DETAIL_PAGES.find((p) => p.key === "insurance")!);
    const result = parseColumnPreferences(JSON.stringify({ version: 1, order: ["name", "formula", "value"], visible: ["name", "formula", "value"], widths: { name: 180, formula: 220, value: 130 } }), columns);
    expect(result.widths.name).toBe(180);
    expect(result.widths.formula).toBe(400);
  });
});
