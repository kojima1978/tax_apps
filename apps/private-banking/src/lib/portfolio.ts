import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const CATEGORY_LABELS: Record<string, string> = {
  DEPOSIT: "預金・現金",
  SECURITIES: "有価証券",
  HOME_REAL_ESTATE: "自宅",
  REAL_ESTATE: "収益不動産",
  IDLE_REAL_ESTATE: "遊休不動産",
  PRIVATE_SHARES: "自社株",
  BUSINESS_ASSETS: "事業用資産",
  LOAN_RECEIVABLE: "貸付金",
  INSURANCE: "生命保険",
  COLLECTIBLES: "その他資産",
  LOAN_HOME: "住宅ローン",
  LOAN_INVESTMENT_PROPERTY: "不動産投資ローン",
  LOAN_SECURITIES: "証券担保ローン",
  LOAN_BUSINESS: "事業用借入",
  LOAN_OTHER: "その他借入金",
  LOAN: "その他借入金",
  GUARANTEE: "個人保証",
};

type TestPositionDefinition = {
  side: "ASSET" | "LIABILITY";
  category: string;
  name: string;
  amount: number;
  institution?: string;
  currency?: string;
  fxRate?: number;
  valueJpy?: number;
  liquidity: "HIGH" | "MEDIUM" | "LOW";
  includedInNetWorth?: boolean;
  valuationMethod: string;
  valuationFormula?: "MANUAL" | "STOCK" | "LAND_ROADSIDE" | "LAND_MULTIPLIER" | "BUILDING";
  valuationQuantity?: number;
  valuationUnitPrice?: number;
  adjustmentRate?: number;
  landArea?: number;
  roadsideValue?: number;
  fixedAssetTaxValue?: number;
  valuationMultiplier?: number;
  ownershipNumerator?: number;
  ownershipDenominator?: number;
  assetDetails?: Record<string, string | number>;
  note?: string;
};

