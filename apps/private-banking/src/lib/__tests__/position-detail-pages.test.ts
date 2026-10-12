import { describe, expect, it } from "vitest";
import { DETAIL_PAGES, detailColumns, detailPageFor, parseColumnPreferences } from "@/lib/position-detail-pages";
import { type Position } from "@/lib/portfolio-view";

describe("科目別ページと列設定", () => {
  it("同じ居宅でも土地・建物を別ページへ振り分ける", () => {
    const property = { side: "ASSET", category: "HOME_REAL_ESTATE", assetDetails: { propertyType: "LAND" } } as Position;
    expect(detailPageFor(property)?.key).toBe("home-real-estate-land");
    expect(detailPageFor({ ...property, assetDetails: { propertyType: "BUILDING" } })?.key).toBe("home-real-estate-building");
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
});
