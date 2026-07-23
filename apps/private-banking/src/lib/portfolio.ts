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

const toNumber = (value: Prisma.Decimal) => Number(value.toString());

export async function getPortfolio(householdId?: number) {
  // 顧客は画面から作成する。ここでテストデータを自動生成すると、
  // 顧客を全件削除したあとにテスト顧客が復活してしまう。
  const household = householdId === undefined
    ? await prisma.household.findFirst({ orderBy: { id: "asc" } })
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
