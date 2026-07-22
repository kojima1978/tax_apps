"use client";

import {
  AlertTriangle, ChevronLeft, ChevronRight, CircleCheck, Clock3, Copy, DatabaseBackup, GripVertical, History, LayoutDashboard, Link2,
  LoaderCircle, Menu, Minus, PanelLeftClose, PanelLeftOpen, Pencil, Plus, Printer, ShieldCheck, Table2, Trash2, WalletCards, X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardEvent, DragEvent, FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BackupView } from "@/components/backup-view";
import { ClientFields } from "@/components/client-fields";
import { PanelHeader } from "@/components/panel-header";
import { PortalLink } from "@/components/portal-link";
import { API_BASE } from "@/lib/api";
import { ClientSummary } from "@/lib/clients";

type Position = {
  id: number; side: "ASSET" | "LIABILITY"; category: string; name: string; institution: string;
  currency: string; originalAmount: number; fxRate: number; valueJpy: number; liquidity: string;
  includedInNetWorth: boolean; valuationMethod: string; valuationFormula: ValuationFormula;
  valuationQuantity: number | null; valuationUnitPrice: number | null; adjustmentRate: number | null;
  landArea: number | null; roadsideValue: number | null; fixedAssetTaxValue: number | null; valuationMultiplier: number | null; ownershipShare: number | null;
  ownershipNumerator: number | null; ownershipDenominator: number | null;
  assetDetails: AssetDetails | null;
  note: string;
};
type AssetDetails = {
  accountType?: string; branchName?: string; accountSuffix?: string; maturityDate?: string;
  securityType?: string; securityCode?: string; valuationDate?: string;
  insuranceType?: string; insuredPerson?: string; beneficiary?: string; deathBenefit?: number;
  propertyType?: string; propertyAddress?: string; landCategory?: string;
  buildingType?: string; buildingStructure?: string; floorArea?: number;
  shareClass?: string; totalIssuedShares?: number; valuationApproach?: string;
  businessAssetType?: string; businessName?: string; storageLocation?: string;
  borrower?: string; loanDate?: string; dueDate?: string; interestRate?: number; collectibility?: string;
  otherAssetType?: string;
};
type Snapshot = {
  id: number; label: string; asOfDate: string; fiscalYear: number; isCurrent: boolean;
  estimatedInheritanceTax: number; otherTaxes: number; updatedAt: string; positions: Position[];
};
type PositionSection = "ASSET" | "LIABILITY" | "CONTINGENT";
type PositionSortMode = "manual" | "classification-asc" | "classification-desc";
type ValuationFormula = "MANUAL" | "STOCK" | "LAND_ROADSIDE" | "LAND_MULTIPLIER" | "BUILDING";
type Portfolio = {
  household: { id: number; clientCode: string; name: string; nameKana: string; assignedStaff: string; currency: string };
  planning: {
    estimatedInheritanceTax: number; otherTaxes: number; successionCosts: number; inheritanceTaxUpdatedAt: string | null;
    hasSpouse: boolean; heirRank: "none" | "rank1" | "rank2" | "rank3"; heirCount: number;
  };
  snapshots: Snapshot[];
};
/** サイドバーのメニュー。key はそのまま URL の `/customers/<id>/<key>` になる。 */
const SECTIONS = [
  { key: "balance", label: "貸借対照表", icon: LayoutDashboard },
  { key: "positions", label: "資産・負債明細", icon: WalletCards },
  { key: "history", label: "年度比較", icon: History },
  { key: "backup", label: "バックアップ", icon: DatabaseBackup },
] as const;
export type Section = typeof SECTIONS[number]["key"];
type BulkPositionPayload = Record<string, unknown>;
type BulkModalMode = "add" | "edit";
type BalanceScenario = "without-tax" | "with-tax";
type PrintSection = "balance" | "details" | "history";

const categoryLabels: Record<string, string> = {
  DEPOSIT: "預金・現金", SECURITIES: "有価証券", HOME_REAL_ESTATE: "自宅", REAL_ESTATE: "収益不動産", IDLE_REAL_ESTATE: "遊休不動産",
  PRIVATE_SHARES: "自社株", BUSINESS_ASSETS: "事業用資産", LOAN_RECEIVABLE: "貸付金", INSURANCE: "生命保険", COLLECTIBLES: "その他資産",
  LOAN_HOME: "住宅ローン", LOAN_INVESTMENT_PROPERTY: "不動産投資ローン", LOAN_SECURITIES: "証券担保ローン",
  LOAN_BUSINESS: "事業用借入", LOAN_OTHER: "その他借入金", LOAN: "その他借入金", GUARANTEE: "個人保証",
};
const landCategoryOptions = [
  { value: "RICE_FIELD", label: "田", definition: "農地で、用水を利用して湛水して栽培する土地（稲など）" },
  { value: "FIELD", label: "畑", definition: "農地で、用水を利用しないで栽培する土地（野菜、果樹など）" },
  { value: "RESIDENTIAL", label: "宅地", definition: "建物の敷地、およびその維持・効用を果たすための土地（住宅、店舗、工場など）" },
  { value: "SCHOOL", label: "学校用地", definition: "学校、幼稚園などの校舎、グラウンド、その他附属施設の敷地" },
  { value: "RAILWAY", label: "鉄道用地", definition: "鉄道の線路敷、駅舎、操車場などの敷地" },
  { value: "SALT_FIELD", label: "塩田", definition: "海水を引き入れて塩を製造するための土地" },
  { value: "MINERAL_SPRING", label: "鉱泉地", definition: "温泉（鉱泉を含む）の湧出口、およびその維持に必要な土地" },
  { value: "POND_MARSH", label: "池沼", definition: "灌漑用でない、水のたまっている土地（池、沼など）" },
  { value: "FOREST", label: "山林", definition: "耕作によらないで竹木が生育している土地" },
  { value: "PASTURE", label: "牧場", definition: "家畜を放牧し、または飼料用草などを栽培する土地" },
  { value: "WILDERNESS", label: "原野", definition: "耕作によらないで雑草、かん木（低い木）が生育している土地" },
  { value: "CEMETERY", label: "墓地", definition: "人の遺体や遺骨を埋葬するための土地" },
  { value: "RELIGIOUS", label: "境内地", definition: "神社、寺院、教会など（宗教法人）の境内にある土地、参道など" },
  { value: "CANAL", label: "運河用地", definition: "運河の用に供される土地" },
  { value: "WATERWORKS", label: "水道用地", definition: "給水のための水源地、貯水池、浄水場、送水管路などの敷地" },
  { value: "IRRIGATION_DRAINAGE", label: "用悪水路", definition: "灌漑用の用水路や、排水用の悪水路" },
  { value: "RESERVOIR", label: "ため池", definition: "灌漑用の水を貯留するための人工的な池" },
  { value: "EMBANKMENT", label: "堤", definition: "防水などのために水をせき止める土手や堤防" },
  { value: "DITCH", label: "井溝", definition: "田畝の間にある通水路や、自然の小川（溝など）" },
  { value: "PROTECTED_FOREST", label: "保安林", definition: "水源かん養、土砂崩壊防備などのため、法律に基づき指定された森林" },
  { value: "PUBLIC_ROAD", label: "公衆用道路", definition: "一般公衆の通行の用に供される道路（私道でも不特定多数が通る場合を含む）" },
  { value: "PARK", label: "公園", definition: "公衆の憩いの場、または遊楽のために設けられた土地" },
  { value: "MISCELLANEOUS", label: "雑種地", definition: "他の22種類のいずれにも該当しない土地（駐車場、資材置場、ゴルフ場など）" },
] as const;
const landCategoryByValue = new Map(landCategoryOptions.map((option) => [option.value, option]));
const buildingTypeOptions = [
  { value: "RESIDENCE", label: "居宅", definition: "一般的な戸建て住宅や、分譲マンションの専有部分（一室）" },
  { value: "APARTMENT", label: "共同住宅", definition: "賃貸マンションやアパートなど、建物全体を一括で登記する場合" },
  { value: "DORMITORY", label: "寄宿舎", definition: "学生寮や社員寮など" },
  { value: "ROW_HOUSE", label: "長屋", definition: "テラスハウスやタウンハウスなど、壁を共有して並んでいる住宅" },
  { value: "STORE", label: "店舗", definition: "小売店、ショールームなど" },
  { value: "OFFICE", label: "事務所", definition: "オフィス、書斎など" },
  { value: "RESTAURANT", label: "飲食店", definition: "レストラン、居酒屋、カフェなど" },
  { value: "RYOKAN", label: "旅館", definition: "和式の宿泊施設" },
  { value: "HOTEL", label: "ホテル", definition: "洋式の宿泊施設" },
  { value: "FACTORY", label: "工場", definition: "製造業の作業場やプラントなど" },
  { value: "WAREHOUSE", label: "倉庫", definition: "物品を保管する建物" },
  { value: "WORKSHOP", label: "作業場", definition: "簡易的な加工や組み立てを行う場所" },
  { value: "STORAGE", label: "物置", definition: "家庭用や業務用の小規模な保管庫（附属建物として登記される場合を含む）" },
  { value: "HOSPITAL", label: "病院", definition: "入院設備を備えた医療施設" },
  { value: "CLINIC", label: "診療所", definition: "外来診療を中心とする医療施設" },
  { value: "NURSING_HOME", label: "老人ホーム", definition: "高齢者福祉施設" },
  { value: "NURSERY", label: "保育所", definition: "託児・保育施設" },
  { value: "SCHOOL", label: "学校", definition: "小学校、中学校、高等学校などの教育施設" },
  { value: "KINDERGARTEN", label: "幼稚園", definition: "幼児を対象とする教育施設" },
  { value: "GARAGE", label: "車庫", definition: "ガレージ、立体駐車場など" },
  { value: "BICYCLE_PARKING", label: "駐輪場", definition: "自転車置き場" },
  { value: "POWER_PLANT", label: "発電所", definition: "電力を発生させるエネルギーインフラ施設" },
  { value: "SUBSTATION", label: "変電所", definition: "電圧を変換し送配電するエネルギーインフラ施設" },
] as const;
const buildingTypeByValue = new Map(buildingTypeOptions.map((option) => [option.value, option]));
const assetCategories = ["DEPOSIT", "SECURITIES", "HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE", "PRIVATE_SHARES", "BUSINESS_ASSETS", "LOAN_RECEIVABLE", "INSURANCE", "COLLECTIBLES"];
const liabilityCategories = ["LOAN_HOME", "LOAN_INVESTMENT_PROPERTY", "LOAN_SECURITIES", "LOAN_BUSINESS", "LOAN_OTHER"];
const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 1 });
const valuationNumber = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 6 });
const compactYen = (value: number) => {
  const manYen = Math.round(value / 10000);
  const sign = manYen < 0 ? "-" : "";
  const absoluteManYen = Math.abs(manYen);
  const okuYen = Math.floor(absoluteManYen / 10000);
  const remainderManYen = absoluteManYen % 10000;
  if (okuYen === 0) return `${sign}${remainderManYen.toLocaleString("ja-JP")}万円`;
  if (remainderManYen === 0) return `${sign}${okuYen.toLocaleString("ja-JP")}億円`;
  return `${sign}${okuYen.toLocaleString("ja-JP")}億${remainderManYen.toLocaleString("ja-JP")}万円`;
};
const normalizeNumericCharacters = (value: string) => value
  .replace(/[０-９]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0xfee0))
  .replace(/，/g, ",")
  .replace(/．/g, ".");