const currentTestPositions: TestPositionDefinition[] = [
  { side: "ASSET", category: "DEPOSIT", name: "普通預金（生活・納税資金）", institution: "みらい銀行 本店", amount: 80000000, liquidity: "HIGH", valuationMethod: "残高証明", assetDetails: { accountType: "ORDINARY", branchName: "本店", accountSuffix: "1234" } },
  { side: "ASSET", category: "SECURITIES", name: "国内上場株式", institution: "青山証券", amount: 54000000, liquidity: "HIGH", valuationMethod: "株数・口数×単価×調整率", valuationFormula: "STOCK", valuationQuantity: 12000, valuationUnitPrice: 4500, adjustmentRate: 1, assetDetails: { securityType: "STOCK", securityCode: "TEST1", valuationDate: "2026-07-20" } },
  { side: "ASSET", category: "SECURITIES", name: "米国株式ETF", institution: "青山証券", currency: "USD", fxRate: 150, amount: 200000, valueJpy: 30000000, liquidity: "HIGH", valuationMethod: "株数・口数×単価×調整率", valuationFormula: "STOCK", valuationQuantity: 1000, valuationUnitPrice: 200, adjustmentRate: 1, assetDetails: { securityType: "ETF", securityCode: "TEST-US", valuationDate: "2026-07-20" } },
  { side: "ASSET", category: "INSURANCE", name: "終身保険A", institution: "みらい生命", amount: 35000000, liquidity: "HIGH", valuationMethod: "解約返戻金", assetDetails: { insuranceType: "WHOLE_LIFE", insuredPerson: "佐藤 一郎", beneficiary: "佐藤 花子", deathBenefit: 120000000, valuationDate: "2026-07-20" } },
  { side: "ASSET", category: "INSURANCE", name: "終身保険B", institution: "あおば生命", amount: 15000000, liquidity: "HIGH", valuationMethod: "解約返戻金", assetDetails: { insuranceType: "WHOLE_LIFE", insuredPerson: "佐藤 一郎", beneficiary: "佐藤 花子", deathBenefit: 50000000, valuationDate: "2026-07-20" } },
  { side: "ASSET", category: "HOME_REAL_ESTATE", name: "自宅土地", amount: 86400000, liquidity: "LOW", valuationMethod: "路線価方式", valuationFormula: "LAND_ROADSIDE", landArea: 180, roadsideValue: 600000, adjustmentRate: 0.8, ownershipNumerator: 1, ownershipDenominator: 1, assetDetails: { propertyType: "LAND", propertyAddress: "東京都千代田区丸の内1丁目（テスト）", landCategory: "RESIDENTIAL" } },
  { side: "ASSET", category: "HOME_REAL_ESTATE", name: "自宅建物", amount: 45000000, liquidity: "LOW", valuationMethod: "建物・固定資産税評価額方式", valuationFormula: "BUILDING", fixedAssetTaxValue: 45000000, valuationMultiplier: 1, adjustmentRate: 1, ownershipNumerator: 1, ownershipDenominator: 1, assetDetails: { propertyType: "BUILDING", propertyAddress: "東京都千代田区丸の内1丁目（テスト）", buildingType: "RESIDENCE", buildingStructure: "鉄筋コンクリート造", floorArea: 145.5 } },
  { side: "ASSET", category: "REAL_ESTATE", name: "賃貸マンション土地", amount: 29700000, liquidity: "LOW", valuationMethod: "倍率方式", valuationFormula: "LAND_MULTIPLIER", fixedAssetTaxValue: 60000000, valuationMultiplier: 1.1, adjustmentRate: 0.9, ownershipNumerator: 1, ownershipDenominator: 2, assetDetails: { propertyType: "LAND", propertyAddress: "神奈川県横浜市西区みなとみらい2丁目（テスト）", landCategory: "RESIDENTIAL" } },
  { side: "ASSET", category: "REAL_ESTATE", name: "賃貸マンション建物", amount: 36000000, liquidity: "LOW", valuationMethod: "建物・固定資産税評価額方式", valuationFormula: "BUILDING", fixedAssetTaxValue: 80000000, valuationMultiplier: 1, adjustmentRate: 0.9, ownershipNumerator: 1, ownershipDenominator: 2, assetDetails: { propertyType: "BUILDING", propertyAddress: "神奈川県横浜市西区みなとみらい2丁目（テスト）", buildingType: "APARTMENT", buildingStructure: "鉄筋コンクリート造", floorArea: 420 } },
  { side: "ASSET", category: "IDLE_REAL_ESTATE", name: "遊休地", amount: 25000000, liquidity: "LOW", valuationMethod: "直接入力", valuationFormula: "MANUAL", ownershipNumerator: 1, ownershipDenominator: 1, assetDetails: { propertyType: "LAND", propertyAddress: "長野県軽井沢町（テスト）", landCategory: "FOREST" } },
  { side: "ASSET", category: "PRIVATE_SHARES", name: "テスト産業株式会社", amount: 216000000, liquidity: "LOW", valuationMethod: "株数・口数×単価×調整率", valuationFormula: "STOCK", valuationQuantity: 20000, valuationUnitPrice: 12000, adjustmentRate: 0.9, assetDetails: { shareClass: "普通株式", totalIssuedShares: 100000, valuationApproach: "類似業種比準・純資産" } },
  { side: "ASSET", category: "BUSINESS_ASSETS", name: "個人所有の事業用設備", amount: 30000000, liquidity: "LOW", valuationMethod: "専門業者査定", assetDetails: { businessAssetType: "EQUIPMENT", businessName: "テスト事業", storageLocation: "東京都品川区（テスト）" } },
  { side: "ASSET", category: "LOAN_RECEIVABLE", name: "関係者貸付金", amount: 20000000, liquidity: "MEDIUM", valuationMethod: "契約残高", assetDetails: { borrower: "テスト取引先", loanDate: "2024-04-01", dueDate: "2028-03-31", interestRate: 1.2, collectibility: "NORMAL" } },
  { side: "ASSET", category: "COLLECTIBLES", name: "美術品・貴金属", amount: 18000000, liquidity: "LOW", valuationMethod: "専門業者査定", assetDetails: { otherAssetType: "ART", storageLocation: "貸金庫" } },
  { side: "LIABILITY", category: "LOAN_HOME", name: "自宅住宅ローン", institution: "みらい銀行", amount: 50000000, liquidity: "MEDIUM", valuationMethod: "返済予定表" },
  { side: "LIABILITY", category: "LOAN_INVESTMENT_PROPERTY", name: "賃貸マンションローン", institution: "みらい銀行", amount: 65000000, liquidity: "MEDIUM", valuationMethod: "返済予定表" },
  { side: "LIABILITY", category: "LOAN_SECURITIES", name: "証券担保ローン", institution: "青山証券", amount: 20000000, liquidity: "MEDIUM", valuationMethod: "残高証明" },
  { side: "LIABILITY", category: "LOAN_BUSINESS", name: "個人事業借入", institution: "地方銀行", amount: 35000000, liquidity: "MEDIUM", valuationMethod: "返済予定表" },
  { side: "LIABILITY", category: "LOAN_OTHER", name: "その他借入金", institution: "地方銀行", amount: 10000000, liquidity: "MEDIUM", valuationMethod: "残高証明" },
  { side: "LIABILITY", category: "GUARANTEE", name: "事業会社借入の個人保証", institution: "地方銀行", amount: 150000000, liquidity: "LOW", includedInNetWorth: false, valuationMethod: "保証契約書" },
];

