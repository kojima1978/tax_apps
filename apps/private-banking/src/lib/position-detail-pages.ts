import { assetCategories, categoryLabels, liabilityCategories, positionSection, propertyTypeOf, realEstateCategories, type Position, type PositionSection } from "@/lib/portfolio-view";

export type DetailPage = { key: string; label: string; category: string; section: PositionSection; propertyType?: "LAND" | "BUILDING" };
export const DETAIL_PAGES: DetailPage[] = [...assetCategories, ...liabilityCategories, "GUARANTEE"].flatMap((category) => {
  const key = category.toLowerCase().replaceAll("_", "-");
  const section: PositionSection = category === "GUARANTEE" ? "CONTINGENT" : assetCategories.includes(category) ? "ASSET" : "LIABILITY";
  const base = { category, section };
  return realEstateCategories.includes(category)
    ? [{ ...base, key: `${key}-land`, label: `${categoryLabels[category]}（土地）`, propertyType: "LAND" as const }, { ...base, key: `${key}-building`, label: `${categoryLabels[category]}（建物）`, propertyType: "BUILDING" as const }]
    : [{ ...base, key, label: categoryLabels[category] }];
});
export const matchesDetailPage = (p: Position, page: DetailPage) => positionSection(p) === page.section && (p.category === page.category || (page.category === "LOAN_OTHER" && p.category === "LOAN")) && (!page.propertyType || propertyTypeOf(p) === page.propertyType);
export function detailPageFor(p: Position) { return DETAIL_PAGES.find((page) => matchesDetailPage(p, page)); }