const formatCommaNumberInput = (value: string, maxFractionDigits: number) => {
  const normalized = normalizeNumericCharacters(value).replace(/,/g, "").replace(/[^\d.]/g, "");
  const decimalIndex = normalized.indexOf(".");
  const hasDecimalPoint = maxFractionDigits > 0 && decimalIndex >= 0;
  const integerSource = decimalIndex >= 0 ? normalized.slice(0, decimalIndex) : normalized;
  const integerPart = integerSource.replace(/^0+(?=\d)/, "") || (hasDecimalPoint ? "0" : "");
  const fractionPart = hasDecimalPoint ? normalized.slice(decimalIndex + 1).replace(/\./g, "").slice(0, maxFractionDigits) : "";
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return hasDecimalPoint ? `${groupedInteger}.${fractionPart}` : groupedInteger;
};
const unformatNumberInput = (value: FormDataEntryValue | undefined) => typeof value === "string" ? value.replace(/,/g, "") : value;
const greatestCommonDivisor = (first: number, second: number) => {
  let a = Math.abs(first);
  let b = Math.abs(second);
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
};
const decimalToFraction = (value: number | null): [number, number] => {
  if (value === null || !Number.isFinite(value) || value <= 0) return [1, 1];
  const denominator = 1_000_000;
  const numerator = Math.round(value * denominator);
  const divisor = greatestCommonDivisor(numerator, denominator);
  return [numerator / divisor, denominator / divisor];
};
const areaHeight = (value: number, total: number) => `${Math.abs(value) / Math.max(total, 1) * 100}%`;
const accountDensity = (value: number, total: number) => {
  const ratio = Math.abs(value) / Math.max(total, 1);
  if (ratio < 0.02) return "micro-account";
  if (ratio < 0.04) return "compact-account";
  return ratio < 0.22 ? "dense-account" : "";
};
const dateJa = (date: string) => new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${date}T00:00:00`));
const fiscalYearLabel = (snapshot: Pick<Snapshot, "fiscalYear">) => `${snapshot.fiscalYear}年度`;

function BsAmount({ value, total }: { value: number; total: number }) {
  return <><span className="bs-money">{compactYen(value)}</span><em className="bs-percent">{percent.format(value / Math.max(total, 1) * 100)}%</em></>;
}

function CommaNumberInput({ name, defaultValue, maxFractionDigits, placeholder, positive = false, required = true, value, onValueChange, readOnly = false, hint = "", ariaLabel }: { name: string; defaultValue: number | ""; maxFractionDigits: number; placeholder: string; positive?: boolean; required?: boolean; value?: string; onValueChange?: (value: string) => void; readOnly?: boolean; hint?: string; ariaLabel?: string }) {
  const [displayValue, setDisplayValue] = useState(() => formatCommaNumberInput(String(defaultValue), maxFractionDigits));
  const shownValue = value === undefined ? displayValue : formatCommaNumberInput(value, maxFractionDigits);
  return <><input
    name={name}
    type="text"
    inputMode="decimal"
    autoComplete="off"
    required={required}
    placeholder={placeholder}
    value={shownValue}
    readOnly={readOnly}
    aria-label={ariaLabel}
    aria-describedby={hint ? `${name}-input-hint` : undefined}
    onChange={(event) => {
      const nextValue = formatCommaNumberInput(event.target.value, maxFractionDigits);
      event.target.setCustomValidity(positive && nextValue !== "" && Number(nextValue.replace(/,/g, "")) <= 0 ? "0より大きい数値を入力してください。" : "");
      setDisplayValue(nextValue);
      onValueChange?.(nextValue.replace(/,/g, ""));
    }}
    onBlur={(event) => {
      if (positive && event.currentTarget.value !== "" && Number(event.currentTarget.value.replace(/,/g, "")) <= 0) event.currentTarget.setCustomValidity("0より大きい数値を入力してください。");
    }}
  />{hint ? <small id={`${name}-input-hint`} className="number-input-hint">{hint}</small> : null}</>;
}

function OwnershipFractionInput({ numerator, denominator, onNumeratorChange, onDenominatorChange }: { numerator: string; denominator: string; onNumeratorChange: (value: string) => void; onDenominatorChange: (value: string) => void }) {
  return <div className="ownership-fraction-field" role="group" aria-label="持分">
    <span className="ownership-fraction-title">持分</span>
    <div className="ownership-fraction-inputs">
      <label><span className="sr-only">持分の分子</span><CommaNumberInput name="ownershipNumerator" defaultValue="" value={numerator} onValueChange={onNumeratorChange} maxFractionDigits={0} placeholder="1" positive ariaLabel="持分の分子" /></label>
      <strong aria-hidden="true">／</strong>
      <label><span className="sr-only">持分の分母</span><CommaNumberInput name="ownershipDenominator" defaultValue="" value={denominator} onValueChange={onDenominatorChange} maxFractionDigits={0} placeholder="2" positive ariaLabel="持分の分母" /></label>
    </div>
  </div>;
}

function LandCategoryField({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const selected = landCategoryByValue.get(value as typeof landCategoryOptions[number]["value"]);
  const legacyValue = value && !selected ? value : "";
  return <label className="land-category-field">地目
    <select name="assetDetail.landCategory" value={value} title={selected?.definition ?? ""} onChange={(event) => setValue(event.target.value)}>
      <option value="">未選択</option>
      {legacyValue ? <option value={legacyValue}>{legacyValue === "OTHER" ? "その他（既存データ）" : legacyValue}</option> : null}
      {landCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {selected ? <small className="land-category-definition" aria-live="polite">{selected.definition}</small> : null}
  </label>;
}

function BuildingTypeField({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const selected = buildingTypeByValue.get(value as typeof buildingTypeOptions[number]["value"]);
  const legacyValue = value && !selected ? value : "";
  return <label className="building-type-field">建物種類
    <select name="assetDetail.buildingType" value={value} title={selected?.definition ?? ""} onChange={(event) => setValue(event.target.value)}>
      <option value="">未選択</option>
      {legacyValue ? <option value={legacyValue}>{legacyValue}</option> : null}
      {buildingTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {selected ? <small className="building-type-definition" aria-live="polite">{selected.definition}</small> : null}
  </label>;
}

function positionSection(position: Position): PositionSection {
  if (position.side === "ASSET") return "ASSET";
  return position.includedInNetWorth ? "LIABILITY" : "CONTINGENT";
}

const positionSectionLabels: Record<PositionSection, string> = {
  ASSET: "資産の部",
  LIABILITY: "負債の部",
  CONTINGENT: "偶発債務の部（B/S外）",
};

function middleClassification(position: Position) {
  if (["DEPOSIT", "SECURITIES", "INSURANCE"].includes(position.category)) return "金融資産";
  if (["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"].includes(position.category)) return "不動産";
  if (["PRIVATE_SHARES", "BUSINESS_ASSETS", "LOAN_RECEIVABLE"].includes(position.category)) return "事業用資産";
  if (position.category === "COLLECTIBLES") return "その他資産";
  if (position.category === "GUARANTEE") return "個人保証";
  return "借入金";
}

function institutionOrPropertyAddress(position: Position) {
  const isRealEstate = ["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"].includes(position.category);
  return isRealEstate ? position.assetDetails?.propertyAddress?.trim() ?? "" : position.institution.trim();
}

function valuationBreakdown(position: Position) {
  const number = (value: number | null) => valuationNumber.format(value ?? 0);
  const [fallbackNumerator, fallbackDenominator] = decimalToFraction(position.ownershipShare);
  const ownership = `${valuationNumber.format(position.ownershipNumerator ?? fallbackNumerator)}/${valuationNumber.format(position.ownershipDenominator ?? fallbackDenominator)}`;
  if (position.valuationFormula === "STOCK") return `${number(position.valuationQuantity)}株・口 × ${number(position.valuationUnitPrice)} × ${number(position.adjustmentRate)}`;
  if (position.valuationFormula === "LAND_ROADSIDE") return `${number(position.landArea)}㎡ × ${number(position.roadsideValue)}円/㎡ × ${number(position.adjustmentRate)} × 持分${ownership}`;
  if (position.valuationFormula === "LAND_MULTIPLIER" || position.valuationFormula === "BUILDING") return `${number(position.fixedAssetTaxValue)}円 × ${number(position.valuationMultiplier)} × ${number(position.adjustmentRate)} × 持分${ownership}`;
  return "";
}

const middleClassificationOrder = ["金融資産", "不動産", "事業用資産", "その他資産", "借入金", "個人保証"];
const middleClassificationRank = new Map(middleClassificationOrder.map((classification, index) => [classification, index]));

function totals(positions: Position[]) {
  let assets = 0, liabilities = 0, guarantees = 0;
  for (const p of positions) {
    if (p.side === "ASSET") {
      assets += p.valueJpy;
    } else if (p.includedInNetWorth) liabilities += p.valueJpy;
    else guarantees += p.valueJpy;
  }
  return { assets, liabilities, guarantees, netWorth: assets - liabilities };
}

type TrendValues = ReturnType<typeof trendValues>;

function trendValues(snapshot: Snapshot) {
  let deposits = 0, securities = 0, insurance = 0;
  let homeRealEstate = 0, incomeRealEstate = 0, idleRealEstate = 0;
  let privateShares = 0, businessAssets = 0, loanReceivables = 0, otherAssets = 0;
  let loanHome = 0, loanInvestmentProperty = 0, loanSecurities = 0, loanBusiness = 0, loanOther = 0, guarantees = 0;
  for (const position of snapshot.positions) {
    if (position.side === "ASSET") {
      if (position.category === "DEPOSIT") deposits += position.valueJpy;
      else if (position.category === "SECURITIES") securities += position.valueJpy;
      else if (position.category === "INSURANCE") insurance += position.valueJpy;
      else if (position.category === "HOME_REAL_ESTATE") homeRealEstate += position.valueJpy;
      else if (position.category === "REAL_ESTATE") incomeRealEstate += position.valueJpy;
      else if (position.category === "IDLE_REAL_ESTATE") idleRealEstate += position.valueJpy;
      else if (position.category === "PRIVATE_SHARES") privateShares += position.valueJpy;
      else if (position.category === "BUSINESS_ASSETS") businessAssets += position.valueJpy;
      else if (position.category === "LOAN_RECEIVABLE") loanReceivables += position.valueJpy;
      else otherAssets += position.valueJpy;
    } else if (position.includedInNetWorth) {
      if (position.category === "LOAN_HOME") loanHome += position.valueJpy;
      else if (position.category === "LOAN_INVESTMENT_PROPERTY") loanInvestmentProperty += position.valueJpy;
      else if (position.category === "LOAN_SECURITIES") loanSecurities += position.valueJpy;
      else if (position.category === "LOAN_BUSINESS") loanBusiness += position.valueJpy;
      else loanOther += position.valueJpy;
    } else {
      guarantees += position.valueJpy;
    }
  }
  const financial = deposits + securities + insurance;
  const realEstate = homeRealEstate + incomeRealEstate + idleRealEstate;
  const business = privateShares + businessAssets + loanReceivables;
  const borrowings = loanHome + loanInvestmentProperty + loanSecurities + loanBusiness + loanOther;
  const inheritanceTax = snapshot.estimatedInheritanceTax;
  const otherTaxes = snapshot.otherTaxes;
  const taxes = inheritanceTax + otherTaxes;
  const liabilities = borrowings + taxes;
  const assets = financial + realEstate + business + otherAssets;
  return {
    deposits, securities, insurance, financial,
    homeRealEstate, incomeRealEstate, idleRealEstate, realEstate,
    privateShares, businessAssets, loanReceivables, business, otherAssets, assets,
    inheritanceTax, otherTaxes, taxes,
    loanHome, loanInvestmentProperty, loanSecurities, loanBusiness, loanOther, borrowings, liabilities,
    netWorth: assets - liabilities, guarantees,
  };
}

type TrendGroup = "financial" | "realEstate" | "business" | "taxes" | "borrowings";
type TrendRow = { label: string; key: keyof TrendValues; tone?: "section" | "total" | "net" | "outside"; group?: TrendGroup; child?: boolean };

const trendRows: TrendRow[] = [
  { label: "資産の部", key: "assets", tone: "section" },
  { label: "金融資産", key: "financial", group: "financial" },
  { label: "不動産", key: "realEstate", group: "realEstate" },
  { label: "事業用資産", key: "business", group: "business" },
  { label: "その他資産", key: "otherAssets" },
  { label: "資産合計", key: "assets", tone: "total" },
  { label: "負債の部", key: "liabilities", tone: "section" },
  { label: "税金", key: "taxes", group: "taxes" },
  { label: "借入金", key: "borrowings", group: "borrowings" },
  { label: "負債合計", key: "liabilities", tone: "total" },
  { label: "純資産", key: "netWorth", tone: "net" },
  { label: "個人保証（B/S外）", key: "guarantees", tone: "outside" },
];

const trendChildRows: Record<TrendGroup, TrendRow[]> = {
  financial: [
    { label: "預金・現金", key: "deposits", child: true },
    { label: "有価証券", key: "securities", child: true },
    { label: "生命保険", key: "insurance", child: true },
  ],
  realEstate: [
    { label: "自宅", key: "homeRealEstate", child: true },
    { label: "収益不動産", key: "incomeRealEstate", child: true },
    { label: "遊休不動産", key: "idleRealEstate", child: true },
  ],
  business: [
    { label: "自社株", key: "privateShares", child: true },
    { label: "事業用資産", key: "businessAssets", child: true },
    { label: "貸付金", key: "loanReceivables", child: true },
  ],
  taxes: [
    { label: "相続税", key: "inheritanceTax", child: true },
    { label: "その他税金", key: "otherTaxes", child: true },
  ],
  borrowings: [
    { label: "住宅ローン", key: "loanHome", child: true },
    { label: "不動産投資ローン", key: "loanInvestmentProperty", child: true },
    { label: "証券担保ローン", key: "loanSecurities", child: true },
    { label: "事業用借入", key: "loanBusiness", child: true },
    { label: "その他借入金", key: "loanOther", child: true },
  ],
};

export function Dashboard({ householdId, section }: { householdId: number; section: Section }) {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [balanceScenario, setBalanceScenario] = useState<BalanceScenario>("without-tax");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalMode, setBulkModalMode] = useState<BulkModalMode | null>(null);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [deletingPosition, setDeletingPosition] = useState<Position | null>(null);
  const [deletingSnapshot, setDeletingSnapshot] = useState<Snapshot | null>(null);
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const searchParams = useSearchParams();
  // 明細で開いている年度は URL のクエリで持ち、画面を移動しても選択が残るようにする。
  const workingSnapshotId = Number(searchParams.get("snapshot")) || null;
  const [yearCreationSourceId, setYearCreationSourceId] = useState<number | null>(null);
  const [snapshotTaxModalOpen, setSnapshotTaxModalOpen] = useState(false);
  const [printGuideOpen, setPrintGuideOpen] = useState(false);
  const [printSections, setPrintSections] = useState<Set<PrintSection> | null>(null);
  const [clientEditOpen, setClientEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`${API_BASE}/portfolio?householdId=${householdId}`, { cache: "no-store" });
      // URL の顧客が存在しない場合は一覧へ戻して選び直してもらう。
      if (response.status === 404) { router.replace("/"); return; }
      if (!response.ok) throw new Error();
      setPortfolio(await response.json() as Portfolio);
    } catch {
      setError("データを読み込めませんでした。接続を確認してください。");
    }
  }, [householdId, router]);

  // 顧客が変わったときだけ、安定したローダー経由で読み直す。
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const current = portfolio?.snapshots.find((snapshot) => snapshot.isCurrent);
  const workingSnapshot = portfolio?.snapshots.find((snapshot) => snapshot.id === workingSnapshotId) ?? current;
  const summary = useMemo(() => totals(current?.positions ?? []), [current]);
  const successionAssets = useMemo(() => {
    let deposits = 0, securities = 0, insurance = 0, insuranceDeathBenefit = 0, insuranceDeathBenefitMissingCount = 0, privateShares = 0, businessAssets = 0, loanReceivables = 0;
    let homeRealEstate = 0, incomeRealEstate = 0, idleRealEstate = 0, otherAssets = 0;
    for (const position of current?.positions ?? []) {
      if (position.side !== "ASSET") continue;
      if (position.category === "DEPOSIT") deposits += position.valueJpy;
      else if (position.category === "SECURITIES") securities += position.valueJpy;
      else if (position.category === "INSURANCE") {
        insurance += position.valueJpy;
        const deathBenefit = position.assetDetails?.deathBenefit;
        if (deathBenefit === undefined || deathBenefit === null || deathBenefit <= 0) insuranceDeathBenefitMissingCount += 1;
        else insuranceDeathBenefit += Math.round(deathBenefit * position.fxRate);
      }
      else if (position.category === "PRIVATE_SHARES") privateShares += position.valueJpy;
      else if (position.category === "BUSINESS_ASSETS") businessAssets += position.valueJpy;
      else if (position.category === "LOAN_RECEIVABLE") loanReceivables += position.valueJpy;
      else if (position.category === "HOME_REAL_ESTATE") homeRealEstate += position.valueJpy;
      else if (position.category === "REAL_ESTATE") incomeRealEstate += position.valueJpy;
      else if (position.category === "IDLE_REAL_ESTATE") idleRealEstate += position.valueJpy;
      else otherAssets += position.valueJpy;
    }
    return {
      financial: deposits + securities + insurance,
      deposits, securities, insurance, insuranceDeathBenefit, insuranceDeathBenefitMissingCount,
      business: privateShares + businessAssets + loanReceivables,
      privateShares, businessAssets, loanReceivables,
      realEstate: homeRealEstate + incomeRealEstate + idleRealEstate,
      homeRealEstate, incomeRealEstate, idleRealEstate, otherAssets,
    };
  }, [current]);
  const loanBreakdown = useMemo(() => {
    let home = 0, investmentProperty = 0, securities = 0, business = 0, other = 0;
    for (const position of current?.positions ?? []) {
      if (position.side !== "LIABILITY" || !position.includedInNetWorth) continue;
      if (position.category === "LOAN_HOME") home += position.valueJpy;
      else if (position.category === "LOAN_INVESTMENT_PROPERTY") investmentProperty += position.valueJpy;
      else if (position.category === "LOAN_SECURITIES") securities += position.valueJpy;
      else if (position.category === "LOAN_BUSINESS") business += position.valueJpy;
      else other += position.valueJpy;
    }
    return { home, investmentProperty, securities, business, other };
  }, [current]);
  const estimatedInheritanceTax = portfolio?.planning.estimatedInheritanceTax ?? 0;
  const otherTaxes = portfolio?.planning.otherTaxes ?? 0;
  const successionCosts = portfolio?.planning.successionCosts ?? 0;
  const totalTaxes = estimatedInheritanceTax + otherTaxes;
  function balanceView(scenario: BalanceScenario) {
    const taxIncluded = scenario === "with-tax";
    const displayedInsurance = taxIncluded ? successionAssets.insuranceDeathBenefit : successionAssets.insurance;
    const displayedAssets = {
      ...successionAssets,
      insurance: displayedInsurance,
      financial: successionAssets.deposits + successionAssets.securities + displayedInsurance,
    };
    const displayedAssetTotal = summary.assets - successionAssets.insurance + displayedInsurance;
    const displayedTaxes = taxIncluded ? totalTaxes : 0;
    const displayedSuccessionCosts = taxIncluded ? successionCosts : 0;
    const forecastAdjustments = displayedTaxes + displayedSuccessionCosts;
    const displayedNetWorth = displayedAssetTotal - summary.liabilities - forecastAdjustments;
    const fundingAreaTotal = summary.liabilities + forecastAdjustments + Math.abs(displayedNetWorth);
    const smallAreaItems = [
      { side: "資産", label: "金融資産", value: displayedAssets.financial, areaTotal: displayedAssetTotal },
      { side: "資産", label: "不動産", value: displayedAssets.realEstate, areaTotal: displayedAssetTotal },
      { side: "資産", label: "事業用資産", value: displayedAssets.business, areaTotal: displayedAssetTotal },
      { side: "資産", label: "その他資産", value: displayedAssets.otherAssets, areaTotal: displayedAssetTotal },
      { side: "負債・純資産", label: "税金", value: displayedTaxes, areaTotal: fundingAreaTotal },
      { side: "負債・純資産", label: "借入金", value: summary.liabilities, areaTotal: fundingAreaTotal },
      { side: "負債・純資産", label: "承継関連費用", value: displayedSuccessionCosts, areaTotal: fundingAreaTotal },
      { side: "負債・純資産", label: "純資産", value: displayedNetWorth, areaTotal: fundingAreaTotal },
    ].filter((item) => item.value !== 0 && Math.abs(item.value) / Math.max(item.areaTotal, 1) < 0.04);
    return { taxIncluded, displayedAssets, displayedAssetTotal, displayedTaxes, displayedSuccessionCosts, forecastAdjustments, displayedNetWorth, fundingAreaTotal, smallAreaItems };
  }

  function openNewPosition() {
    setEditingPosition(null);
    setModalOpen(true);
  }

  function openEditPosition(position: Position) {
    setEditingPosition(position);
    setModalOpen(true);
  }

  function closePositionModal() {
    setModalOpen(false);
    setEditingPosition(null);
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/clients`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(new FormData(event.currentTarget).entries()), id: householdId }),
      });
      const result = await response.json().catch(() => null) as (ClientSummary & { error?: string }) | null;
      if (!response.ok || !result) throw new Error(result?.error ?? "顧客情報を保存できませんでした。");
      setClientEditOpen(false);
      await load();
    } catch (clientError) {
      setError(clientError instanceof Error ? clientError.message : "顧客情報を保存できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  async function savePosition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const fields = Object.fromEntries(form.entries()) as Record<string, unknown>;
    for (const fieldName of ["originalAmount", "fxRate", "valuationQuantity", "valuationUnitPrice", "adjustmentRate", "landArea", "roadsideValue", "fixedAssetTaxValue", "valuationMultiplier", "ownershipNumerator", "ownershipDenominator"]) {
      if (fieldName in fields) fields[fieldName] = unformatNumberInput(fields[fieldName] as FormDataEntryValue | undefined) ?? "";
    }
    const numericDetailFields = new Set(["deathBenefit", "totalIssuedShares", "interestRate", "floorArea"]);
    const assetDetails: Record<string, string | number> = {};
    for (const [fieldName, rawValue] of Object.entries(fields)) {
      if (!fieldName.startsWith("assetDetail.")) continue;
      const detailName = fieldName.slice("assetDetail.".length);
      const value = String(rawValue).trim();
      if (value !== "") {
        assetDetails[detailName] = numericDetailFields.has(detailName)
          ? Number(value.replace(/,/g, ""))
          : value;
      }
      delete fields[fieldName];
    }
    fields.assetDetails = assetDetails;
    const body = {
      ...fields,
      snapshotId: workingSnapshot?.id,
    };
    try {
      const response = await fetch(
        editingPosition ? `${API_BASE}/positions/${editingPosition.id}` : `${API_BASE}/positions`,
        { method: editingPosition ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      );
      if (!response.ok) throw new Error();
      closePositionModal();
      await load();
    } catch { setError(editingPosition ? "修正できませんでした。入力内容を確認してください。" : "登録できませんでした。入力内容を確認してください。"); }
    finally { setSaving(false); }
  }

  async function saveBulkPositions(positions: BulkPositionPayload[], mode: BulkModalMode) {
    if (!workingSnapshot) return false;
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/positions/bulk`, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId: workingSnapshot.id, positions }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? (mode === "edit" ? "一括修正できませんでした。入力内容を確認してください。" : "一括登録できませんでした。入力内容を確認してください。"));
      setBulkModalMode(null);
      await load();
      return true;
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : mode === "edit" ? "一括修正できませんでした。" : "一括登録できませんでした。");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deletePosition() {
    if (!deletingPosition) return;
    setSaving(true); setError("");
    const response = await fetch(`${API_BASE}/positions/${deletingPosition.id}`, { method: "DELETE" });
    if (response.ok) {
      setDeletingPosition(null);
      await load();
    } else {
      setError("削除できませんでした。");
    }
    setSaving(false);
  }

  async function reorderPositions(snapshotId: number, section: PositionSection, orderedIds: number[]) {
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/positions/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId, section, orderedIds }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "並び順を保存できませんでした。");
      await load();
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "並び順を保存できませんでした。");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deleteSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deletingSnapshot) return;
    setSaving(true); setError("");
    try {
      const confirmationFiscalYear = new FormData(event.currentTarget).get("confirmationFiscalYear");
      const response = await fetch(`${API_BASE}/snapshots/${deletingSnapshot.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationFiscalYear }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "年度データを削除できませんでした。");
      setDeletingSnapshot(null);
      // 削除した年度を URL に残さない。
      if (section === "positions" && workingSnapshotId === deletingSnapshot.id) router.replace(sectionHref("positions"));
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "年度データを削除できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  async function saveSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch(`${API_BASE}/snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => null) as { error?: string; existingSnapshotId?: number } | null;
      if (response.status === 409 && result?.existingSnapshotId) {
        setYearCreationSourceId(null);
        editSnapshot(result.existingSnapshotId);
        setError(`${result.error} 既存年度を表示しました。`);
        return;
      }
      if (!response.ok) throw new Error(result?.error ?? "年度を作成できませんでした。");
      setYearCreationSourceId(null);
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "年度を作成できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  async function saveSnapshotTaxes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workingSnapshot) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/snapshots/${workingSnapshot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
      });
      if (!response.ok) throw new Error();
      setSnapshotTaxModalOpen(false);
      await load();
    } catch { setError("税金を修正できませんでした。"); }
    finally { setSaving(false); }
  }

  const sectionHref = (target: Section, snapshotId?: number | null) =>
    `/customers/${householdId}/${target}${target === "positions" && snapshotId ? `?snapshot=${snapshotId}` : ""}`;

  function editSnapshot(snapshotId: number) {
    router.push(sectionHref("positions", snapshotId));
  }

  async function saveForecast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!portfolio) return;
    setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const action = form.get("action");
    try {
      const response = await fetch(`${API_BASE}/inheritance-estimate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(form.entries()), householdId: portfolio.household.id }),
      });
      if (!response.ok) throw new Error();
      setForecastModalOpen(false);
      if (action === "calculate") window.location.assign(`/inheritance-tax-app/?source=pb&autocalc=1&householdId=${portfolio.household.id}`);
      else await load();
    } catch { setError("予測条件を保存できませんでした。"); }
    finally { setSaving(false); }
  }

  if (!portfolio || !current) {
    return <main className="initial-loader"><PortalLink /><LoaderCircle className="spin" /><p>{error || "貸借対照表を読み込んでいます"}</p>{error ? <button className="button secondary" onClick={() => void load()}>再読み込み</button> : null}</main>;
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">本文へ移動</a>
      <aside className={`sidebar ${menuOpen ? "open" : ""} ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="brand"><PortalLink /><span>Personal Asset Balance Sheet</span></div>
        <button className="sidebar-toggle" aria-label={sidebarCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"} aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}>{sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</button>
        <button className="close-menu" aria-label="メニューを閉じる" onClick={() => setMenuOpen(false)}><X /></button>
        <nav aria-label="メインメニュー">
          {SECTIONS.map(({ key, label, icon: Icon }) => <Link
            key={key}
            className={`nav-button ${section === key ? "active" : ""}`}
            href={sectionHref(key)}
            aria-current={section === key ? "page" : undefined}
            aria-label={label}
            title={label}
            onClick={() => setMenuOpen(false)}
          ><Icon /><span>{label}</span></Link>)}
        </nav>
        <div className="side-section"><p>外部連携</p><a className="side-link" href={`/inheritance-tax-app/?source=pb&householdId=${portfolio.household.id}`} aria-label="相続税シミュレーター" title="相続税シミュレーター"><Link2 /><span>相続税シミュレーター</span><ChevronRight /></a></div>
        <div className="security-note"><ShieldCheck /><div><strong>ローカル環境</strong><span>データは社内DBで管理</span></div></div>
      </aside>

      <div className={`main-area ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <header className="topbar">
          <button className="menu-button" aria-label="メニューを開く" onClick={() => setMenuOpen(true)}><Menu /></button>
          <div className="topbar-subject">
            <Link className="back-to-list" href="/"><ChevronLeft />一覧に戻る</Link>
            <button type="button" className="client-switcher-trigger" onClick={() => { setError(""); setClientEditOpen(true); }} aria-label={`顧客情報を編集。現在は${portfolio.household.name}`} aria-haspopup="dialog"><span><strong>{portfolio.household.name}</strong><em>{portfolio.household.clientCode}{portfolio.household.assignedStaff ? `・担当 ${portfolio.household.assignedStaff}` : ""}</em></span><Pencil /></button>
          </div>
          <div className="top-actions"><span className="as-of" aria-label={`現在のB/S基準日 ${dateJa(current.asOfDate)}`}><Clock3 /><small>現在B/S基準日</small><strong>{dateJa(current.asOfDate)}</strong></span><button className="button secondary" onClick={() => setPrintGuideOpen(true)}><Printer />印刷・PDF出力</button></div>
        </header>

        <main id="main-content" className="content">
          {error ? <div className="error-banner" role="alert"><AlertTriangle />{error}<button onClick={() => setError("")} aria-label="閉じる"><X /></button></div> : null}
          {(section === "balance" || printSections?.has("balance")) ? (
            <div className={`report-document ${section !== "balance" ? "print-only-document" : ""} ${printSections && !printSections.has("balance") ? "print-excluded-document" : ""}`}>
              <section className="page-heading"><div><p className="eyebrow">OWNER PERSONAL BALANCE SHEET</p><p>個人資産・負債を時価で俯瞰します。</p></div></section>
              <section className={`dashboard-grid balance-report-series screen-${balanceScenario}`}>
                {(printSections?.has("balance") ? (["without-tax", "with-tax"] as const) : [balanceScenario]).map((reportScenario) => {
                  const { taxIncluded, displayedAssets, displayedAssetTotal, displayedTaxes, displayedSuccessionCosts, forecastAdjustments, displayedNetWorth, fundingAreaTotal, smallAreaItems } = balanceView(reportScenario);
                  const headingSuffix = reportScenario === "with-tax" ? "with-tax" : "without-tax";
                  return <article key={reportScenario} className={`panel balance-panel print-section-balance balance-report-${headingSuffix}`}>
                  {reportScenario === "with-tax" ? <p className="balance-print-owner">{portfolio.household.name}</p> : null}
                  <PanelHeader
                    title="貸借対照表"
                    subtitle={taxIncluded ? "相続時予測（死亡保険金・税金を反映）" : "現在価値（保険は解約返戻金）"}
                    action={reportScenario === balanceScenario ? <div className="balance-panel-actions"><div className="balance-scenario-switch" role="group" aria-label="貸借対照表の表示パターン"><button type="button" aria-pressed={!taxIncluded} onClick={() => setBalanceScenario("without-tax")}><span>税金なし</span><small>メイン</small></button><button type="button" aria-pressed={taxIncluded} onClick={() => setBalanceScenario("with-tax")}><span>税金あり</span><small>サブ</small></button></div><button className="text-button compact" onClick={() => setForecastModalOpen(true)}>予測条件</button></div> : undefined}
                  />
                  {taxIncluded && successionAssets.insuranceDeathBenefitMissingCount > 0 ? <p className="insurance-data-note" role="note"><AlertTriangle />死亡保険金が未入力の保険 {successionAssets.insuranceDeathBenefitMissingCount}件は、税金ありB/Sでは0円として計算しています。</p> : null}
                  <div className="classified-bs" role="group" aria-label={`貸借対照表・${taxIncluded ? "税金あり" : "税金なし"}`}>
                    <section className="classified-bs-side asset-side" aria-labelledby={`assets-heading-${headingSuffix}`}>
                      <h4 id={`assets-heading-${headingSuffix}`}><span>資産の部</span></h4>
                      <div className="bs-account-area">
                      {displayedAssets.financial !== 0 ? <div className={`bs-account financial-account grouped-account ${accountDensity(displayedAssets.financial, displayedAssetTotal)}`} style={{ height: areaHeight(displayedAssets.financial, displayedAssetTotal) }}>
                        <div className="bs-account-heading"><span>金融資産</span><strong><BsAmount value={displayedAssets.financial} total={displayedAssetTotal} /></strong></div>
                        <dl className="bs-subtotals">
                          {displayedAssets.deposits !== 0 ? <div><dt>預金</dt><dd><BsAmount value={displayedAssets.deposits} total={displayedAssetTotal} /></dd></div> : null}
                          {displayedAssets.securities !== 0 ? <div><dt>有価証券</dt><dd><BsAmount value={displayedAssets.securities} total={displayedAssetTotal} /></dd></div> : null}
                          {displayedAssets.insurance !== 0 ? <div><dt>生命保険{taxIncluded ? "（死亡保険金）" : ""}</dt><dd><BsAmount value={displayedAssets.insurance} total={displayedAssetTotal} /></dd></div> : null}
                        </dl>
                      </div> : null}
                      {displayedAssets.realEstate !== 0 ? <div className={`bs-account real-estate-account grouped-account ${accountDensity(displayedAssets.realEstate, displayedAssetTotal)}`} style={{ height: areaHeight(displayedAssets.realEstate, displayedAssetTotal) }}>
                        <div className="bs-account-heading"><span>不動産</span><strong><BsAmount value={displayedAssets.realEstate} total={displayedAssetTotal} /></strong></div>
                        <dl className="bs-subtotals">
                          {displayedAssets.homeRealEstate !== 0 ? <div><dt>自宅</dt><dd><BsAmount value={displayedAssets.homeRealEstate} total={displayedAssetTotal} /></dd></div> : null}
                          {displayedAssets.incomeRealEstate !== 0 ? <div><dt>収益不動産</dt><dd><BsAmount value={displayedAssets.incomeRealEstate} total={displayedAssetTotal} /></dd></div> : null}
                          {displayedAssets.idleRealEstate !== 0 ? <div><dt>遊休不動産</dt><dd><BsAmount value={displayedAssets.idleRealEstate} total={displayedAssetTotal} /></dd></div> : null}
                        </dl>
                      </div> : null}
                      {displayedAssets.business !== 0 ? <div className={`bs-account business-account grouped-account ${accountDensity(displayedAssets.business, displayedAssetTotal)}`} style={{ height: areaHeight(displayedAssets.business, displayedAssetTotal) }}>
                        <div className="bs-account-heading"><span>事業用資産</span><strong><BsAmount value={displayedAssets.business} total={displayedAssetTotal} /></strong></div>
                        <dl className="bs-subtotals">
                          {displayedAssets.privateShares !== 0 ? <div><dt>自社株</dt><dd><BsAmount value={displayedAssets.privateShares} total={displayedAssetTotal} /></dd></div> : null}
                          {displayedAssets.businessAssets !== 0 ? <div><dt>事業用資産</dt><dd><BsAmount value={displayedAssets.businessAssets} total={displayedAssetTotal} /></dd></div> : null}
                          {displayedAssets.loanReceivables !== 0 ? <div><dt>貸付金</dt><dd><BsAmount value={displayedAssets.loanReceivables} total={displayedAssetTotal} /></dd></div> : null}
                        </dl>
                      </div> : null}
                      {displayedAssets.otherAssets !== 0 ? <div className={`bs-account other-account ${accountDensity(displayedAssets.otherAssets, displayedAssetTotal)}`} style={{ height: areaHeight(displayedAssets.otherAssets, displayedAssetTotal) }}><div><span>その他資産</span></div><strong><BsAmount value={displayedAssets.otherAssets} total={displayedAssetTotal} /></strong></div> : null}
                      </div>
                      <footer><span>資産合計</span><strong>{compactYen(displayedAssetTotal)}</strong></footer>
                    </section>
                    <section className="classified-bs-side funding-side" aria-labelledby={`funding-heading-${headingSuffix}`}>
                      <h4 id={`funding-heading-${headingSuffix}`}><span>負債・純資産の部</span></h4>
                      <div className="bs-account-area">
                      {displayedTaxes !== 0 ? <div className={`bs-account forecast-account grouped-account ${accountDensity(displayedTaxes, fundingAreaTotal)}`} style={{ height: areaHeight(displayedTaxes, fundingAreaTotal) }}>
                        <div className="bs-account-heading"><span>税金</span><strong><BsAmount value={displayedTaxes} total={displayedAssetTotal} /></strong></div>
                        <dl className="bs-subtotals">
                          {estimatedInheritanceTax !== 0 ? <div><dt>相続税</dt><dd><BsAmount value={estimatedInheritanceTax} total={displayedAssetTotal} /></dd></div> : null}
                          {otherTaxes !== 0 ? <div><dt>その他税金</dt><dd><BsAmount value={otherTaxes} total={displayedAssetTotal} /></dd></div> : null}
                        </dl>
                      </div> : null}
                      {summary.liabilities !== 0 ? <div className={`bs-account medium-liability grouped-account ${accountDensity(summary.liabilities, fundingAreaTotal)}`} style={{ height: areaHeight(summary.liabilities, fundingAreaTotal) }}>
                        <div className="bs-account-heading"><span>借入金</span><strong><BsAmount value={summary.liabilities} total={displayedAssetTotal} /></strong></div>
                        <dl className="bs-subtotals">
                          {loanBreakdown.home !== 0 ? <div><dt>住宅ローン</dt><dd><BsAmount value={loanBreakdown.home} total={displayedAssetTotal} /></dd></div> : null}
                          {loanBreakdown.investmentProperty !== 0 ? <div><dt>不動産投資ローン</dt><dd><BsAmount value={loanBreakdown.investmentProperty} total={displayedAssetTotal} /></dd></div> : null}
                          {loanBreakdown.securities !== 0 ? <div><dt>証券担保ローン</dt><dd><BsAmount value={loanBreakdown.securities} total={displayedAssetTotal} /></dd></div> : null}
                          {loanBreakdown.business !== 0 ? <div><dt>事業用借入</dt><dd><BsAmount value={loanBreakdown.business} total={displayedAssetTotal} /></dd></div> : null}
                          {loanBreakdown.other !== 0 ? <div><dt>その他借入金</dt><dd><BsAmount value={loanBreakdown.other} total={displayedAssetTotal} /></dd></div> : null}
                        </dl>
                      </div> : null}
                      {displayedSuccessionCosts !== 0 ? <div className={`bs-account forecast-account ${accountDensity(displayedSuccessionCosts, fundingAreaTotal)}`} aria-label={`承継関連費用 ${compactYen(displayedSuccessionCosts)}`} style={{ height: areaHeight(displayedSuccessionCosts, fundingAreaTotal) }}><div><span>承継関連費用</span><small className="bs-subcategories">承継時の諸費用</small></div><strong><BsAmount value={displayedSuccessionCosts} total={displayedAssetTotal} /></strong></div> : null}
                      {displayedNetWorth !== 0 ? <div className={`bs-account net-assets ${accountDensity(displayedNetWorth, fundingAreaTotal)}`} style={{ height: areaHeight(displayedNetWorth, fundingAreaTotal) }}>
                        <div><span>純資産</span><small>{taxIncluded ? "資産 − 負債 − 税金等" : "資産 − 負債"}</small></div><strong><BsAmount value={displayedNetWorth} total={displayedAssetTotal} /></strong>
                      </div> : null}
                      </div>
                      <footer><span>負債・純資産合計</span><strong>{compactYen(summary.liabilities + forecastAdjustments + displayedNetWorth)}</strong></footer>
                    </section>
                  </div>
                  {smallAreaItems.length > 0 ? <div className="bs-small-area-key" role="note" aria-label="小さい区画の補助表示">
                    <span className="bs-small-area-key-title">小区画</span>
                    {smallAreaItems.map((item) => <span className="bs-small-area-key-item" key={`${item.side}-${item.label}`}>
                      <small>{item.side}</small><strong>{item.label}</strong><b>{compactYen(item.value)}</b><em>{percent.format(item.value / Math.max(displayedAssetTotal, 1) * 100)}%</em>
                    </span>)}
                  </div> : null}
                  <p className="guarantee-note" role="note">※ 個人保証残高（B/S外）：<strong>{compactYen(summary.guarantees)}</strong></p>
                </article>;
                })}
              </section>
            </div>
          ) : null}

          {(section === "positions" || printSections?.has("details")) && workingSnapshot ? <div className={`report-document ${section !== "positions" ? "print-only-document" : ""} ${printSections && !printSections.has("details") ? "print-excluded-document" : ""}`}><AssetsView snapshot={workingSnapshot} snapshots={portfolio.snapshots} onSelectSnapshot={(snapshotId) => router.replace(sectionHref("positions", snapshotId))} onCreateNext={() => setYearCreationSourceId(workingSnapshot.id)} onAdd={openNewPosition} onBulkAdd={() => setBulkModalMode("add")} onBulkEdit={() => setBulkModalMode("edit")} onEdit={openEditPosition} onDelete={setDeletingPosition} onReorder={(side, orderedIds) => reorderPositions(workingSnapshot.id, side, orderedIds)} onEditTaxes={() => setSnapshotTaxModalOpen(true)} onBack={workingSnapshot.isCurrent ? undefined : () => router.push(sectionHref("history"))} saving={saving} /></div> : null}
          {(section === "history" || printSections?.has("history")) ? <div className={`report-document ${section !== "history" ? "print-only-document" : ""} ${printSections && !printSections.has("history") ? "print-excluded-document" : ""}`}><HistoryView key={portfolio.snapshots.map((snapshot) => snapshot.id).join("-")} snapshots={portfolio.snapshots} onCreate={() => setYearCreationSourceId(current.id)} onEditSnapshot={editSnapshot} onDeleteSnapshot={setDeletingSnapshot} saving={saving} /></div> : null}
          {section === "backup" ? <div className="report-document print-excluded-document"><BackupView scope="household" household={portfolio.household} /></div> : null}
        </main>
      </div>
      {menuOpen ? <button className="backdrop" aria-label="メニューを閉じる" onClick={() => setMenuOpen(false)} /> : null}
      {modalOpen ? <PositionModal position={editingPosition} onClose={closePositionModal} onSubmit={savePosition} saving={saving} /> : null}
      {bulkModalMode && workingSnapshot ? <BulkPositionModal mode={bulkModalMode} snapshot={workingSnapshot} onClose={() => setBulkModalMode(null)} onSubmit={(positions) => saveBulkPositions(positions, bulkModalMode)} saving={saving} /> : null}
      {deletingPosition ? <DeletePositionModal position={deletingPosition} onClose={() => setDeletingPosition(null)} onDelete={() => void deletePosition()} saving={saving} /> : null}
      {deletingSnapshot ? <DeleteSnapshotModal snapshot={deletingSnapshot} snapshotCount={portfolio.snapshots.length} onClose={() => setDeletingSnapshot(null)} onSubmit={deleteSnapshot} saving={saving} /> : null}
      {forecastModalOpen ? <ForecastModal planning={portfolio.planning} onClose={() => setForecastModalOpen(false)} onSubmit={saveForecast} saving={saving} /> : null}
      {yearCreationSourceId !== null ? <YearCreationModal snapshots={portfolio.snapshots} initialSourceId={yearCreationSourceId} onClose={() => setYearCreationSourceId(null)} onSubmit={saveSnapshot} onEditExisting={(snapshotId) => { setYearCreationSourceId(null); editSnapshot(snapshotId); }} saving={saving} /> : null}
      {snapshotTaxModalOpen && workingSnapshot ? <SnapshotTaxModal snapshot={workingSnapshot} onClose={() => setSnapshotTaxModalOpen(false)} onSubmit={saveSnapshotTaxes} saving={saving} /> : null}
      {clientEditOpen ? <ClientEditModal household={portfolio.household} error={error} saving={saving} onClose={() => setClientEditOpen(false)} onSubmit={saveClient} /> : null}
      {printGuideOpen ? <PrintGuideModal section={section} onClose={() => setPrintGuideOpen(false)} onPrint={(sections) => {
        setPrintSections(new Set(sections));
        const cleanup = () => { setPrintSections(null); };
        window.addEventListener("afterprint", cleanup, { once: true });
        setPrintGuideOpen(false);
        window.setTimeout(() => window.print(), 100);
      }} /> : null}
    </div>
  );
}

function ClientEditModal({ household, error, saving, onClose, onSubmit }: {
  household: Portfolio["household"];
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return <div className="modal-layer" role="presentation"><div className="modal client-switcher-modal" role="dialog" aria-modal="true" aria-labelledby="client-edit-title">
    <header><div><p className="eyebrow">CLIENT</p><h2 id="client-edit-title">顧客情報を編集</h2></div><button type="button" className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header>
    <form className="client-create-form" onSubmit={onSubmit}>
      <p className="client-modal-guidance">かなを登録しておくと、顧客一覧の検索でかな入力からも探せます。</p>
      {error ? <p className="client-modal-error" role="alert"><AlertTriangle />{error}</p> : null}
      <div className="form-grid client-create-grid"><ClientFields defaults={household} autoFocus /></div>
      <footer>
        <button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button>
        <button type="submit" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Pencil />}保存する</button>
      </footer>
    </form>
  </div></div>;
}

function PrintGuideModal({ section, onClose, onPrint }: { section: Section; onClose: () => void; onPrint: (sections: PrintSection[]) => void }) {
  const options: Array<{ value: PrintSection; label: string }> = [
    { value: "balance", label: "貸借対照表" },
    { value: "details", label: "資産・負債明細" },
    { value: "history", label: "年度比較" },
  ];
  const defaultSection: PrintSection = section === "balance" ? "balance" : section === "positions" ? "details" : "history";
  const [selected, setSelected] = useState<Set<PrintSection>>(() => new Set([defaultSection]));

  function toggleSection(section: PrintSection) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section); else next.add(section);
      return next;
    });
  }

  return <div className="modal-layer" role="presentation"><div className="modal delete-modal print-guide-modal" role="dialog" aria-modal="true" aria-labelledby="print-guide-title" aria-describedby="print-guide-description">
    <header><div><p className="eyebrow">PRINT / PDF</p><h2 id="print-guide-title">印刷・PDF出力</h2></div><button type="button" className="icon-button" aria-label="閉じる" onClick={onClose}><X /></button></header>
    <div className="delete-modal-body">
      <p id="print-guide-description">印刷する資料を選択してください。</p>
      <fieldset className="print-section-options"><legend>印刷対象</legend>{options.map((option) => <label key={option.value}><input type="checkbox" checked={selected.has(option.value)} onChange={() => toggleSection(option.value)} /><span>{option.label}</span></label>)}</fieldset>
      <p className="print-guide-example">「ページ」から、すべて・範囲（1-3）・個別ページ（1,3,5）を選択してください。</p>
      <footer><button type="button" className="button secondary" onClick={onClose}>キャンセル</button><button type="button" className="button primary" disabled={selected.size === 0} onClick={() => onPrint([...selected])}><Printer />選択して印刷</button></footer>
    </div>
  </div></div>;
}

function AssetsView({ snapshot, snapshots, onSelectSnapshot, onCreateNext, onAdd, onBulkAdd, onBulkEdit, onEdit, onDelete, onReorder, onEditTaxes, onBack, saving }: { snapshot: Snapshot; snapshots: Snapshot[]; onSelectSnapshot: (snapshotId: number) => void; onCreateNext: () => void; onAdd: () => void; onBulkAdd: () => void; onBulkEdit: () => void; onEdit: (position: Position) => void; onDelete: (position: Position) => void; onReorder: (section: PositionSection, orderedIds: number[]) => Promise<boolean>; onEditTaxes: () => void; onBack?: () => void; saving: boolean }) {
  const assets = snapshot.positions.filter((p) => p.side === "ASSET");
  const liabilities = snapshot.positions.filter((p) => p.side === "LIABILITY" && p.includedInNetWorth);
  const contingencies = snapshot.positions.filter((p) => p.side === "LIABILITY" && !p.includedInNetWorth);
  const orderedSnapshots = [...snapshots].sort((a, b) => b.fiscalYear - a.fiscalYear);
  const updatedAt = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(snapshot.updatedAt));
  return <><section className="page-heading detail-page-heading"><div><p className="eyebrow">ASSET &amp; LIABILITY DETAILS</p><h2>資産・負債明細</h2><p className="detail-heading-meta"><span className={`detail-status ${snapshot.isCurrent ? "current" : "historical"}`}>{snapshot.isCurrent ? "現在年度" : "過年度を編集中"}</span><span>最終更新 {updatedAt}</span>{!snapshot.isCurrent ? <span>現在年度のデータには影響しません</span> : null}</p></div><div className="page-heading-actions detail-page-actions"><label className="detail-year-selector"><span>表示年度</span><select aria-label="資産・負債明細の表示年度" value={snapshot.id} onChange={(event) => onSelectSnapshot(Number(event.target.value))}>{orderedSnapshots.map((item) => <option key={item.id} value={item.id}>{fiscalYearLabel(item)}{item.isCurrent ? "（現在）" : ""}</option>)}</select></label>{onBack ? <button className="button secondary" onClick={onBack}>年度比較へ戻る</button> : null}<button className="button secondary" onClick={onCreateNext}><Plus />年度を追加</button><button className="button secondary" onClick={onEditTaxes}><Pencil />税金を修正</button><div className="entry-action-group" role="group" aria-label="明細の追加と一括編集"><button className="button secondary" onClick={onBulkEdit}><Pencil />表で編集</button><button className="button secondary" onClick={onBulkAdd}><Table2 />表で追加</button><button className="button primary" onClick={onAdd}><Plus />1件追加</button></div></div></section><PositionTable key={`${snapshot.id}-ASSET-${snapshot.updatedAt}`} title="資産の部" section="ASSET" items={assets} onEdit={onEdit} onDelete={onDelete} onReorder={onReorder} saving={saving} /><PositionTable key={`${snapshot.id}-LIABILITY-${snapshot.updatedAt}`} title="負債の部" section="LIABILITY" items={liabilities} onEdit={onEdit} onDelete={onDelete} onReorder={onReorder} saving={saving} /><PositionTable key={`${snapshot.id}-CONTINGENT-${snapshot.updatedAt}`} title="偶発債務の部（B/S外）" section="CONTINGENT" items={contingencies} onEdit={onEdit} onDelete={onDelete} onReorder={onReorder} saving={saving} /></>;
}

function PositionTable({ title, section, items, onEdit, onDelete, onReorder, saving }: { title: string; section: PositionSection; items: Position[]; onEdit: (position: Position) => void; onDelete: (position: Position) => void; onReorder: (section: PositionSection, orderedIds: number[]) => Promise<boolean>; saving: boolean }) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("ALL");
  const [sortMode, setSortMode] = useState<PositionSortMode>("classification-asc");

  const classifications = useMemo(() => {
    const values = [...new Set(orderedItems.map(middleClassification))];
    return values.sort((a, b) => (middleClassificationRank.get(a) ?? Number.MAX_SAFE_INTEGER) - (middleClassificationRank.get(b) ?? Number.MAX_SAFE_INTEGER));
  }, [orderedItems]);
  const visibleItems = useMemo(() => {
    const filtered = classificationFilter === "ALL"
      ? orderedItems
      : orderedItems.filter((position) => middleClassification(position) === classificationFilter);
    if (sortMode === "manual") return filtered;
    const manualIndex = new Map(orderedItems.map((position, index) => [position.id, index]));
    const direction = sortMode === "classification-asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const rankA = middleClassificationRank.get(middleClassification(a)) ?? Number.MAX_SAFE_INTEGER;
      const rankB = middleClassificationRank.get(middleClassification(b)) ?? Number.MAX_SAFE_INTEGER;
      return (rankA - rankB) * direction || (manualIndex.get(a.id) ?? 0) - (manualIndex.get(b.id) ?? 0);
    });
  }, [classificationFilter, orderedItems, sortMode]);
  const canManualReorder = classificationFilter === "ALL" && sortMode === "manual";
  const hasClassificationControls = classifications.length > 1;
  const visibleTotal = visibleItems.reduce((sum, position) => sum + position.valueJpy, 0);

  async function movePosition(positionId: number, targetIndex: number) {
    if (!canManualReorder) return;
    const currentIndex = orderedItems.findIndex((position) => position.id === positionId);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedItems.length || currentIndex === targetIndex) return;
    const previous = orderedItems;
    const next = [...orderedItems];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrderedItems(next);
    setAnnouncement(`${moved.name}を${targetIndex + 1}番目へ移動しました。`);
    const saved = await onReorder(section, next.map((position) => position.id));
    if (!saved) {
      setOrderedItems(previous);
      setAnnouncement("並び順を元に戻しました。");
    }
  }

  function startDrag(event: DragEvent<HTMLButtonElement>, positionId: number) {
    if (!canManualReorder) return;
    setDraggedId(positionId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(positionId));
  }

  function dropPosition(event: DragEvent<HTMLTableRowElement>, targetId: number) {
    event.preventDefault();
    if (draggedId === null || !canManualReorder) return;
    const targetIndex = orderedItems.findIndex((position) => position.id === targetId);
    void movePosition(draggedId, targetIndex);
    setDraggedId(null);
    setDropTargetId(null);
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, positionId: number) {
    if (!canManualReorder) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const currentIndex = orderedItems.findIndex((position) => position.id === positionId);
    void movePosition(positionId, currentIndex + (event.key === "ArrowUp" ? -1 : 1));
  }

  const filterActive = classificationFilter !== "ALL";
  const reorderHint = canManualReorder ? "登録順・ドラッグで並び替え" : "絞り込み・表示順を適用中";
  const dragDisabledMessage = "並び替えるには、中分類を「すべて」、表示順を「登録順」に戻してください";

  return (
    <section className={`panel table-panel position-section ${section === "CONTINGENT" ? "contingent-section" : ""}`}>
      <PanelHeader
        title={title}
        subtitle={`${visibleItems.length === items.length ? `${items.length}件` : `${visibleItems.length}/${items.length}件表示`}・${reorderHint}`}
        action={hasClassificationControls ? (
          <div className="position-table-tools" aria-label={`${title}の表示設定`}>
            <label>
              <span>中分類</span>
              <select aria-label={`${title}の中分類を絞り込み`} value={classificationFilter} onChange={(event) => setClassificationFilter(event.target.value)}>
                <option value="ALL">すべて</option>
                {classifications.map((classification) => <option key={classification} value={classification}>{classification}</option>)}
              </select>
            </label>
            <label>
              <span>表示順</span>
              <select aria-label={`${title}の中分類の並び順`} value={sortMode} onChange={(event) => setSortMode(event.target.value as PositionSortMode)}>
                <option value="manual">登録順</option>
                <option value="classification-asc">中分類順</option>
                <option value="classification-desc">中分類の逆順</option>
              </select>
            </label>
          </div>
        ) : undefined}
      />
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <div className="table-scroll">
        <table className="position-table">
          <thead><tr><th className="reorder-column"><span className="sr-only">並び順</span></th><th>中分類</th><th>科目・名称</th><th>所在地・金融機関等</th><th>評価方法</th><th className="number">円換算時価</th><th className="actions-column">操作</th></tr></thead>
          <tbody>
            {visibleItems.length === 0 ? <tr className="position-empty-row"><td colSpan={7}>該当する明細はありません。</td></tr> : visibleItems.map((p, index) => (
              <tr key={p.id} className={`${index > 0 && visibleItems[index - 1].category !== p.category ? "is-category-start" : ""} ${draggedId === p.id ? "is-dragging" : ""} ${dropTargetId === p.id && draggedId !== p.id ? "is-drop-target" : ""}`} onDragOver={(event) => { if (!canManualReorder || draggedId === null || draggedId === p.id) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTargetId(p.id); }} onDragLeave={() => setDropTargetId((current) => current === p.id ? null : current)} onDrop={(event) => dropPosition(event, p.id)}>
                <td data-label="並び順" className="reorder-cell"><button type="button" className="drag-handle" draggable={!saving && canManualReorder} disabled={saving || !canManualReorder} aria-label={canManualReorder ? `${p.name}を並び替え。上下矢印キーでも移動できます` : dragDisabledMessage} title={canManualReorder ? "ドラッグして並び替え" : dragDisabledMessage} onDragStart={(event) => startDrag(event, p.id)} onDragEnd={() => { setDraggedId(null); setDropTargetId(null); }} onKeyDown={(event) => moveWithKeyboard(event, p.id)}><GripVertical /></button></td>
                <td data-label="中分類"><span className="classification-label middle">{middleClassification(p)}</span></td>
                <td data-label="科目・名称">{section !== "CONTINGENT" ? <span className="category-tag">{categoryLabels[p.category]}</span> : null}<strong>{p.name}</strong><small className="position-meta">{institutionOrPropertyAddress(p) || "保管先なし"} ／ {p.valuationMethod}</small></td>
                <td data-label="所在地・金融機関等" title={institutionOrPropertyAddress(p) || undefined}>{institutionOrPropertyAddress(p) || "—"}</td>
                <td data-label="評価方法" title={valuationBreakdown(p) || p.valuationMethod}><span>{p.valuationMethod}</span>{valuationBreakdown(p) ? <small className="valuation-breakdown">{valuationBreakdown(p)}</small> : null}</td>
                <td data-label="円換算時価" className="number"><strong>{yen.format(p.valueJpy)}</strong>{p.currency !== "JPY" ? <small>{p.originalAmount.toLocaleString()} {p.currency} × {p.fxRate}</small> : null}</td>
                <td data-label="操作"><div className="table-actions"><button className="row-action edit" title="修正" aria-label={`${p.name}を修正`} onClick={() => onEdit(p)}><Pencil /><span className="sr-only">修正</span></button><button className="row-action delete" title="削除" aria-label={`${p.name}を削除`} onClick={() => onDelete(p)}><Trash2 /><span className="sr-only">削除</span></button></div></td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td className="position-total-row" colSpan={7}><div><span>{filterActive ? "表示中の合計" : "合計"}</span><strong>{yen.format(visibleTotal)}</strong></div></td></tr></tfoot>
        </table>
      </div>
    </section>
  );
}

function HistoryView({ snapshots, onCreate, onEditSnapshot, onDeleteSnapshot, saving }: { snapshots: Snapshot[]; onCreate: () => void; onEditSnapshot: (snapshotId: number) => void; onDeleteSnapshot: (snapshot: Snapshot) => void; saving: boolean }) {
  const [expandedGroups, setExpandedGroups] = useState<Set<TrendGroup>>(() => new Set());
  const periodLabels = ["古い年度", "中間年度", "最新年度"] as const;
  const orderedSnapshots = [...snapshots].sort((a, b) => a.fiscalYear - b.fiscalYear || a.id - b.id);
  const latestSnapshots = orderedSnapshots.slice(-3);
  const defaultSnapshotIds: Array<number | null> = [...Array(Math.max(0, 3 - latestSnapshots.length)).fill(null), ...latestSnapshots.map((snapshot) => snapshot.id)];
  const [selectedSnapshotIds, setSelectedSnapshotIds] = useState<Array<number | null>>(() => defaultSnapshotIds);
  const paddedPeriods = selectedSnapshotIds.map((snapshotId) => {
    const snapshot = snapshots.find((candidate) => candidate.id === snapshotId);
    return snapshot ? { snapshot, values: trendValues(snapshot) } : null;
  });
  const periods = paddedPeriods.filter((period): period is NonNullable<typeof period> => period !== null);
  const latest = paddedPeriods[2]?.values;
  const previous = paddedPeriods[1]?.values;
  const childrenFor = (group: TrendGroup) => trendChildRows[group].filter((child) => periods.some((period) => period.values[child.key] !== 0));
  const visibleRows = trendRows.flatMap((row) => row.group && expandedGroups.has(row.group) ? [row, ...childrenFor(row.group)] : [row]);

  function toggleGroup(group: TrendGroup) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  }

  function selectPeriod(index: number, snapshotId: string) {
    setSelectedSnapshotIds((current) => {
      const next = current.map((value, currentIndex) => currentIndex === index ? (snapshotId ? Number(snapshotId) : null) : value);
      const chronological = next
        .filter((value): value is number => value !== null)
        .sort((leftId, rightId) => {
          const left = snapshots.find((snapshot) => snapshot.id === leftId);
          const right = snapshots.find((snapshot) => snapshot.id === rightId);
          return (left?.fiscalYear ?? 0) - (right?.fiscalYear ?? 0);
        });
      return [...Array(3 - chronological.length).fill(null), ...chronological];
    });
  }

  return <>
    <section className="page-heading history-page-heading"><div><p className="eyebrow">ANNUAL COMPARISON</p><h2>3年度比較</h2></div><button className="button primary" onClick={onCreate} disabled={saving}><Plus />年度を追加</button></section>
    <section className="panel table-panel trend-panel" aria-labelledby="trend-table-title">
      <PanelHeader title="3年度推移表" />
      {snapshots.length < 3 ? <p className="trend-guidance">3年度比較には、あと{3 - snapshots.length}年度分の登録が必要です。</p> : null}
      <div className="table-scroll trend-scroll">
        <table className="trend-table">
          <caption id="trend-table-title" className="sr-only">貸借対照表の3年度推移</caption>
          <thead><tr><th scope="col"><span className="sr-only">科目</span></th>{paddedPeriods.map((period, index) => <th scope="col" className="number period-selector" key={`period-${index}`}><span className="period-position-label">{periodLabels[index]}</span><select aria-label={`${periodLabels[index]}の選択`} value={period?.snapshot.id ?? ""} onChange={(event) => selectPeriod(index, event.target.value)}><option value="">未選択</option>{[...orderedSnapshots].reverse().map((snapshot) => <option key={snapshot.id} value={snapshot.id} disabled={selectedSnapshotIds.some((selectedId, selectedIndex) => selectedIndex !== index && selectedId === snapshot.id)}>{fiscalYearLabel(snapshot)}{snapshot.isCurrent ? "（現在）" : ""}</option>)}</select>{period ? <button type="button" className="period-edit" onClick={() => onEditSnapshot(period.snapshot.id)}><Pencil />この年度を修正</button> : null}</th>)}<th scope="col" className="number trend-change-column"><span>前年度差</span><small>最新 − 直前</small></th></tr></thead>
          <tbody>{visibleRows.map((row) => {
            if (row.tone === "section") return <tr className="trend-section" key={`section-${row.key}`}><th scope="rowgroup" colSpan={4}>{row.label}</th><td className="trend-change trend-section-change" aria-hidden="true" /></tr>;
            const change = latest && previous ? latest[row.key] - previous[row.key] : null;
            const expanded = row.group ? expandedGroups.has(row.group) : false;
            const canExpand = row.group ? childrenFor(row.group).length > 0 : false;
            const rowClass = [row.tone ? `trend-${row.tone}` : "", row.group ? "trend-expandable" : "", row.child ? "trend-child" : ""].filter(Boolean).join(" ");
            return <tr className={rowClass || undefined} key={`${row.child ? "child" : row.tone ?? "detail"}-${row.key}`}><th scope="row"><span className="trend-row-heading">{row.group && canExpand ? <button type="button" className="trend-expand" aria-label={`${row.label}の小分類を${expanded ? "閉じる" : "表示"}`} aria-expanded={expanded} onClick={() => toggleGroup(row.group!)}>{expanded ? <Minus /> : <Plus />}</button> : !row.child && !row.tone ? <span className="trend-expand-placeholder" aria-hidden="true" /> : null}<span>{row.label}</span></span></th>{paddedPeriods.map((period, index) => <td className="number" key={period?.snapshot.id ?? `empty-${index}`}>{period ? compactYen(period.values[row.key]) : "—"}</td>)}<td className={`number trend-change ${change === null ? "" : change > 0 ? "positive" : change < 0 ? "negative" : "neutral"}`}>{change === null ? "—" : `${change > 0 ? "+" : ""}${compactYen(change)}`}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </section>
    <section className="panel table-panel history-list-panel">
      <PanelHeader title="年度一覧" subtitle={`${snapshots.length}年度`} />
      <div className="table-scroll"><table className="history-table"><thead><tr><th>基準日</th><th>状態</th><th className="number">資産合計</th><th className="number">負債合計</th><th className="number">純資産</th><th className="number">個人保証</th><th className="actions-column">操作</th></tr></thead><tbody>{[...orderedSnapshots].reverse().map((snapshot) => { const s = trendValues(snapshot); return <tr key={snapshot.id}><td><strong>{dateJa(snapshot.asOfDate)}</strong></td><td>{snapshot.isCurrent ? <span className="current-badge">現在</span> : snapshot.label}</td><td className="number">{compactYen(s.assets)}</td><td className="number">{compactYen(s.liabilities)}</td><td className="number emphasis">{compactYen(s.netWorth)}</td><td className="number">{compactYen(s.guarantees)}</td><td><div className="table-actions"><button type="button" className="row-action delete" title={`${snapshot.fiscalYear}年度を削除`} aria-label={`${snapshot.fiscalYear}年度のデータを削除`} onClick={() => onDeleteSnapshot(snapshot)}><Trash2 /><span className="sr-only">年度を削除</span></button></div></td></tr>; })}</tbody></table></div>
    </section>
  </>;
}


function YearCreationModal({ snapshots, initialSourceId, onClose, onSubmit, onEditExisting, saving }: {
  snapshots: Snapshot[];
  initialSourceId: number;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEditExisting: (snapshotId: number) => void;
  saving: boolean;
}) {
  const orderedSnapshots = [...snapshots].sort((a, b) => b.fiscalYear - a.fiscalYear || b.id - a.id);
  const initialSource = snapshots.find((snapshot) => snapshot.id === initialSourceId) ?? orderedSnapshots[0];
  const [creationMode, setCreationMode] = useState<"COPY" | "BLANK">("COPY");
  const [sourceId, setSourceId] = useState(initialSource.id);
  const [fiscalYear, setFiscalYear] = useState(String(initialSource.fiscalYear + 1));
  const source = snapshots.find((snapshot) => snapshot.id === sourceId) ?? initialSource;
  const targetYear = Number(fiscalYear);
  const validTargetYear = Number.isInteger(targetYear) && targetYear >= 1900 && targetYear <= 2200;
  const existingSnapshot = validTargetYear ? snapshots.find((snapshot) => snapshot.fiscalYear === targetYear) : undefined;
  const latestYear = Math.max(...snapshots.map((snapshot) => snapshot.fiscalYear));

  function changeSource(nextSourceId: number) {
    const nextSource = snapshots.find((snapshot) => snapshot.id === nextSourceId);
    if (!nextSource) return;
    setSourceId(nextSource.id);
    setFiscalYear(String(nextSource.fiscalYear + 1));
  }

  return <div className="modal-layer" role="presentation"><div className="modal year-creation-modal" role="dialog" aria-modal="true" aria-labelledby="year-creation-title">
    <header><div><p className="eyebrow">ADD FISCAL YEAR</p><h2 id="year-creation-title">年度を追加</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header>
    <form onSubmit={onSubmit}>
      <p className="form-intro">作成方法と年度を選択してください。同じ年度は1件だけ登録できます。</p>
      <fieldset className="year-creation-method"><legend>作成方法</legend><div className="year-method-options">
        <label><input type="radio" name="creationMode" value="COPY" checked={creationMode === "COPY"} onChange={() => setCreationMode("COPY")} disabled={saving} /><span><strong>前年度からコピー</strong><small>明細と税金を引き継ぐ</small></span></label>
        <label><input type="radio" name="creationMode" value="BLANK" checked={creationMode === "BLANK"} onChange={() => setCreationMode("BLANK")} disabled={saving} /><span><strong>空の年度を作成</strong><small>明細・税金を0から入力</small></span></label>
      </div></fieldset>
      <div className={`form-grid year-creation-grid ${creationMode === "BLANK" ? "blank-mode" : ""}`}>
        {creationMode === "COPY" ? <label>コピー元年度<select name="sourceSnapshotId" value={sourceId} onChange={(event) => changeSource(Number(event.target.value))} disabled={saving}>{orderedSnapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{fiscalYearLabel(snapshot)}{snapshot.isCurrent ? "（現在）" : ""}</option>)}</select></label> : <input type="hidden" name="sourceSnapshotId" value={sourceId} />}
        <label>作成年度<input name="fiscalYear" type="number" min="1900" max="2200" step="1" value={fiscalYear} onChange={(event) => setFiscalYear(event.target.value)} required disabled={saving} /></label>
      </div>
      {validTargetYear && creationMode === "COPY" ? <div className="year-copy-preview" aria-label={`${source.fiscalYear}年度から${targetYear}年度へコピー`}><span>{source.fiscalYear}年度</span><ChevronRight /><strong>{targetYear}年度</strong></div> : null}
      {validTargetYear && creationMode === "BLANK" ? <div className="year-blank-preview" aria-label={`${targetYear}年度を空の状態で作成`}><strong>{targetYear}年度</strong><span>資産・負債・偶発債務 0件／税金 0円</span></div> : null}
      {existingSnapshot ? <div className="year-conflict" role="alert"><AlertTriangle /><div><strong>{targetYear}年度は登録済みです</strong><p>1事業年度1件のため、新規作成や上書きは行いません。登録済み年度を修正してください。</p></div></div> : validTargetYear ? <div className="year-create-note"><CircleCheck /><span>{targetYear > latestYear ? "作成後は、この年度が現在年度になります。" : "過年度として追加します。現在年度は変わりません。"}</span></div> : null}
      <footer><button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button>{existingSnapshot ? <button type="button" className="button primary" onClick={() => onEditExisting(existingSnapshot.id)}><Pencil />{targetYear}年度を修正</button> : <button type="submit" className="button primary" disabled={saving || !validTargetYear}>{saving ? <LoaderCircle className="spin" /> : <Plus />}{creationMode === "COPY" ? "コピーして作成" : "空の年度を作成"}</button>}</footer>
    </form>
  </div></div>;
}

function AssetSpecificFields({
  category,
  details,
  propertyType,
  formula,
  onPropertyTypeChange,
  landArea,
  onLandAreaChange,
  fixedAssetTaxValue,
  onFixedAssetTaxValueChange,
  ownershipNumerator,
  ownershipDenominator,
  onOwnershipNumeratorChange,
  onOwnershipDenominatorChange,
}: {
  category: string;
  details: AssetDetails;
  propertyType: string;
  formula: ValuationFormula;
  onPropertyTypeChange: (value: string) => void;
  landArea: string;
  onLandAreaChange: (value: string) => void;
  fixedAssetTaxValue: string;
  onFixedAssetTaxValueChange: (value: string) => void;
  ownershipNumerator: string;
  ownershipDenominator: string;
  onOwnershipNumeratorChange: (value: string) => void;
  onOwnershipDenominatorChange: (value: string) => void;
}) {
  if (category === "DEPOSIT") return <fieldset key={category} className="asset-detail-fieldset full"><legend>預金の情報</legend><div className="asset-detail-grid">
    <label>預金種類<select name="assetDetail.accountType" defaultValue={details.accountType ?? "ORDINARY"}><option value="ORDINARY">普通預金</option><option value="TIME">定期預金</option><option value="FOREIGN">外貨預金</option><option value="OTHER">その他</option></select></label>
    <label>支店名<input name="assetDetail.branchName" defaultValue={details.branchName ?? ""} /></label>
    <label>口座識別（下4桁）<input name="assetDetail.accountSuffix" inputMode="numeric" maxLength={4} pattern="[0-9]{0,4}" defaultValue={details.accountSuffix ?? ""} /></label>
    <label>満期日<input name="assetDetail.maturityDate" type="date" defaultValue={details.maturityDate ?? ""} /></label>
  </div></fieldset>;

  if (category === "SECURITIES") return <fieldset key={category} className="asset-detail-fieldset full"><legend>有価証券の情報</legend><div className="asset-detail-grid">
    <label>証券種類<select name="assetDetail.securityType" defaultValue={details.securityType ?? "LISTED_STOCK"}><option value="LISTED_STOCK">上場株式</option><option value="BOND">債券</option><option value="FUND">投資信託</option><option value="ETF">ETF</option><option value="OTHER">その他</option></select></label>
    <label>銘柄コード<input name="assetDetail.securityCode" defaultValue={details.securityCode ?? ""} /></label>
    <label>評価日<input name="assetDetail.valuationDate" type="date" defaultValue={details.valuationDate ?? ""} /></label>
  </div></fieldset>;

  if (["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"].includes(category)) return <fieldset key={category} className="asset-detail-fieldset full"><legend>不動産の基本情報</legend><div className="asset-detail-grid">
    <label>資産区分<select name="assetDetail.propertyType" value={propertyType} onChange={(event) => onPropertyTypeChange(event.target.value)}><option value="LAND">土地</option><option value="BUILDING">建物</option></select></label>
    <label className="wide">所在地<input name="assetDetail.propertyAddress" required defaultValue={details.propertyAddress ?? ""} /></label>
    {propertyType === "LAND" ? <>
      <LandCategoryField defaultValue={details.landCategory ?? ""} />
      <label>面積（㎡）<CommaNumberInput name="landArea" defaultValue="" value={landArea} onValueChange={onLandAreaChange} maxFractionDigits={4} placeholder="" positive required={formula === "LAND_ROADSIDE"} /></label>
    </> : <>
      <BuildingTypeField defaultValue={details.buildingType ?? ""} />
      <label>構造<select name="assetDetail.buildingStructure" defaultValue={details.buildingStructure ?? ""}><option value="">未選択</option><option value="WOOD">木造</option><option value="STEEL">鉄骨造</option><option value="RC">鉄筋コンクリート造</option><option value="SRC">鉄骨鉄筋コンクリート造</option><option value="OTHER">その他</option></select></label>
      <label>床面積（㎡）<CommaNumberInput name="assetDetail.floorArea" defaultValue={details.floorArea ?? ""} maxFractionDigits={4} placeholder="" positive required={false} /></label>
    </>}
    <label>固定資産税評価額<CommaNumberInput name="fixedAssetTaxValue" defaultValue="" value={fixedAssetTaxValue} onValueChange={onFixedAssetTaxValueChange} maxFractionDigits={2} placeholder="" positive required={formula === "LAND_MULTIPLIER" || formula === "BUILDING"} /></label>
    <OwnershipFractionInput numerator={ownershipNumerator} denominator={ownershipDenominator} onNumeratorChange={onOwnershipNumeratorChange} onDenominatorChange={onOwnershipDenominatorChange} />
    <label>評価日<input name="assetDetail.valuationDate" type="date" defaultValue={details.valuationDate ?? ""} /></label>
  </div><p className="asset-detail-note">土地と建物は別明細で登録します。面積・固定資産税評価額・持分は、選択した評価方法へ自動反映されます。</p></fieldset>;

  if (category === "PRIVATE_SHARES") return <fieldset key={category} className="asset-detail-fieldset full"><legend>自社株の情報</legend><div className="asset-detail-grid">
    <label>株式種類<select name="assetDetail.shareClass" defaultValue={details.shareClass ?? "COMMON"}><option value="COMMON">普通株式</option><option value="CLASS">種類株式</option></select></label>
    <label>発行済株式総数<CommaNumberInput name="assetDetail.totalIssuedShares" defaultValue={details.totalIssuedShares ?? ""} maxFractionDigits={0} placeholder="" positive required={false} /></label>
    <label>評価方式<select name="assetDetail.valuationApproach" defaultValue={details.valuationApproach ?? "COMPARABLE"}><option value="COMPARABLE">類似業種比準方式</option><option value="NET_ASSET">純資産価額方式</option><option value="DIVIDEND">配当還元方式</option><option value="DCF">DCF法</option><option value="OTHER">その他</option></select></label>
    <label>評価日<input name="assetDetail.valuationDate" type="date" defaultValue={details.valuationDate ?? ""} /></label>
  </div></fieldset>;

  if (category === "BUSINESS_ASSETS") return <fieldset key={category} className="asset-detail-fieldset full"><legend>事業用資産の情報</legend><div className="asset-detail-grid">
    <label>資産種類<select name="assetDetail.businessAssetType" defaultValue={details.businessAssetType ?? "EQUIPMENT"}><option value="EQUIPMENT">機械・設備</option><option value="VEHICLE">車両</option><option value="GOODWILL">営業権</option><option value="INVENTORY">棚卸資産</option><option value="OTHER">その他</option></select></label>
    <label>事業・屋号<input name="assetDetail.businessName" defaultValue={details.businessName ?? ""} /></label>
    <label>保管・所在場所<input name="assetDetail.storageLocation" defaultValue={details.storageLocation ?? ""} /></label>
    <label>評価日<input name="assetDetail.valuationDate" type="date" defaultValue={details.valuationDate ?? ""} /></label>
  </div></fieldset>;

  if (category === "LOAN_RECEIVABLE") return <fieldset key={category} className="asset-detail-fieldset full"><legend>貸付金の情報</legend><div className="asset-detail-grid">
    <label>借主<input name="assetDetail.borrower" required defaultValue={details.borrower ?? ""} /></label>
    <label>貸付日<input name="assetDetail.loanDate" type="date" defaultValue={details.loanDate ?? ""} /></label>
    <label>返済期限<input name="assetDetail.dueDate" type="date" defaultValue={details.dueDate ?? ""} /></label>
    <label>金利（%）<CommaNumberInput name="assetDetail.interestRate" defaultValue={details.interestRate ?? ""} maxFractionDigits={3} placeholder="" required={false} /></label>
    <label>回収可能性<select name="assetDetail.collectibility" defaultValue={details.collectibility ?? "NORMAL"}><option value="NORMAL">正常</option><option value="CAUTION">要注意</option><option value="DIFFICULT">回収困難</option></select></label>
  </div></fieldset>;

  if (category === "INSURANCE") return <fieldset key={category} className="asset-detail-fieldset full"><legend>生命保険の情報</legend><div className="asset-detail-grid">
    <label>保険種類<select name="assetDetail.insuranceType" defaultValue={details.insuranceType ?? "WHOLE_LIFE"}><option value="WHOLE_LIFE">終身保険</option><option value="TERM">定期保険</option><option value="ENDOWMENT">養老保険</option><option value="ANNUITY">個人年金保険</option><option value="OTHER">その他</option></select></label>
    <label>被保険者<input name="assetDetail.insuredPerson" defaultValue={details.insuredPerson ?? ""} /></label>
    <label>受取人<input name="assetDetail.beneficiary" defaultValue={details.beneficiary ?? ""} /></label>
    <label>死亡保険金<CommaNumberInput name="assetDetail.deathBenefit" defaultValue={details.deathBenefit ?? ""} maxFractionDigits={2} placeholder="" required={false} /></label>
    <label>評価日<input name="assetDetail.valuationDate" type="date" defaultValue={details.valuationDate ?? ""} /></label>
  </div></fieldset>;

  if (category === "COLLECTIBLES") return <fieldset key={category} className="asset-detail-fieldset full"><legend>その他資産の情報</legend><div className="asset-detail-grid">
    <label>資産種類<select name="assetDetail.otherAssetType" defaultValue={details.otherAssetType ?? "PRECIOUS_METAL"}><option value="PRECIOUS_METAL">金・貴金属</option><option value="ART">美術品</option><option value="WATCH">時計</option><option value="VEHICLE">車両</option><option value="MEMBERSHIP">会員権</option><option value="CRYPTO">暗号資産</option><option value="OTHER">その他</option></select></label>
    <label>保管場所<input name="assetDetail.storageLocation" defaultValue={details.storageLocation ?? ""} /></label>
    <label>評価日<input name="assetDetail.valuationDate" type="date" defaultValue={details.valuationDate ?? ""} /></label>
  </div></fieldset>;

  return null;
}

type BulkEntryType = "SECURITIES" | "PRIVATE_SHARES" | "LAND" | "BUILDING";
type BulkField = "category" | "valuationFormula" | "name" | "institution" | "address" | "landCategory" | "buildingType" | "buildingStructure" | "floorArea" | "quantity" | "unitPrice" | "landArea" | "roadsideValue" | "fixedAssetTaxValue" | "multiplier" | "adjustmentRate" | "ownershipNumerator" | "ownershipDenominator" | "originalAmount" | "note";
type BulkRow = Record<BulkField, string> & { id: number; positionId: number | null; error: string; errorFields: BulkField[] };
type BulkColumn = { key: BulkField; label: string; numeric?: boolean; required?: boolean; conditional?: boolean; kind?: "category" | "formula" | "landCategory" | "buildingType"; width?: string };

const bulkEntryTypeLabels: Record<BulkEntryType, string> = { SECURITIES: "有価証券", PRIVATE_SHARES: "自社株", LAND: "土地", BUILDING: "建物" };
const bulkEntryTypes: BulkEntryType[] = ["SECURITIES", "PRIVATE_SHARES", "LAND", "BUILDING"];

function createBulkRow(id: number, positionId: number | null = null): BulkRow {
  return {
    id, positionId, error: "", errorFields: [], category: "REAL_ESTATE", valuationFormula: "STOCK", name: "", institution: "", address: "", landCategory: "", buildingType: "", buildingStructure: "",
    floorArea: "", quantity: "", unitPrice: "", landArea: "", roadsideValue: "", fixedAssetTaxValue: "", multiplier: "1.0",
    adjustmentRate: "1.0", ownershipNumerator: "1", ownershipDenominator: "1", originalAmount: "", note: "",
  };
}

function bulkEntryTypeForPosition(position: Position): BulkEntryType | null {
  if (position.side !== "ASSET") return null;
  if (position.category === "SECURITIES" && ["STOCK", "MANUAL"].includes(position.valuationFormula)) return "SECURITIES";
  if (position.category === "PRIVATE_SHARES" && ["STOCK", "MANUAL"].includes(position.valuationFormula)) return "PRIVATE_SHARES";
  if (!["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"].includes(position.category)) return null;
  const propertyType = position.assetDetails?.propertyType ?? (position.valuationFormula === "BUILDING" ? "BUILDING" : "LAND");
  if (propertyType === "BUILDING" && !["LAND_ROADSIDE", "LAND_MULTIPLIER"].includes(position.valuationFormula)) return "BUILDING";
  if (propertyType === "LAND" && position.valuationFormula !== "BUILDING") return "LAND";
  return null;
}

function bulkNumber(value: number | null | undefined, maxFractionDigits = 2) {
  return value === null || value === undefined ? "" : formatCommaNumberInput(String(value), maxFractionDigits);
}

function bulkRowFromPosition(position: Position): BulkRow {
  const details = position.assetDetails ?? {};
  const [fallbackNumerator, fallbackDenominator] = decimalToFraction(position.ownershipShare);
  return {
    ...createBulkRow(position.id, position.id),
    category: position.category,
    valuationFormula: position.valuationFormula,
    name: position.name,
    institution: position.category === "PRIVATE_SHARES" ? details.shareClass ?? position.institution : position.institution,
    address: details.propertyAddress ?? "",
    landCategory: details.landCategory ?? "",
    buildingType: details.buildingType ?? "",
    buildingStructure: details.buildingStructure ?? "",
    floorArea: bulkNumber(details.floorArea, 6),
    quantity: bulkNumber(position.valuationQuantity, 6),
    unitPrice: bulkNumber(position.valuationUnitPrice),
    landArea: bulkNumber(position.landArea, 6),
    roadsideValue: bulkNumber(position.roadsideValue === null ? null : position.roadsideValue / 1000),
    fixedAssetTaxValue: bulkNumber(position.fixedAssetTaxValue === null ? null : position.fixedAssetTaxValue / 1000),
    multiplier: bulkNumber(position.valuationMultiplier) || "1.0",
    adjustmentRate: bulkNumber(position.adjustmentRate) || "1.0",
    ownershipNumerator: bulkNumber(position.ownershipNumerator ?? fallbackNumerator, 0),
    ownershipDenominator: bulkNumber(position.ownershipDenominator ?? fallbackDenominator, 0),
    originalAmount: bulkNumber(position.originalAmount),
    note: position.note,
  };
}

function editableBulkPositions(snapshot: Snapshot, entryType: BulkEntryType) {
  return snapshot.positions.filter((position) => bulkEntryTypeForPosition(position) === entryType);
}

function BulkPositionModal({ mode, snapshot, onClose, onSubmit, saving }: {
  mode: BulkModalMode;
  snapshot: Snapshot;
  onClose: () => void;
  onSubmit: (positions: BulkPositionPayload[]) => Promise<boolean>;
  saving: boolean;
}) {
  const entryCounts = useMemo(() => Object.fromEntries(bulkEntryTypes.map((type) => [type, editableBulkPositions(snapshot, type).length])) as Record<BulkEntryType, number>, [snapshot]);
  const initialEntryType = mode === "edit" ? bulkEntryTypes.find((type) => entryCounts[type] > 0) ?? "SECURITIES" : "SECURITIES";
  const [entryType, setEntryType] = useState<BulkEntryType>(initialEntryType);
  const [rows, setRows] = useState(() => mode === "edit" ? editableBulkPositions(snapshot, initialEntryType).map(bulkRowFromPosition) : Array.from({ length: 5 }, (_, index) => createBulkRow(index + 1)));
  const [formError, setFormError] = useState("");
  const isStock = ["SECURITIES", "PRIVATE_SHARES"].includes(entryType);
  const isLand = entryType === "LAND";
  const isBuilding = entryType === "BUILDING";
  const isRealEstate = isLand || isBuilding;

  const columns = useMemo<BulkColumn[]>(() => {
    if (isStock) return [
      { key: "name", label: entryType === "PRIVATE_SHARES" ? "会社名" : "銘柄名", required: true, width: "190px" },
      { key: "institution", label: entryType === "PRIVATE_SHARES" ? "株式種類" : "証券会社", width: "150px" },
      { key: "valuationFormula", label: "方式", required: true, kind: "formula", width: "56px" },
      { key: "quantity", label: "株数・口数", numeric: true, conditional: true, width: "130px" },
      { key: "unitPrice", label: "単価", numeric: true, conditional: true, width: "130px" },
      { key: "adjustmentRate", label: "調整率", numeric: true, conditional: true, width: "100px" },
      { key: "originalAmount", label: "直接入力額", numeric: true, conditional: true, width: "110px" },
      { key: "note", label: "メモ", width: "170px" },
    ];
    const basic: BulkColumn[] = [
      { key: "category", label: "科目", required: true, kind: "category", width: "84px" },
      { key: "name", label: "名称", required: true, width: "96px" },
      { key: "address", label: "所在地", required: true, width: "184px" },
    ];
    if (isLand) {
      basic.push(
        { key: "landCategory", label: "地目", kind: "landCategory", width: "76px" },
        { key: "landArea", label: "面積㎡", numeric: true, width: "56px" },
        { key: "valuationFormula", label: "方式", required: true, kind: "formula", width: "50px" },
        { key: "roadsideValue", label: "路線価（千円/㎡）", numeric: true, conditional: true, width: "80px" },
        { key: "fixedAssetTaxValue", label: "固定資産税評価（千円）", numeric: true, width: "86px" },
        { key: "multiplier", label: "倍率", numeric: true, conditional: true, width: "44px" },
      );
    } else {
      basic.push(
        { key: "buildingType", label: "用途", kind: "buildingType", width: "76px" },
        { key: "buildingStructure", label: "構造", width: "56px" },
        { key: "floorArea", label: "床面積㎡", numeric: true, width: "56px" },
        { key: "valuationFormula", label: "方式", required: true, kind: "formula", width: "50px" },
        { key: "fixedAssetTaxValue", label: "固定資産税評価（千円）", numeric: true, width: "86px" },
        { key: "multiplier", label: "倍率", numeric: true, conditional: true, width: "44px" },
      );
    }
    basic.push(
      { key: "adjustmentRate", label: "調整率", numeric: true, conditional: true, width: "44px" },
      { key: "ownershipNumerator", label: "持分子", numeric: true, required: true, width: "44px" },
      { key: "ownershipDenominator", label: "持分母", numeric: true, required: true, width: "44px" },
      { key: "originalAmount", label: "直接入力額", numeric: true, conditional: true, width: "82px" },
    );
    return basic;
  }, [entryType, isLand, isStock]);

  function changeEntryType(nextType: BulkEntryType) {
    setEntryType(nextType);
    if (mode === "edit") {
      setRows(editableBulkPositions(snapshot, nextType).map(bulkRowFromPosition));
      setFormError("");
      return;
    }
    const defaultFormula = nextType === "LAND" ? "LAND_ROADSIDE" : nextType === "BUILDING" ? "BUILDING" : "STOCK";
    setRows((currentRows) => currentRows.map((row) => ({
      ...row,
      category: ["LAND", "BUILDING"].includes(nextType) && !["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"].includes(row.category) ? "REAL_ESTATE" : row.category,
      valuationFormula: defaultFormula,
      error: "",
      errorFields: [],
    })));
    setFormError("");
  }

  function updateRow(rowId: number, key: BulkField, rawValue: string, numeric = false) {
    const value = numeric ? formatCommaNumberInput(rawValue, ["quantity", "landArea", "floorArea"].includes(key) ? 6 : 2) : rawValue;
    setRows((currentRows) => currentRows.map((row) => row.id === rowId ? { ...row, [key]: value, error: "", errorFields: row.errorFields.filter((field) => field !== key) } : row));
  }

  function fieldIsDisabled(row: BulkRow, key: BulkField) {
    const rowFormula = row.valuationFormula as ValuationFormula;
    if (isStock) {
      if (key === "originalAmount") return rowFormula !== "MANUAL";
      if (["quantity", "unitPrice", "adjustmentRate"].includes(key)) return rowFormula === "MANUAL";
      return false;
    }
    if (!isRealEstate) return false;
    if (key === "originalAmount") return rowFormula !== "MANUAL";
    if (key === "adjustmentRate") return rowFormula === "MANUAL";
    if (key === "roadsideValue") return rowFormula !== "LAND_ROADSIDE";
    if (key === "multiplier") return !["LAND_MULTIPLIER", "BUILDING"].includes(rowFormula);
    return false;
  }

  function requiredFieldsForRow(row: BulkRow): BulkField[] {
    if (isStock) return row.valuationFormula === "MANUAL" ? ["name", "valuationFormula", "originalAmount"] : ["name", "valuationFormula", "quantity", "unitPrice", "adjustmentRate"];
    const common: BulkField[] = ["category", "name", "address", "valuationFormula", "ownershipNumerator", "ownershipDenominator"];
    if (row.valuationFormula === "LAND_ROADSIDE") return [...common, "landArea", "roadsideValue", "adjustmentRate"];
    if (["LAND_MULTIPLIER", "BUILDING"].includes(row.valuationFormula)) return [...common, "fixedAssetTaxValue", "multiplier", "adjustmentRate"];
    return [...common, "originalAmount"];
  }

  function addRow(afterId?: number, source?: BulkRow) {
    setRows((currentRows) => {
      const nextId = Math.max(0, ...currentRows.map((row) => row.id)) + 1;
      const nextRow = source ? { ...source, id: nextId, error: "", errorFields: [] } : createBulkRow(nextId);
      if (afterId === undefined) return [...currentRows, nextRow];
      const index = currentRows.findIndex((row) => row.id === afterId);
      return [...currentRows.slice(0, index + 1), nextRow, ...currentRows.slice(index + 1)];
    });
  }

  function removeRow(rowId: number) {
    setRows((currentRows) => currentRows.length === 1 ? [createBulkRow(currentRows[0].id)] : currentRows.filter((row) => row.id !== rowId));
  }

  function calculatedRowValue(row: BulkRow) {
    const number = (value: string) => Number(value.replace(/,/g, "")) || 0;
    if (isStock) return row.valuationFormula === "MANUAL" ? number(row.originalAmount) : number(row.quantity) * number(row.unitPrice) * number(row.adjustmentRate);
    const share = number(row.ownershipDenominator) > 0 ? number(row.ownershipNumerator) / number(row.ownershipDenominator) : 0;
    if (row.valuationFormula === "LAND_ROADSIDE") return number(row.landArea) * number(row.roadsideValue) * 1000 * number(row.adjustmentRate) * share;
    if (["LAND_MULTIPLIER", "BUILDING"].includes(row.valuationFormula)) return number(row.fixedAssetTaxValue) * 1000 * number(row.multiplier) * number(row.adjustmentRate) * share;
    return number(row.originalAmount);
  }

  function normalizedPastedValue(key: BulkField, value: string) {
    const trimmed = value.trim();
    if (key === "category") {
      const categories: Record<string, string> = { 自宅: "HOME_REAL_ESTATE", 収益不動産: "REAL_ESTATE", 遊休不動産: "IDLE_REAL_ESTATE" };
      return categories[trimmed] ?? trimmed;
    }
    if (key === "valuationFormula") {
      const formulas: Record<string, string> = {
        路線価: "LAND_ROADSIDE", 路線価方式: "LAND_ROADSIDE", 倍率: "LAND_MULTIPLIER", 倍率方式: "LAND_MULTIPLIER",
        固定資産税評価額: "BUILDING", 固定資産税評価額方式: "BUILDING", 直接入力: "MANUAL",
      };
      return formulas[trimmed] ?? trimmed;
    }
    if (key === "landCategory") {
      const labelWithoutReading = trimmed.replace(/（[^）]*）/g, "");
      const matched = landCategoryOptions.find((option) => option.label === labelWithoutReading);
      return matched?.value ?? trimmed;
    }
    if (key === "buildingType") {
      const labelWithoutReading = trimmed.replace(/（[^）]*）/g, "");
      const matched = buildingTypeOptions.find((option) => option.label === labelWithoutReading);
      return matched?.value ?? trimmed;
    }
    return trimmed;
  }

  function handlePaste(event: ClipboardEvent<HTMLTableSectionElement>) {
    const input = event.target as HTMLInputElement;
    const rowId = Number(input.dataset.rowId);
    const startKey = input.dataset.columnKey as BulkField | undefined;
    const text = event.clipboardData.getData("text/plain");
    if (!rowId || !startKey || (!text.includes("\t") && !text.includes("\n"))) return;
    event.preventDefault();
    const pastedRows = text.replace(/\r/g, "").trimEnd().split("\n").map((line) => line.split("\t"));
    setRows((currentRows) => {
      const startRowIndex = currentRows.findIndex((row) => row.id === rowId);
      const startColumnIndex = columns.findIndex((column) => column.key === startKey);
      const nextRows = [...currentRows];
      while (mode === "add" && nextRows.length < startRowIndex + pastedRows.length) nextRows.push(createBulkRow(Math.max(0, ...nextRows.map((row) => row.id)) + 1));
      pastedRows.forEach((cells, rowOffset) => {
        const original = nextRows[startRowIndex + rowOffset];
        if (!original) return;
        const next = { ...original, error: "", errorFields: [] };
        cells.forEach((cell, columnOffset) => {
          const column = columns[startColumnIndex + columnOffset];
          if (!column) return;
          next[column.key] = column.numeric ? formatCommaNumberInput(cell, ["quantity", "landArea", "floorArea"].includes(column.key) ? 6 : 2) : normalizedPastedValue(column.key, cell);
        });
        nextRows[startRowIndex + rowOffset] = next;
      });
      return nextRows;
    });
  }

  async function submitBulk() {
    setFormError("");
    const activeRows = mode === "edit" ? rows : rows.filter((row) => row.name.trim() || row.address.trim() || row.quantity || row.fixedAssetTaxValue || row.roadsideValue || row.originalAmount);
    if (activeRows.length === 0) {
      setFormError(mode === "edit" ? "この種類には一括編集できる登録済み明細がありません。" : "登録する明細を1行以上入力してください。");
      return;
    }
    let invalid = false;
    const checkedRows = rows.map((row) => {
      if (!activeRows.includes(row)) return { ...row, error: "", errorFields: [] };
      const requiredFields = requiredFieldsForRow(row);
      const columnLabels = new Map(columns.map((column) => [column.key, column.label]));
      const missingFields = requiredFields.filter((field) => !row[field].trim());
      const missing = missingFields.map((field) => columnLabels.get(field) ?? field);
      const number = (value: string) => Number(value.replace(/,/g, "")) || 0;
      const numericFields = new Set(columns.filter((column) => column.numeric).map((column) => column.key));
      const invalidNumberFields = requiredFields.filter((field) => numericFields.has(field) && row[field].trim() && number(row[field]) <= 0);
      if (invalidNumberFields.length > 0) {
        invalid = true;
        return { ...row, error: "必須の数値は0より大きい値で入力してください。", errorFields: [...missingFields, ...invalidNumberFields] };
      }
      if (missing.length > 0) {
        invalid = true;
        return { ...row, error: `${missing.join("・")}を入力してください。`, errorFields: missingFields };
      }
      return { ...row, error: "", errorFields: [] };
    });
    setRows(checkedRows);
    if (invalid) {
      setFormError("入力エラーのある行を確認してください。");
      return;
    }
    const numberOrNull = (value: string) => value ? Number(value.replace(/,/g, "")) : null;
    const thousandYenOrNull = (value: string) => {
      const amount = numberOrNull(value);
      return amount === null ? null : amount * 1000;
    };
    const payloads = activeRows.map((row) => {
      const rowFormula = row.valuationFormula as ValuationFormula;
      const data = {
        side: "ASSET",
        category: isStock ? entryType : row.category,
        name: row.name.trim(),
        institution: isStock ? row.institution.trim() : "",
        currency: "JPY",
        originalAmount: calculatedRowValue(row),
        fxRate: 1,
        valuationMethod: rowFormula === "STOCK" ? "株数・口数×単価×調整率" : rowFormula === "LAND_ROADSIDE" ? "路線価方式" : rowFormula === "LAND_MULTIPLIER" ? "倍率方式" : rowFormula === "BUILDING" ? "建物・固定資産税評価額方式" : "直接入力",
        valuationFormula: rowFormula,
        valuationQuantity: isStock ? numberOrNull(row.quantity) : null,
        valuationUnitPrice: isStock ? numberOrNull(row.unitPrice) : null,
        adjustmentRate: rowFormula === "MANUAL" ? null : numberOrNull(row.adjustmentRate),
        landArea: isLand ? numberOrNull(row.landArea) : null,
        roadsideValue: rowFormula === "LAND_ROADSIDE" ? (numberOrNull(row.roadsideValue) ?? 0) * 1000 : null,
        fixedAssetTaxValue: isRealEstate ? thousandYenOrNull(row.fixedAssetTaxValue) : null,
        valuationMultiplier: ["LAND_MULTIPLIER", "BUILDING"].includes(rowFormula) ? numberOrNull(row.multiplier) : null,
        ownershipNumerator: isRealEstate ? numberOrNull(row.ownershipNumerator) : null,
        ownershipDenominator: isRealEstate ? numberOrNull(row.ownershipDenominator) : null,
        assetDetails: isStock
          ? entryType === "SECURITIES" ? { securityType: "STOCK" } : { shareClass: row.institution.trim() }
          : {
            propertyType: isLand ? "LAND" : "BUILDING",
            propertyAddress: row.address.trim(),
            ...(isLand ? { landCategory: row.landCategory.trim() } : { buildingType: row.buildingType.trim(), buildingStructure: row.buildingStructure.trim(), floorArea: numberOrNull(row.floorArea) }),
          },
        note: row.note.trim(),
      };
      return mode === "edit" ? { id: row.positionId, data } : data;
    });
    await onSubmit(payloads);
  }

  return <div className="modal-layer" role="presentation"><div className="modal bulk-position-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-modal-title">
    <header><div><p className="eyebrow">{mode === "edit" ? "BULK EDIT" : "BULK ENTRY"}</p><h2 id="bulk-modal-title">{mode === "edit" ? "登録済み明細を表で編集" : "表形式で一括追加"}</h2><p>{snapshot.fiscalYear}年度・資産の部</p></div><button className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header>
    <div className="bulk-modal-body">
      <section className="bulk-common-settings" aria-label="共通条件">
        <label>{mode === "edit" ? "編集対象" : "入力対象"}<select value={entryType} onChange={(event) => changeEntryType(event.target.value as BulkEntryType)}>{bulkEntryTypes.map((type) => <option key={type} value={type}>{bulkEntryTypeLabels[type]}{mode === "edit" ? `（${entryCounts[type]}件）` : ""}</option>)}</select></label>
        <div className="bulk-help"><Table2 /><span>{isRealEstate ? "面積・固定資産税評価額は任意入力でき、評価方式にかかわらず基本情報として保存されます。金額は千円単位です。" : mode === "edit" ? "登録済み明細を種類ごとに表示します。表示中の行をまとめて保存できます。" : "Excelの複数セルをコピーし、表の開始セルへ貼り付けられます。"}</span></div>
      </section>
      {formError ? <p className="bulk-form-error" role="alert"><AlertTriangle />{formError}</p> : null}
      {mode === "edit" && rows.length === 0 ? <div className="bulk-empty-state"><Table2 /><strong>{bulkEntryTypeLabels[entryType]}の登録済み明細はありません</strong><span>別の編集対象を選択してください。</span></div> : <div className="bulk-table-scroll">
        <table className="bulk-entry-table">
          <thead><tr><th className="bulk-row-number">行</th>{columns.map((column) => <th key={column.key} style={{ width: column.width }}><span>{column.label}</span>{column.required ? <em>必須</em> : column.conditional ? <em className="conditional">方式別</em> : null}</th>)}<th className="bulk-calculated-value">評価額</th><th className="bulk-row-actions">{mode === "edit" ? "状態" : "操作"}</th></tr></thead>
          <tbody onPaste={handlePaste}>{rows.map((row, rowIndex) => <tr key={row.id} className={row.error ? "has-error" : ""}>
            <th scope="row" className="bulk-row-number">{rowIndex + 1}{row.error ? <span className="sr-only">入力エラー</span> : null}</th>
            {columns.map((column) => {
              const disabled = fieldIsDisabled(row, column.key);
              const commonProps = {
                value: row[column.key],
                "data-row-id": row.id,
                "data-column-key": column.key,
                "aria-label": `${rowIndex + 1}行目 ${column.label}`,
                "aria-invalid": row.errorFields.includes(column.key),
              };
              return <td key={column.key} className={disabled ? "is-disabled" : ""}>
                {column.kind === "category" ? <select {...commonProps} onChange={(event) => updateRow(row.id, column.key, event.target.value)}><option value="HOME_REAL_ESTATE">自宅</option><option value="REAL_ESTATE">収益不動産</option><option value="IDLE_REAL_ESTATE">遊休不動産</option></select>
                  : column.kind === "formula" ? <select {...commonProps} title={row.valuationFormula === "STOCK" ? "株数・口数から計算" : row.valuationFormula === "LAND_ROADSIDE" ? "路線価方式" : row.valuationFormula === "MANUAL" ? "直接入力" : "倍率方式"} onChange={(event) => updateRow(row.id, column.key, event.target.value)}>{isStock ? <option value="STOCK">算</option> : isLand ? <><option value="LAND_ROADSIDE">路</option><option value="LAND_MULTIPLIER">倍</option></> : <option value="BUILDING">倍</option>}<option value="MANUAL">直</option></select>
                    : column.kind === "landCategory" ? <><select {...commonProps} title={landCategoryByValue.get(row.landCategory as typeof landCategoryOptions[number]["value"])?.definition ?? "地目を選択"} aria-describedby={row.landCategory ? `bulk-land-category-${row.id}` : undefined} onChange={(event) => updateRow(row.id, column.key, event.target.value)}><option value="">未選択</option>{landCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{row.landCategory ? <span id={`bulk-land-category-${row.id}`} className="sr-only">{landCategoryByValue.get(row.landCategory as typeof landCategoryOptions[number]["value"])?.definition}</span> : null}</>
                      : column.kind === "buildingType" ? <><select {...commonProps} title={buildingTypeByValue.get(row.buildingType as typeof buildingTypeOptions[number]["value"])?.definition ?? "建物種類を選択"} aria-describedby={row.buildingType ? `bulk-building-type-${row.id}` : undefined} onChange={(event) => updateRow(row.id, column.key, event.target.value)}><option value="">未選択</option>{buildingTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{row.buildingType ? <span id={`bulk-building-type-${row.id}`} className="sr-only">{buildingTypeByValue.get(row.buildingType as typeof buildingTypeOptions[number]["value"])?.definition}</span> : null}</>
                    : <input {...commonProps} type="text" inputMode={column.numeric ? "decimal" : undefined} disabled={disabled} onChange={(event) => updateRow(row.id, column.key, event.target.value, column.numeric)} />}
              </td>;
            })}
            <td className="bulk-calculated-value"><strong>{compactYen(calculatedRowValue(row))}</strong>{row.error ? <small>{row.error}</small> : null}</td>
            <td className="bulk-row-actions">{mode === "edit" ? <span className="bulk-existing-badge"><CircleCheck />登録済</span> : <><button type="button" className="icon-button" aria-label={`${rowIndex + 1}行目を複製`} title="行を複製" onClick={() => addRow(row.id, row)}><Copy /></button><button type="button" className="icon-button danger" aria-label={`${rowIndex + 1}行目を削除`} title="行を削除" onClick={() => removeRow(row.id)}><Trash2 /></button></>}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      {mode === "add" ? <button type="button" className="button secondary bulk-add-row" onClick={() => addRow()}><Plus />空の行を追加</button> : null}
      <footer><span>{mode === "edit" ? `${rows.length}件を編集中` : `${rows.filter((row) => row.name.trim()).length}件入力中`}</span><div><button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button><button type="button" className="button primary" onClick={() => void submitBulk()} disabled={saving || rows.length === 0}>{saving ? <LoaderCircle className="spin" /> : mode === "edit" ? <CircleCheck /> : <Table2 />}{mode === "edit" ? "まとめて保存" : "まとめて登録"}</button></div></footer>
    </div>
  </div></div>;
}

function PositionModal({ position, onClose, onSubmit, saving }: { position: Position | null; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean }) {
  const assetDetails = position?.assetDetails ?? {};
  const [fallbackOwnershipNumerator, fallbackOwnershipDenominator] = decimalToFraction(position?.ownershipShare ?? null);
  const [section, setSection] = useState<PositionSection>(position ? positionSection(position) : "ASSET");
  const [category, setCategory] = useState(position?.category ?? "DEPOSIT");
  const [currency, setCurrency] = useState(position?.currency ?? "JPY");
  const [formula, setFormula] = useState<ValuationFormula>(position?.valuationFormula ?? "MANUAL");
  const [quantity, setQuantity] = useState(position?.valuationQuantity === null || position?.valuationQuantity === undefined ? "" : String(position.valuationQuantity));
  const [unitPrice, setUnitPrice] = useState(position?.valuationUnitPrice === null || position?.valuationUnitPrice === undefined ? "" : String(position.valuationUnitPrice));
  const [adjustmentRate, setAdjustmentRate] = useState(position?.adjustmentRate === null || position?.adjustmentRate === undefined ? "1.0" : String(position.adjustmentRate));
  const [landArea, setLandArea] = useState(position?.landArea === null || position?.landArea === undefined ? "" : String(position.landArea));
  const [roadsideValue, setRoadsideValue] = useState(position?.roadsideValue === null || position?.roadsideValue === undefined ? "" : String(position.roadsideValue));
  const [fixedAssetTaxValue, setFixedAssetTaxValue] = useState(position?.fixedAssetTaxValue === null || position?.fixedAssetTaxValue === undefined ? "" : String(position.fixedAssetTaxValue));
  const [valuationMultiplier, setValuationMultiplier] = useState(position?.valuationMultiplier === null || position?.valuationMultiplier === undefined ? "" : String(position.valuationMultiplier));
  const [ownershipNumerator, setOwnershipNumerator] = useState(String(position?.ownershipNumerator ?? fallbackOwnershipNumerator));
  const [ownershipDenominator, setOwnershipDenominator] = useState(String(position?.ownershipDenominator ?? fallbackOwnershipDenominator));
  const [fxRate, setFxRate] = useState(String(position?.fxRate ?? 1));
  const [propertyType, setPropertyType] = useState(assetDetails.propertyType ?? (position?.valuationFormula === "BUILDING" ? "BUILDING" : "LAND"));

  function changeSection(nextSection: PositionSection) {
    setSection(nextSection);
    setCategory(nextSection === "ASSET" ? "DEPOSIT" : nextSection === "LIABILITY" ? "LOAN_OTHER" : "GUARANTEE");
    setFormula("MANUAL");
  }

  function changeCategory(nextCategory: string) {
    setCategory(nextCategory);
    if (["SECURITIES", "PRIVATE_SHARES"].includes(nextCategory)) setFormula("STOCK");
    else if (["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"].includes(nextCategory)) {
      setPropertyType("LAND");
      setFormula("LAND_ROADSIDE");
    }
    else setFormula("MANUAL");
  }

  function changePropertyType(nextPropertyType: string) {
    setPropertyType(nextPropertyType);
    setFormula(nextPropertyType === "BUILDING" ? "BUILDING" : "LAND_ROADSIDE");
  }

  const isEditing = position !== null;
  const categories = section === "ASSET" ? assetCategories : section === "LIABILITY" ? liabilityCategories : ["GUARANTEE"];
  const isStockCategory = ["SECURITIES", "PRIVATE_SHARES"].includes(category);
  const isRealEstateCategory = ["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"].includes(category);
  const nameLabel = category === "SECURITIES" ? "銘柄名" : category === "PRIVATE_SHARES" ? "会社名" : category === "LOAN_RECEIVABLE" ? "貸付金名" : category === "INSURANCE" ? "保険契約名" : category === "COLLECTIBLES" ? "資産名" : "名称";
  const institutionLabel = category === "DEPOSIT" ? "金融機関" : category === "SECURITIES" ? "証券会社・金融機関" : category === "INSURANCE" ? "保険会社" : section === "ASSET" ? null : "金融機関・債権者";
  const amountLabel = category === "DEPOSIT" ? "残高" : category === "INSURANCE" ? "解約返戻金" : category === "LOAN_RECEIVABLE" ? "貸付金残高" : "通貨建て金額";
  const numericValue = (value: string) => Number(value) || 0;
  const ownershipDisplay = `${ownershipNumerator || "—"} / ${ownershipDenominator || "—"}`;
  const ownershipRatio = numericValue(ownershipDenominator) > 0 ? numericValue(ownershipNumerator) / numericValue(ownershipDenominator) : 0;
  let calculatedAmount = 0;
  if (formula === "STOCK") calculatedAmount = numericValue(quantity) * numericValue(unitPrice) * numericValue(adjustmentRate);
  if (formula === "LAND_ROADSIDE") calculatedAmount = numericValue(landArea) * numericValue(roadsideValue) * numericValue(adjustmentRate) * ownershipRatio;
  if (formula === "LAND_MULTIPLIER" || formula === "BUILDING") calculatedAmount = numericValue(fixedAssetTaxValue) * numericValue(valuationMultiplier) * numericValue(adjustmentRate) * ownershipRatio;
  calculatedAmount = Math.round(calculatedAmount * 100) / 100;
  const isCalculated = formula !== "MANUAL";
  const calculatedJpy = Math.round(calculatedAmount * numericValue(fxRate));
  const formulaLabel = formula === "STOCK" ? "株数・口数×単価×調整率" : formula === "LAND_ROADSIDE" ? "土地・路線価方式" : formula === "LAND_MULTIPLIER" ? "土地・倍率方式" : formula === "BUILDING" ? "建物・固定資産税評価額方式" : "手動入力";
  const formulaExpression = formula === "STOCK" ? "株数・口数 × 単価 × 調整率" : formula === "LAND_ROADSIDE" ? "面積 × 路線価 × 調整率 × 持分（分子 ÷ 分母）" : formula === "LAND_MULTIPLIER" || formula === "BUILDING" ? "固定資産税評価額 × 倍率 × 調整率 × 持分（分子 ÷ 分母）" : "";

  return <div className="modal-layer" role="presentation"><div className="modal position-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <header><div><p className="eyebrow">{isEditing ? "EDIT POSITION" : "NEW POSITION"}</p><h2 id="modal-title">{isEditing ? "明細を修正" : "明細を追加"}</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose}><X /></button></header>
    <form onSubmit={onSubmit}>
      <input type="hidden" name="side" value={section === "ASSET" ? "ASSET" : "LIABILITY"} />
      <fieldset className="classification-fieldset"><legend>登録する区分</legend><div className="segment three-segment"><label><input type="radio" name="entrySection" value="ASSET" checked={section === "ASSET"} onChange={() => changeSection("ASSET")} /><span>資産の部</span></label><label><input type="radio" name="entrySection" value="LIABILITY" checked={section === "LIABILITY"} onChange={() => changeSection("LIABILITY")} /><span>負債の部</span></label><label><input type="radio" name="entrySection" value="CONTINGENT" checked={section === "CONTINGENT"} onChange={() => changeSection("CONTINGENT")} /><span>偶発債務の部</span></label></div></fieldset>
      {section === "ASSET" ? <p className="personal-owner-note"><ShieldCheck />オーナー本人が直接所有する個人資産を登録します。</p> : null}
      {section === "CONTINGENT" ? <p className="contingent-form-note"><AlertTriangle />偶発債務はB/S外として登録し、純資産の計算には含めません。</p> : null}
      <div className="form-grid">
        <label>科目<select name="category" value={category} onChange={(event) => changeCategory(event.target.value)} required>{categories.map((key) => <option key={key} value={key}>{categoryLabels[key]}</option>)}</select></label>
        <label>{nameLabel}<input name="name" required placeholder={category === "SECURITIES" ? "例：○○株式会社" : category === "PRIVATE_SHARES" ? "例：山田産業株式会社" : ""} defaultValue={position?.name ?? ""} /></label>
        {institutionLabel ? <label>{institutionLabel}<input name="institution" defaultValue={position?.institution ?? ""} /></label> : <input type="hidden" name="institution" value="" />}
        <label>通貨<select name="currency" value={currency} onChange={(event) => setCurrency(event.target.value)}><option>JPY</option><option>USD</option><option>EUR</option><option>GBP</option><option>AUD</option><option>CHF</option></select></label>
        {section === "ASSET" ? <AssetSpecificFields
          category={category}
          details={assetDetails}
          propertyType={propertyType}
          formula={formula}
          onPropertyTypeChange={changePropertyType}
          landArea={landArea}
          onLandAreaChange={setLandArea}
          fixedAssetTaxValue={fixedAssetTaxValue}
          onFixedAssetTaxValueChange={setFixedAssetTaxValue}
          ownershipNumerator={ownershipNumerator}
          ownershipDenominator={ownershipDenominator}
          onOwnershipNumeratorChange={setOwnershipNumerator}
          onOwnershipDenominatorChange={setOwnershipDenominator}
        /> : null}
        {isStockCategory || isRealEstateCategory ? <fieldset className="valuation-formula-fieldset full"><legend>評価額の計算方法</legend><select name="valuationFormula" aria-label="評価額の計算方法" value={formula} onChange={(event) => setFormula(event.target.value as ValuationFormula)}><option value="MANUAL">金額を直接入力</option>{isStockCategory ? <option value="STOCK">株数・口数から計算</option> : null}{isRealEstateCategory && propertyType === "LAND" ? <><option value="LAND_ROADSIDE">路線価方式</option><option value="LAND_MULTIPLIER">倍率方式</option></> : null}{isRealEstateCategory && propertyType === "BUILDING" ? <option value="BUILDING">固定資産税評価額方式</option> : null}</select>{formulaExpression ? <p className="valuation-formula-expression">{formulaExpression}</p> : null}
          {formula === "STOCK" ? <div className="valuation-calculation-grid stock-formula"><label>株数・口数<CommaNumberInput name="valuationQuantity" defaultValue="" value={quantity} onValueChange={setQuantity} maxFractionDigits={6} placeholder="例：10,000" positive /></label><span aria-hidden="true">×</span><label>単価<CommaNumberInput name="valuationUnitPrice" defaultValue="" value={unitPrice} onValueChange={setUnitPrice} maxFractionDigits={2} placeholder="例：2,500" positive /></label><span aria-hidden="true">×</span><label>調整率<CommaNumberInput name="adjustmentRate" defaultValue="" value={adjustmentRate} onValueChange={setAdjustmentRate} maxFractionDigits={2} placeholder="例：1.0" positive /></label></div> : null}
          {formula === "LAND_ROADSIDE" ? <><div className="valuation-source-summary"><span>基本情報から使用</span><dl><div><dt>面積</dt><dd>{landArea ? `${valuationNumber.format(numericValue(landArea))}㎡` : "未入力"}</dd></div><div><dt>持分</dt><dd>{ownershipDisplay}</dd></div></dl></div><div className="valuation-calculation-grid real-estate-method-inputs"><label>路線価（円/㎡）<CommaNumberInput name="roadsideValue" defaultValue="" value={roadsideValue} onValueChange={setRoadsideValue} maxFractionDigits={2} placeholder="" positive /></label><span aria-hidden="true">×</span><label>調整率<CommaNumberInput name="adjustmentRate" defaultValue="" value={adjustmentRate} onValueChange={setAdjustmentRate} maxFractionDigits={2} placeholder="" positive /></label></div></> : null}
          {formula === "LAND_MULTIPLIER" || formula === "BUILDING" ? <><div className="valuation-source-summary"><span>基本情報から使用</span><dl><div><dt>固定資産税評価額</dt><dd>{fixedAssetTaxValue ? yen.format(numericValue(fixedAssetTaxValue)) : "未入力"}</dd></div><div><dt>持分</dt><dd>{ownershipDisplay}</dd></div></dl></div><div className="valuation-calculation-grid real-estate-method-inputs"><label>倍率<CommaNumberInput name="valuationMultiplier" defaultValue="" value={valuationMultiplier} onValueChange={setValuationMultiplier} maxFractionDigits={6} placeholder="" positive /></label><span aria-hidden="true">×</span><label>調整率<CommaNumberInput name="adjustmentRate" defaultValue="" value={adjustmentRate} onValueChange={setAdjustmentRate} maxFractionDigits={2} placeholder="" positive /></label></div></> : null}
          {isCalculated ? <div className="valuation-result" aria-live="polite"><span>算式による評価額</span><strong>{calculatedAmount.toLocaleString("ja-JP", { maximumFractionDigits: 2 })} {currency}</strong><small>円換算見込 {yen.format(calculatedJpy)}</small></div> : null}
        </fieldset> : <input type="hidden" name="valuationFormula" value="MANUAL" />}
        <label>{amountLabel}<CommaNumberInput key={formula} name="originalAmount" defaultValue={isCalculated ? "" : position?.originalAmount ?? ""} value={isCalculated ? String(calculatedAmount) : undefined} maxFractionDigits={2} placeholder="" readOnly={isCalculated} hint={isCalculated ? "上の算式から自動計算されます" : undefined} /></label>
        <label>円換算レート<CommaNumberInput name="fxRate" defaultValue={position?.fxRate ?? 1} value={fxRate} onValueChange={setFxRate} maxFractionDigits={6} placeholder="例：150.25" positive /></label>
        {isCalculated ? <input type="hidden" name="valuationMethod" value={formulaLabel} /> : <label>評価方法<input name="valuationMethod" defaultValue={position?.valuationMethod ?? "手動入力"} /></label>}
        <label className="full">メモ<textarea name="note" rows={3} placeholder="評価日、根拠資料など" defaultValue={position?.note ?? ""} /></label>
      </div>
      <footer><button type="button" className="button secondary" onClick={onClose}>キャンセル</button><button type="submit" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : isEditing ? <Pencil /> : <Plus />}{isEditing ? "保存する" : "登録する"}</button></footer>
    </form>
  </div></div>;
}

function DeletePositionModal({ position, onClose, onDelete, saving }: { position: Position; onClose: () => void; onDelete: () => void; saving: boolean }) {
  return <div className="modal-layer" role="presentation"><div className="modal delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-modal-title" aria-describedby="delete-modal-description"><header><div><p className="eyebrow danger-eyebrow">DELETE POSITION</p><h2 id="delete-modal-title">この明細を削除しますか？</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header><div className="delete-modal-body"><div className="delete-warning-icon"><AlertTriangle /></div><p id="delete-modal-description">削除すると、選択年度のB/Sから取り除かれます。この操作は取り消せません。</p><dl><div><dt>名称</dt><dd>{position.name}</dd></div><div><dt>区分</dt><dd>{positionSectionLabels[positionSection(position)]}・{middleClassification(position)}</dd></div><div><dt>円換算時価</dt><dd>{yen.format(position.valueJpy)}</dd></div></dl><footer><button type="button" className="button secondary" onClick={onClose} disabled={saving}>キャンセル</button><button type="button" className="button danger-button" onClick={onDelete} disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Trash2 />}削除する</button></footer></div></div></div>;
}

function DeleteSnapshotModal({ snapshot, snapshotCount, onClose, onSubmit, saving }: {
  snapshot: Snapshot;
  snapshotCount: number;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}) {
  const [confirmation, setConfirmation] = useState("");
  const canDelete = snapshotCount > 1;
  const confirmationMatches = confirmation === String(snapshot.fiscalYear);
  const values = trendValues(snapshot);
  const assetCount = snapshot.positions.filter((position) => position.side === "ASSET").length;
  const liabilityCount = snapshot.positions.filter((position) => position.side === "LIABILITY").length;

  return <div className="modal-layer" role="presentation"><div className="modal delete-modal snapshot-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="snapshot-delete-title" aria-describedby="snapshot-delete-description">
    <header><div><p className="eyebrow danger-eyebrow">DELETE FISCAL YEAR</p><h2 id="snapshot-delete-title">{canDelete ? `${snapshot.fiscalYear}年度を削除しますか？` : "この年度は削除できません"}</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose} disabled={saving}><X /></button></header>
    <form onSubmit={onSubmit}>
      <div className="snapshot-delete-warning"><AlertTriangle /><div><strong>{canDelete ? "年度内のデータがすべて削除されます" : "少なくとも1年度の登録が必要です"}</strong><p id="snapshot-delete-description">{canDelete ? "資産・負債明細と年度別の税金を一括削除します。この操作は取り消せません。" : "先に別の年度を作成してから、もう一度削除してください。"}</p></div></div>
      <dl className="snapshot-delete-summary"><div><dt>対象年度</dt><dd>{fiscalYearLabel(snapshot)}{snapshot.isCurrent ? "（現在）" : ""}</dd></div><div><dt>登録明細</dt><dd>資産 {assetCount}件・負債等 {liabilityCount}件</dd></div><div><dt>資産合計</dt><dd>{compactYen(values.assets)}</dd></div><div><dt>負債合計</dt><dd>{compactYen(values.liabilities)}</dd></div></dl>
      {canDelete ? <label className="snapshot-delete-confirm">確認のため「{snapshot.fiscalYear}」と入力してください<input name="confirmationFiscalYear" inputMode="numeric" autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value.replace(/[^0-9]/g, ""))} aria-describedby="snapshot-delete-confirm-help" disabled={saving} /><small id="snapshot-delete-confirm-help">入力した年度が一致するまで削除ボタンは有効になりません。</small></label> : null}
      <footer><button type="button" className="button secondary" onClick={onClose} disabled={saving}>{canDelete ? "キャンセル" : "閉じる"}</button>{canDelete ? <button type="submit" className="button danger-button" disabled={saving || !confirmationMatches}>{saving ? <LoaderCircle className="spin" /> : <Trash2 />}年度データを削除</button> : null}</footer>
    </form>
  </div></div>;
}

function SnapshotTaxModal({ snapshot, onClose, onSubmit, saving }: { snapshot: Snapshot; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean }) {
  return <div className="modal-layer" role="presentation"><div className="modal snapshot-tax-modal" role="dialog" aria-modal="true" aria-labelledby="snapshot-tax-title"><header><div><p className="eyebrow">TAX EDIT</p><h2 id="snapshot-tax-title">{fiscalYearLabel(snapshot)}の税金を修正</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose}><X /></button></header><form onSubmit={onSubmit}><p className="form-intro">選択年度の税額だけを修正します。</p><div className="form-grid"><label>相続税<input name="estimatedInheritanceTax" type="number" min="0" step="1" defaultValue={snapshot.estimatedInheritanceTax} required /></label><label>その他税金<input name="otherTaxes" type="number" min="0" step="1" defaultValue={snapshot.otherTaxes} required /></label></div><footer><button type="button" className="button secondary" onClick={onClose}>キャンセル</button><button type="submit" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Pencil />}保存する</button></footer></form></div></div>;
}

function ForecastModal({ planning, onClose, onSubmit, saving }: { planning: Portfolio["planning"]; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean }) {
  const [hasSpouse, setHasSpouse] = useState(planning.hasSpouse);
  const [heirRank, setHeirRank] = useState<Portfolio["planning"]["heirRank"]>(planning.heirRank);

  function changeSpouse(nextHasSpouse: boolean) {
    setHasSpouse(nextHasSpouse);
    if (!nextHasSpouse && heirRank === "none") setHeirRank("rank1");
  }

  return <div className="modal-layer" role="presentation"><div className="modal forecast-modal" role="dialog" aria-modal="true" aria-labelledby="forecast-modal-title"><header><div><p className="eyebrow">INHERITANCE TAX</p><h2 id="forecast-modal-title">相続税計算の家族情報</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose}><X /></button></header><form onSubmit={onSubmit}><p className="form-intro">概算に必要な最小限の情報です。法定相続分で計算し、代襲相続などの詳細は計算画面で調整できます。</p><div className="family-form-grid"><label>配偶者<select name="hasSpouse" value={String(hasSpouse)} onChange={(event) => changeSpouse(event.target.value === "true")}><option value="false">なし</option><option value="true">あり</option></select></label><label>配偶者以外の相続人<select name="heirRank" value={heirRank} onChange={(event) => setHeirRank(event.target.value as Portfolio["planning"]["heirRank"])}><option value="rank1">子</option><option value="rank2">親・祖父母</option><option value="rank3">兄弟姉妹</option><option value="none" disabled={!hasSpouse}>なし</option></select></label>{heirRank !== "none" ? <label>人数<input name="heirCount" type="number" min="1" max="20" step="1" defaultValue={Math.max(1, planning.heirCount)} required /></label> : <input type="hidden" name="heirCount" value="0" />}</div><details className="advanced-forecast"><summary>金額を手動調整</summary><div className="form-grid"><label>想定相続税<input name="estimatedInheritanceTax" type="number" min="0" step="1" defaultValue={planning.estimatedInheritanceTax} required /></label><label>その他税金<input name="otherTaxes" type="number" min="0" step="1" defaultValue={planning.otherTaxes} required /></label><label>承継関連費用<input name="successionCosts" type="number" min="0" step="1" defaultValue={planning.successionCosts} required /></label></div></details>{planning.inheritanceTaxUpdatedAt ? <p className="sync-status">前回の税額連携：{new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(planning.inheritanceTaxUpdatedAt))}</p> : null}<footer><button type="button" className="button secondary" onClick={onClose}>キャンセル</button><button type="submit" name="action" value="save" className="button secondary" disabled={saving}>保存のみ</button><button type="submit" name="action" value="calculate" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Link2 />}保存して相続税を計算</button></footer></form></div></div>;
}