function positionCreateData(position: TestPositionDefinition, sortOrder: number): Prisma.PositionCreateWithoutSnapshotInput {
  const fxRate = position.fxRate ?? 1;
  const valueJpy = position.valueJpy ?? Math.round(position.amount * fxRate);
  return {
    side: position.side,
    category: position.category,
    name: position.name,
    institution: position.institution ?? "",
    currency: position.currency ?? "JPY",
    originalAmount: new Prisma.Decimal(position.amount),
    fxRate: new Prisma.Decimal(fxRate),
    valueJpy: new Prisma.Decimal(valueJpy),
    liquidity: position.liquidity,
    includedInNetWorth: position.includedInNetWorth ?? true,
    valuationMethod: position.valuationMethod,
    valuationFormula: position.valuationFormula ?? "MANUAL",
    valuationQuantity: position.valuationQuantity === undefined ? undefined : new Prisma.Decimal(position.valuationQuantity),
    valuationUnitPrice: position.valuationUnitPrice === undefined ? undefined : new Prisma.Decimal(position.valuationUnitPrice),
    adjustmentRate: position.adjustmentRate === undefined ? undefined : new Prisma.Decimal(position.adjustmentRate),
    landArea: position.landArea === undefined ? undefined : new Prisma.Decimal(position.landArea),
    roadsideValue: position.roadsideValue === undefined ? undefined : new Prisma.Decimal(position.roadsideValue),
    fixedAssetTaxValue: position.fixedAssetTaxValue === undefined ? undefined : new Prisma.Decimal(position.fixedAssetTaxValue),
    valuationMultiplier: position.valuationMultiplier === undefined ? undefined : new Prisma.Decimal(position.valuationMultiplier),
    ownershipNumerator: position.ownershipNumerator,
    ownershipDenominator: position.ownershipDenominator,
    ownershipShare: position.ownershipNumerator && position.ownershipDenominator ? new Prisma.Decimal(position.ownershipNumerator / position.ownershipDenominator) : undefined,
    assetDetails: position.assetDetails,
    note: position.note ?? "テストデータ",
    sortOrder,
  };
}

function historicalPositionData(factor: number, fiscalYear: number) {
  return currentTestPositions.map((position, index) => {
    const scaledAssetDetails = position.assetDetails ? {
      ...position.assetDetails,
      ...(typeof position.assetDetails.deathBenefit === "number" ? { deathBenefit: Math.round(position.assetDetails.deathBenefit * factor) } : {}),
    } : undefined;
    return positionCreateData({
      ...position,
      amount: Math.round(position.amount * factor),
      valueJpy: Math.round((position.valueJpy ?? position.amount * (position.fxRate ?? 1)) * factor),
      valuationMethod: `${fiscalYear}年度末時価`,
      valuationFormula: "MANUAL",
      valuationQuantity: undefined,
      valuationUnitPrice: undefined,
      adjustmentRate: undefined,
      landArea: undefined,
      roadsideValue: undefined,
      fixedAssetTaxValue: undefined,
      valuationMultiplier: undefined,
      assetDetails: scaledAssetDetails,
      note: `${fiscalYear}年度テストデータ`,
    }, index);
  });
}

