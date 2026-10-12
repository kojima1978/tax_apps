import { type Position, positionSection, assetGroupOf, categoryLabels, propertyTypeOf, propertyTypeLabels, institutionOrPropertyAddress, deemedConfig, deemedAllocations, deemedBenefitJpy, landCategoryByValue, buildingTypeByValue, smallLotTypeOptions, otherAssetTypeLabels, ownershipFraction } from "@/lib/portfolio-view";
import { yen, valuationNumber } from "@/lib/format";

export const DETAIL_GROUPS = [
  { key: "deposits", label: "預金・現金" }, { key: "securities", label: "有価証券" },
  { key: "insurance", label: "保険・退職金" }, { key: "property", label: "不動産" },
  { key: "business", label: "事業用資産" }, { key: "other", label: "その他資産" },
  { key: "liabilities", label: "負債" }, { key: "contingent", label: "偶発債務" },
] as const;
export function detailGroup(position: Position) {
  const section = positionSection(position);
  if (section !== "ASSET") return section === "CONTINGENT" ? "contingent" : "liabilities";
  if (position.category === "DEPOSIT") return "deposits";
  if (position.category === "SECURITIES") return "securities";
  if (["INSURANCE", "INSURANCE_RIGHTS", "RETIREMENT_ALLOWANCE"].includes(position.category)) return "insurance";
  const group = assetGroupOf(position.category);
  return group === "不動産" ? "property" : group === "事業用資産" ? "business" : "other";
}
export function positionCaption(position: Position) {
  const propertyType = propertyTypeOf(position);
  return `${categoryLabels[position.category] ?? position.category}${propertyType ? `・${propertyTypeLabels[propertyType]}` : ""}`;
}
export function positionKeyInfo(position: Position) {
  const d = position.assetDetails ?? {};
  const config = deemedConfig(position);
  if (config) return [d.insuredPerson ? `被保険者 ${d.insuredPerson}` : "", deemedAllocations(position).map((a) => `${a.recipient || "未設定"} ${a.numerator}/${a.denominator}`).join("、")].filter(Boolean).join(" / ") || "受取人未設定";
  return institutionOrPropertyAddress(position) || "—";
}
export function positionAllocationLabel(position: Position) {
  const config = deemedConfig(position);
  if (config) {
    const recipients = deemedAllocations(position).filter((allocation) => allocation.recipient.trim());
    return recipients.length > 0 ? recipients.map((allocation) => `${allocation.recipient} ${allocation.numerator}/${allocation.denominator}`).join("、") : "未定";
  }
  const amounts = positionAllocationAmounts(position);
  return amounts.length > 0
    ? amounts.map((allocation) => `${allocation.familyMemberName} ${yen.format(allocation.amountJpy)}`).join("、")
    : "未定";
}

