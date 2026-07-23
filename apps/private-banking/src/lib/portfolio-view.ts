import { decimalToFraction, valuationNumber } from "@/lib/format";

/** 画面側で扱うポートフォリオの型。API (`/api/portfolio`) のレスポンスと対応する。 */
export type Position = {
  id: number; side: "ASSET" | "LIABILITY"; category: string; name: string; institution: string;
  currency: string; originalAmount: number; fxRate: number; valueJpy: number; liquidity: string;
  includedInNetWorth: boolean; valuationMethod: string; valuationFormula: ValuationFormula;
  valuationQuantity: number | null; valuationUnitPrice: number | null; adjustmentRate: number | null;
  landArea: number | null; roadsideValue: number | null; fixedAssetTaxValue: number | null; valuationMultiplier: number | null; ownershipShare: number | null;
  ownershipNumerator: number | null; ownershipDenominator: number | null;
  assetDetails: AssetDetails | null;
  note: string;
};
export type AssetDetails = {
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
export type Snapshot = {
  id: number; label: string; asOfDate: string; fiscalYear: number; isCurrent: boolean;
  estimatedInheritanceTax: number; otherTaxes: number; updatedAt: string; positions: Position[];
};
export type PositionSection = "ASSET" | "LIABILITY" | "CONTINGENT";
export type PositionSortMode = "manual" | "classification-asc" | "classification-desc";
export type ValuationFormula = "MANUAL" | "STOCK" | "LAND_ROADSIDE" | "LAND_MULTIPLIER" | "BUILDING";
export type Portfolio = {
  household: { id: number; clientCode: string; name: string; nameKana: string; assignedStaff: string; currency: string };
  planning: {
    estimatedInheritanceTax: number; otherTaxes: number; successionCosts: number; inheritanceTaxUpdatedAt: string | null;
    hasSpouse: boolean; heirRank: "none" | "rank1" | "rank2" | "rank3"; heirCount: number;
  };
  snapshots: Snapshot[];
};
/** サイドバーのメニュー key。そのまま URL の `/customers/<id>/<key>` になる。 */
export type Section = "balance" | "positions" | "history" | "backup";
export type BulkPositionPayload = Record<string, unknown>;
export type BulkModalMode = "add" | "edit";
export type BalanceScenario = "without-tax" | "with-tax";
export type PrintSection = "balance" | "details" | "history";

export const categoryLabels: Record<string, string> = {
  DEPOSIT: "預金・現金", SECURITIES: "有価証券", HOME_REAL_ESTATE: "自宅", REAL_ESTATE: "収益不動産", IDLE_REAL_ESTATE: "遊休不動産",
  PRIVATE_SHARES: "自社株", BUSINESS_ASSETS: "事業用資産", LOAN_RECEIVABLE: "貸付金", INSURANCE: "生命保険", COLLECTIBLES: "その他資産",
  LOAN_HOME: "住宅ローン", LOAN_INVESTMENT_PROPERTY: "不動産投資ローン", LOAN_SECURITIES: "証券担保ローン",
  LOAN_BUSINESS: "事業用借入", LOAN_OTHER: "その他借入金", LOAN: "その他借入金", GUARANTEE: "個人保証",
};
export const landCategoryOptions = [
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
export const landCategoryByValue = new Map(landCategoryOptions.map((option) => [option.value, option]));
export const buildingTypeOptions = [
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
export const buildingTypeByValue = new Map(buildingTypeOptions.map((option) => [option.value, option]));
export const assetCategories = ["DEPOSIT", "SECURITIES", "HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE", "PRIVATE_SHARES", "BUSINESS_ASSETS", "LOAN_RECEIVABLE", "INSURANCE", "COLLECTIBLES"];
export const liabilityCategories = ["LOAN_HOME", "LOAN_INVESTMENT_PROPERTY", "LOAN_SECURITIES", "LOAN_BUSINESS", "LOAN_OTHER"];

export const fiscalYearLabel = (snapshot: Pick<Snapshot, "fiscalYear">) => `${snapshot.fiscalYear}年度`;

export function positionSection(position: Position): PositionSection {
  if (position.side === "ASSET") return "ASSET";
  return position.includedInNetWorth ? "LIABILITY" : "CONTINGENT";
}

export const positionSectionLabels: Record<PositionSection, string> = {
  ASSET: "資産の部",
  LIABILITY: "負債の部",
  CONTINGENT: "偶発債務の部（B/S外）",
};

export function middleClassification(position: Position) {
  if (["DEPOSIT", "SECURITIES", "INSURANCE"].includes(position.category)) return "金融資産";
  if (["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"].includes(position.category)) return "不動産";
  if (["PRIVATE_SHARES", "BUSINESS_ASSETS", "LOAN_RECEIVABLE"].includes(position.category)) return "事業用資産";
  if (position.category === "COLLECTIBLES") return "その他資産";
  if (position.category === "GUARANTEE") return "個人保証";
  return "借入金";
}

export function institutionOrPropertyAddress(position: Position) {
  const isRealEstate = ["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"].includes(position.category);
  return isRealEstate ? position.assetDetails?.propertyAddress?.trim() ?? "" : position.institution.trim();
}

export function valuationBreakdown(position: Position) {
  const number = (value: number | null) => valuationNumber.format(value ?? 0);
  const [fallbackNumerator, fallbackDenominator] = decimalToFraction(position.ownershipShare);
  const ownership = `${valuationNumber.format(position.ownershipNumerator ?? fallbackNumerator)}/${valuationNumber.format(position.ownershipDenominator ?? fallbackDenominator)}`;
  if (position.valuationFormula === "STOCK") return `${number(position.valuationQuantity)}株・口 × ${number(position.valuationUnitPrice)} × ${number(position.adjustmentRate)}`;
  if (position.valuationFormula === "LAND_ROADSIDE") return `${number(position.landArea)}㎡ × ${number(position.roadsideValue)}円/㎡ × ${number(position.adjustmentRate)} × 持分${ownership}`;
  if (position.valuationFormula === "LAND_MULTIPLIER" || position.valuationFormula === "BUILDING") return `${number(position.fixedAssetTaxValue)}円 × ${number(position.valuationMultiplier)} × ${number(position.adjustmentRate)} × 持分${ownership}`;
  return "";
}

const middleClassificationOrder = ["金融資産", "不動産", "事業用資産", "その他資産", "借入金", "個人保証"];
export const middleClassificationRank = new Map(middleClassificationOrder.map((classification, index) => [classification, index]));

export function totals(positions: Position[]) {
  let assets = 0, liabilities = 0, guarantees = 0;
  for (const p of positions) {
    if (p.side === "ASSET") {
      assets += p.valueJpy;
    } else if (p.includedInNetWorth) liabilities += p.valueJpy;
    else guarantees += p.valueJpy;
  }
  return { assets, liabilities, guarantees, netWorth: assets - liabilities };
}

export type TrendValues = ReturnType<typeof trendValues>;

export function trendValues(snapshot: Snapshot) {
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

export type TrendGroup = "financial" | "realEstate" | "business" | "taxes" | "borrowings";
export type TrendRow = { label: string; key: keyof TrendValues; tone?: "section" | "total" | "net" | "outside"; group?: TrendGroup; child?: boolean };

export const trendRows: TrendRow[] = [
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

export const trendChildRows: Record<TrendGroup, TrendRow[]> = {
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