async function ensurePortfolio() {
  const existing = await prisma.household.findFirst();
  if (existing) return existing;

  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(20260720)`;

    const concurrentExisting = await transaction.household.findFirst();
    if (concurrentExisting) return concurrentExisting;

    return transaction.household.create({
    data: {
      clientCode: "PB-000001",
      name: "佐藤 一郎（テスト）",
      estimatedInheritanceTax: new Prisma.Decimal(90000000),
      otherTaxes: new Prisma.Decimal(5000000),
      successionCosts: new Prisma.Decimal(10000000),
      inheritanceTaxUpdatedAt: new Date("2026-07-20T00:00:00+09:00"),
      hasSpouse: true,
      heirRank: "rank1",
      heirCount: 2,
      snapshots: {
        create: [
          {
            label: "2024年度末",
            asOfDate: new Date("2024-12-31T00:00:00+09:00"),
            fiscalYear: 2024,
            isCurrent: false,
            estimatedInheritanceTax: new Prisma.Decimal(75000000),
            otherTaxes: new Prisma.Decimal(3000000),
            positions: { create: historicalPositionData(0.82, 2024) },
          },
          {
            label: "2025年度末",
            asOfDate: new Date("2025-12-31T00:00:00+09:00"),
            fiscalYear: 2025,
            isCurrent: false,
            estimatedInheritanceTax: new Prisma.Decimal(82000000),
            otherTaxes: new Prisma.Decimal(4000000),
            positions: { create: historicalPositionData(0.91, 2025) },
          },
          {
            label: "現在",
            asOfDate: new Date("2026-07-20T00:00:00+09:00"),
            fiscalYear: 2026,
            isCurrent: true,
            estimatedInheritanceTax: new Prisma.Decimal(90000000),
            otherTaxes: new Prisma.Decimal(5000000),
            positions: { create: currentTestPositions.map(positionCreateData) },
          },
        ],
      },
    },
    });
  });
}

const toNumber = (value: Prisma.Decimal) => Number(value.toString());

export async function getPortfolio(householdId?: number) {
  const defaultHousehold = await ensurePortfolio();
  const household = householdId === undefined
    ? defaultHousehold
    : await prisma.household.findUnique({ where: { id: householdId } });
  if (!household) throw new Error("HOUSEHOLD_NOT_FOUND");
  const snapshots = await prisma.snapshot.findMany({
    where: { householdId: household.id },
    include: { positions: { orderBy: [{ side: "asc" }, { sortOrder: "asc" }] } },
    orderBy: [{ isCurrent: "desc" }, { fiscalYear: "desc" }],
  });

  return {
    household: { id: household.id, clientCode: household.clientCode, name: household.name, nameKana: household.nameKana, assignedStaff: household.assignedStaff, currency: household.currency },
    planning: {
      estimatedInheritanceTax: toNumber(household.estimatedInheritanceTax),
      otherTaxes: toNumber(household.otherTaxes),
      successionCosts: toNumber(household.successionCosts),
      inheritanceTaxUpdatedAt: household.inheritanceTaxUpdatedAt?.toISOString() ?? null,
      hasSpouse: household.hasSpouse,
      heirRank: household.heirRank,
      heirCount: household.heirCount,
    },
    snapshots: snapshots.map((snapshot) => ({
      id: snapshot.id,
      label: snapshot.label,
      asOfDate: snapshot.asOfDate.toISOString().slice(0, 10),
      fiscalYear: snapshot.fiscalYear,
      isCurrent: snapshot.isCurrent,
      estimatedInheritanceTax: toNumber(snapshot.estimatedInheritanceTax),
      otherTaxes: toNumber(snapshot.otherTaxes),
      updatedAt: snapshot.updatedAt.toISOString(),
      positions: snapshot.positions.map((position) => ({
        ...position,
        originalAmount: toNumber(position.originalAmount),
        fxRate: toNumber(position.fxRate),
        valueJpy: toNumber(position.valueJpy),
        valuationQuantity: position.valuationQuantity ? toNumber(position.valuationQuantity) : null,
        valuationUnitPrice: position.valuationUnitPrice ? toNumber(position.valuationUnitPrice) : null,
        adjustmentRate: position.adjustmentRate ? toNumber(position.adjustmentRate) : null,
        landArea: position.landArea ? toNumber(position.landArea) : null,
        roadsideValue: position.roadsideValue ? toNumber(position.roadsideValue) : null,
        fixedAssetTaxValue: position.fixedAssetTaxValue ? toNumber(position.fixedAssetTaxValue) : null,
        valuationMultiplier: position.valuationMultiplier ? toNumber(position.valuationMultiplier) : null,
        ownershipShare: position.ownershipShare ? toNumber(position.ownershipShare) : null,
        ownershipNumerator: position.ownershipNumerator,
        ownershipDenominator: position.ownershipDenominator,
        createdAt: position.createdAt.toISOString(),
        updatedAt: position.updatedAt.toISOString(),
      })),
    })),
  };
}