/** 保存された分数を、合計が評価額と必ず一致する円単位の配分額へ変換する。 */
export function positionAllocationAmounts(position: Position) {
  const allocations = position.allocations ?? [];
  if (allocations.length === 0) return [];
  const exact = allocations.map((allocation, index) => ({
    ...allocation,
    index,
    raw: position.valueJpy * allocation.numerator / allocation.denominator,
  }));
  const amounts = exact.map((allocation) => Math.floor(allocation.raw));
  const remainder = Math.round(position.valueJpy) - amounts.reduce((sum, amount) => sum + amount, 0);
  const remainderOrder = [...exact].sort((a, b) => (b.raw - Math.floor(b.raw)) - (a.raw - Math.floor(a.raw)) || a.index - b.index);
  for (let index = 0; index < remainder; index += 1) amounts[remainderOrder[index % remainderOrder.length].index] += 1;
  return exact.map((allocation, index) => ({
    familyMemberId: allocation.familyMemberId,
    familyMemberName: allocation.familyMemberName,
    amountJpy: amounts[index],
  }));
}
const labels: Record<string, Record<string, string>> = {
  accountType: { ORDINARY: "普通預金", TIME: "定期預金", FOREIGN: "外貨預金", OTHER: "その他" },
  securityType: { LISTED_STOCK: "上場株式", BOND: "債券", FUND: "投資信託", ETF: "ETF", OTHER: "その他" },
  businessAssetType: { EQUIPMENT: "機械・設備", VEHICLE: "車両", GOODWILL: "営業権", INVENTORY: "棚卸資産", OTHER: "その他" },
  otherAssetType: otherAssetTypeLabels,
};
/** 保存されている値だけを表示し、未登録の項目や0円を推測で補わない。 */
export function positionDetailFields(p: Position): Array<[string, string]> {
  const d = p.assetDetails ?? {};
  const fields: Array<[string, string]> = [];
  const add = (label: string, value: string | number | null | undefined, suffix = "") => { if (value !== undefined && value !== null && value !== "") fields.push([label, `${typeof value === "number" ? valuationNumber.format(value) : value}${suffix}`]); };
  const typed = (key: keyof typeof d, label: string) => { const value = d[key]; if (typeof value === "string") add(label, labels[key]?.[value] ?? value); };
  add("科目", positionCaption(p));
  add(positionSection(p) === "ASSET" ? "取得者" : positionSection(p) === "LIABILITY" ? "負担者" : "負担予定者", positionAllocationLabel(p));
  add("所在地・金融機関等", institutionOrPropertyAddress(p));
  if (p.category === "DEPOSIT") { typed("accountType", "預金種類"); add("支店", d.branchName); add("口座番号（末尾）", d.accountSuffix); add("満期日", d.maturityDate); }
  if (p.category === "SECURITIES" || p.category === "PRIVATE_SHARES") { typed("securityType", "証券種類"); add("銘柄コード", d.securityCode); add("株数・口数", p.valuationQuantity); add("単価", p.valuationUnitPrice, ` ${p.currency}`); add("株式種類", d.shareClass); add("発行済株式数", d.totalIssuedShares); add("評価方式", d.valuationApproach); }
  if (detailGroup(p) === "property") {
    add("土地・建物", propertyTypeLabels[propertyTypeOf(p) ?? "LAND"]);
    add("地目", d.landCategory ? landCategoryByValue.get(d.landCategory)?.label ?? d.landCategory : "");
    add("建物種類", d.buildingType ? buildingTypeByValue.get(d.buildingType)?.label ?? d.buildingType : "");
    add("構造", d.buildingStructure); add("土地面積", p.landArea, "㎡"); add("床面積", d.floorArea, "㎡");
    add("持分", (p.ownershipNumerator !== null && p.ownershipDenominator !== null) || p.ownershipShare !== null ? ownershipFraction(p) : "");
    add("路線価", p.roadsideValue, " 円/㎡"); add("固定資産税評価額", p.fixedAssetTaxValue, " 円"); add("倍率", p.valuationMultiplier);
    add("小規模宅地等の区分", d.smallLotType ? smallLotTypeOptions.find((option) => option.value === d.smallLotType)?.label ?? d.smallLotType : "");
  }
  if (detailGroup(p) === "insurance") {
    add("保険種類", d.insuranceType); add("証券番号", d.policyNumber); add("被保険者", d.insuredPerson);
    add("退職金制度", d.retirementType);
    const config = deemedConfig(p);
    if (config) { add(config.surrenderLabel, yen.format(p.valueJpy)); if (d[config.benefitKey] !== undefined) add(config.label, yen.format(deemedBenefitJpy(p))); else add(config.label, "未登録"); add("受取人・取り分", deemedAllocations(p).map((a) => `${a.recipient || "未設定"} ${a.numerator}/${a.denominator}`).join("、")); }
  }
  typed("businessAssetType", "資産種類"); add("事業名", d.businessName); add("保管・所在場所", d.storageLocation); typed("otherAssetType", "資産種類");
  if (p.category === "BUSINESS_ASSETS" || p.category === "COLLECTIBLES") add("単価", p.valuationUnitPrice, ` ${p.currency}`);
  if (p.currency !== "JPY") { add("外貨金額", p.originalAmount, ` ${p.currency}`); add("円換算レート", p.fxRate, ` 円/${p.currency}`); }
  add("調整率", p.adjustmentRate); add("メモ", p.note);
  return fields;
}
