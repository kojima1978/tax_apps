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
  "土地面積", "床面積", "持分", "路線価", "固定資産税評価額", "倍率", "調整率", "利率",
]);
const centeredDetailKeys = new Set(["currency", "満期日", "返済期限", "契約終了日", "支払期限", "保証期限"]);
const detailAlignment = (key: string): DetailColumn["alignment"] => numericDetailKeys.has(key) ? "number" : centeredDetailKeys.has(key) ? "center" : "text";
const specificColumnWidth: Record<string, number> = {
  "所在地・金融機関等": 170, "受取人・取り分": 180, "小規模宅地等の区分": 160,
  "固定資産税評価額": 140, "死亡保険金": 140, "死亡退職金": 140, "発行済株式数": 130,
  "証券番号": 120, "被保険者": 120, "銘柄コード": 120, "株数・口数": 110,
  "口座番号（末尾）": 110, "満期日": 110, "土地面積": 110, "床面積": 110,
  "路線価": 120, "建物種類": 110, "株式種類": 110, "証券種類": 110,
  "預金種類": 100, "支店": 100, "地目": 90, "構造": 100, "持分": 100,
  "単価": 110, "倍率": 90, "調整率": 90,
  "返済期限": 120, "利率": 100, "担保": 180, "契約終了日": 120, "支払期限": 120,
  "対象物件": 180, "返還条件": 180, "主債務者": 150, "保証期限": 120,
};
const detailColumnLabels: Record<string, string> = {
  "死亡保険金": "死亡保険金（円）",
  "死亡退職金": "死亡退職金（円）",
  "固定資産税評価額": "固定資産税評価額（円）",
  "路線価": "路線価（円/㎡）",
  "単価": "単価（登録通貨）",
  "利率": "利率（年％）",
};
export function detailColumns(page: DetailPage): DetailColumn[] {
  const specific = page.category === "DEPOSIT" ? ["所在地・金融機関等", "支店", "預金種類", "口座番号（末尾）", "満期日"]
    : page.category === "SECURITIES" ? ["所在地・金融機関等", "証券種類", "銘柄コード", "株数・口数", "単価", "調整率"]
    : page.category === "PRIVATE_SHARES" ? ["所在地・金融機関等", "株式種類", "株数・口数", "単価", "発行済株式数", "評価方式"]
    : page.category === "INSURANCE" ? ["証券番号", "被保険者", "受取人・取り分", "死亡保険金"]
    : page.category === "INSURANCE_RIGHTS" ? ["証券番号", "被保険者"]
    : page.category === "RETIREMENT_ALLOWANCE" ? ["所在地・金融機関等", "受取人・取り分", "死亡退職金"]
    : page.propertyType === "LAND" ? ["所在地・金融機関等", "地目", "土地面積", "持分", "固定資産税評価額", "路線価", "倍率", "調整率", "小規模宅地等の区分"]
    : page.propertyType === "BUILDING" ? ["所在地・金融機関等", "建物種類", "構造", "床面積", "持分", "固定資産税評価額", "倍率", "調整率"]
    : page.category === "BUSINESS_ASSETS" ? ["所在地・金融機関等", "資産種類", "事業名", "単価", "調整率"]
    : page.category === "LOAN_RECEIVABLE" || ["LOAN_HOME", "LOAN_INVESTMENT_PROPERTY", "LOAN_SECURITIES", "LOAN_BUSINESS", "LOAN_OTHER", "LOAN"].includes(page.category) ? ["所在地・金融機関等", "返済期限", "利率", "担保"]
    : page.category === "LEASE_OBLIGATION" ? ["所在地・金融機関等", "契約終了日"]
    : page.category === "ACCOUNTS_PAYABLE" ? ["所在地・金融機関等", "支払期限"]
    : page.category === "DEPOSITS_RECEIVED" ? ["所在地・金融機関等", "対象物件", "返還条件"]
    : page.category === "GUARANTEE" ? ["所在地・金融機関等", "主債務者", "保証期限"]
    : page.category === "COLLECTIBLES" ? ["資産種類", "単価", "調整率"] : ["所在地・金融機関等"];
  const amountLabel = page.category === "INSURANCE" || page.category === "INSURANCE_RIGHTS" ? "解約返戻金（円）" : page.category === "RETIREMENT_ALLOWANCE" ? "解約手当金（円）" : page.section === "CONTINGENT" ? "保証金額（円）" : page.section === "LIABILITY" ? "残高（円）" : "評価額（円）";
  return [
    { key: "name", label: "名称", width: 130, alignment: "text", required: true },
    ...specific.map((label) => ({ key: label, label: label === "所在地・金融機関等" ? page.propertyType ? "所在地" : "金融機関・相手先等" : detailColumnLabels[label] ?? label, width: specificColumnWidth[label] ?? 120, alignment: detailAlignment(label), defaultVisible: !["口座番号（末尾）", "満期日", "調整率", "小規模宅地等の区分", "発行済株式数", "評価方式"].includes(label) })),
    { key: "value", label: amountLabel, width: 110, alignment: "number", required: true },
    { key: "method", label: "評価方法", width: 140, alignment: "text" },
    { key: "formula", label: "計算根拠", width: 420, alignment: "text" },
    { key: "tax", label: "相続税負担額（円）", width: 140, alignment: "number" },
    { key: "currency", label: "通貨", width: 90, alignment: "center" },
    { key: "original", label: "通貨建て金額", width: 140, alignment: "number" },
    { key: "fx", label: "円換算レート（円/通貨）", width: 120, alignment: "number" },
    { key: "メモ", label: "メモ", width: 200, alignment: "text" },
  ];
}
export type ColumnPreferences = { version: 4; order: string[]; visible: string[]; widths: Record<string, number> };
export function defaultColumns(columns: DetailColumn[]): ColumnPreferences { return { version: 4, order: columns.map((c) => c.key), visible: columns.filter((c) => c.required || c.defaultVisible).map((c) => c.key), widths: Object.fromEntries(columns.map((c) => [c.key, c.width])) }; }
export function parseColumnPreferences(raw: string | null, columns: DetailColumn[]): ColumnPreferences {
  const defaults = defaultColumns(columns);
  try {
    const value = JSON.parse(raw ?? "null");
    if (![1, 2, 3, 4].includes(value?.version) || !Array.isArray(value.order) || !Array.isArray(value.visible)) return defaults;
    const valid = new Set(columns.map((c) => c.key));
    const order = [...new Set<string>(value.order.filter((key: unknown) => typeof key === "string" && valid.has(key)))];
    for (const col of columns) if (!order.includes(col.key)) order.push(col.key);
    // 土地の旧標準順だけを「固定資産税評価額 → 路線価」へ移行する。
    // 利用者が両列を離して独自配置している場合と、v3で並べ直した設定は保持する。
    const roadsideIndex = order.indexOf("路線価");
    const fixedAssetTaxIndex = order.indexOf("固定資産税評価額");
    if (value.version < 3 && roadsideIndex >= 0 && fixedAssetTaxIndex === roadsideIndex + 1) {
      [order[roadsideIndex], order[fixedAssetTaxIndex]] = [order[fixedAssetTaxIndex], order[roadsideIndex]];
    }
    const visible = [...new Set<string>(value.visible.filter((key: unknown) => typeof key === "string" && valid.has(key)))];
    for (const col of columns) if (col.required && !visible.includes(col.key)) visible.push(col.key);
    // v1では倍率が標準非表示だった。重要な評価情報として一度だけ標準表示へ移行し、
    // v2で利用者が再び非表示にした場合はその選択を尊重する。
    if (value.version === 1 && columns.some((col) => col.key === "倍率") && !visible.includes("倍率")) visible.push("倍率");
    const widths = { ...defaults.widths };
    for (const col of columns) { const width = value.widths?.[col.key]; if (typeof width === "number" && Number.isFinite(width)) widths[col.key] = Math.max(90, Math.min(600, width)); }
    // 旧標準幅だけを新しい配分へ移行し、利用者が変更した幅は保持する。
    if (value.version === 1 && value.widths?.name === 150 && defaults.widths.name === 130) widths.name = 130;
    if (value.version === 1 && [220, 400].includes(value.widths?.formula) && defaults.widths.formula === 420) widths.formula = 420;
    if (value.version < 4 && value.widths?.value === 130 && defaults.widths.value === 110) widths.value = 110;
    if (value.version < 4 && value.widths?.["固定資産税評価額"] === 130 && defaults.widths["固定資産税評価額"] === 140) widths["固定資産税評価額"] = 140;
    if (value.version < 4 && value.widths?.["持分"] === 90 && defaults.widths["持分"] === 100) widths["持分"] = 100;
    return { version: 4, order: ["name", ...order.filter((key) => key !== "name")], visible, widths };
  } catch { return defaults; }
}