export type DetailColumn = { key: string; label: string; width: number; alignment?: "text" | "number" | "center"; required?: boolean; defaultVisible?: boolean };
const numericDetailKeys = new Set([
  "value", "tax", "original", "fx", "株数・口数", "単価", "発行済株式数", "死亡保険金", "死亡退職金",
  "土地面積", "床面積", "持分", "路線価", "固定資産税評価額", "倍率", "調整率",
]);
const centeredDetailKeys = new Set(["currency", "満期日"]);
const detailAlignment = (key: string): DetailColumn["alignment"] => numericDetailKeys.has(key) ? "number" : centeredDetailKeys.has(key) ? "center" : "text";
const specificColumnWidth: Record<string, number> = {
  "所在地・金融機関等": 170, "受取人・取り分": 180, "小規模宅地等の区分": 160,
  "固定資産税評価額": 130, "死亡保険金": 140, "死亡退職金": 140, "発行済株式数": 130,
  "証券番号": 120, "被保険者": 120, "銘柄コード": 120, "株数・口数": 110,
  "口座番号（末尾）": 110, "満期日": 110, "土地面積": 110, "床面積": 110,
  "路線価": 120, "建物種類": 110, "株式種類": 110, "証券種類": 110,
  "預金種類": 100, "支店": 100, "地目": 90, "構造": 100, "持分": 90,
  "単価": 110, "倍率": 90, "調整率": 90,
};
export function detailColumns(page: DetailPage): DetailColumn[] {
  const specific = page.category === "DEPOSIT" ? ["所在地・金融機関等", "支店", "預金種類", "口座番号（末尾）", "満期日"]
    : page.category === "SECURITIES" ? ["所在地・金融機関等", "証券種類", "銘柄コード", "株数・口数", "単価", "調整率"]
    : page.category === "PRIVATE_SHARES" ? ["所在地・金融機関等", "株式種類", "株数・口数", "単価", "発行済株式数", "評価方式"]
    : page.category === "INSURANCE" ? ["証券番号", "被保険者", "受取人・取り分", "死亡保険金"]
    : page.category === "INSURANCE_RIGHTS" ? ["証券番号", "被保険者"]
    : page.category === "RETIREMENT_ALLOWANCE" ? ["所在地・金融機関等", "受取人・取り分", "死亡退職金"]
    : page.propertyType === "LAND" ? ["所在地・金融機関等", "地目", "土地面積", "持分", "路線価", "固定資産税評価額", "倍率", "調整率", "小規模宅地等の区分"]
    : page.propertyType === "BUILDING" ? ["所在地・金融機関等", "建物種類", "構造", "床面積", "持分", "固定資産税評価額", "倍率", "調整率"]
    : page.category === "BUSINESS_ASSETS" ? ["所在地・金融機関等", "資産種類", "事業名", "単価", "調整率"]
    : page.category === "COLLECTIBLES" ? ["資産種類", "単価", "調整率"] : ["所在地・金融機関等"];
  const amountLabel = page.category === "INSURANCE" || page.category === "INSURANCE_RIGHTS" ? "解約返戻金（円）" : page.category === "RETIREMENT_ALLOWANCE" ? "解約手当金（円）" : page.section === "CONTINGENT" ? "保証金額（円）" : page.section === "LIABILITY" ? "残高（円）" : "評価額（円）";
  return [
    { key: "name", label: "名称", width: 150, alignment: "text", required: true },
    { key: "allocation", label: page.section === "ASSET" ? "取得者" : page.section === "LIABILITY" ? "負担者" : "負担予定者", width: 170, alignment: "text", defaultVisible: true },
    ...specific.map((label) => ({ key: label, label: label === "所在地・金融機関等" ? page.propertyType ? "所在地" : "金融機関・相手先等" : label, width: specificColumnWidth[label] ?? 120, alignment: detailAlignment(label), defaultVisible: !["口座番号（末尾）", "満期日", "倍率", "調整率", "小規模宅地等の区分", "発行済株式数", "評価方式"].includes(label) })),
    { key: "value", label: amountLabel, width: 130, alignment: "number", required: true },
    { key: "method", label: "評価方法", width: 140, alignment: "text" },
    { key: "formula", label: "計算根拠", width: 220, alignment: "text" },
    { key: "tax", label: "相続税負担額", width: 140, alignment: "number" },
    { key: "currency", label: "通貨", width: 90, alignment: "center" },
    { key: "original", label: "通貨建て金額", width: 140, alignment: "number" },
    { key: "fx", label: "円換算レート", width: 120, alignment: "number" },
    { key: "メモ", label: "メモ", width: 200, alignment: "text" },
  ];
}
export type ColumnPreferences = { version: 1; order: string[]; visible: string[]; widths: Record<string, number> };
export function defaultColumns(columns: DetailColumn[]): ColumnPreferences { return { version: 1, order: columns.map((c) => c.key), visible: columns.filter((c) => c.required || c.defaultVisible).map((c) => c.key), widths: Object.fromEntries(columns.map((c) => [c.key, c.width])) }; }
export function parseColumnPreferences(raw: string | null, columns: DetailColumn[]): ColumnPreferences {
  const defaults = defaultColumns(columns);
  try {
    const value = JSON.parse(raw ?? "null");
    if (value?.version !== 1 || !Array.isArray(value.order) || !Array.isArray(value.visible)) return defaults;
    const valid = new Set(columns.map((c) => c.key));
    const order = [...new Set<string>(value.order.filter((key: unknown) => typeof key === "string" && valid.has(key)))];
    for (const col of columns) if (!order.includes(col.key)) order.push(col.key);
    const visible = [...new Set<string>(value.visible.filter((key: unknown) => typeof key === "string" && valid.has(key)))];
    for (const col of columns) if (col.required && !visible.includes(col.key)) visible.push(col.key);
    const widths = { ...defaults.widths };
    for (const col of columns) { const width = value.widths?.[col.key]; if (typeof width === "number" && Number.isFinite(width)) widths[col.key] = Math.max(90, Math.min(600, width)); }
    return { version: 1, order: ["name", ...order.filter((key) => key !== "name")], visible, widths };
  } catch { return defaults; }
}
