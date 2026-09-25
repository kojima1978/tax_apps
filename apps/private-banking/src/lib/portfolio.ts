import { Prisma, type Position as PositionRecord } from "@prisma/client";
import { familyComposition, type AcquisitionReason, type Relationship } from "@/lib/family";
import { parseFxRates } from "@/lib/fx-rates";
import { parseInheritanceTaxCalculation } from "@/lib/inheritance-tax-calculation";
import type { AssetDetails, Position, ValuationFormula } from "@/lib/portfolio-view";
import { prisma } from "@/lib/prisma";

const toNumber = (value: Prisma.Decimal) => Number(value.toString());
const toOptionalNumber = (value: Prisma.Decimal | null) => value === null ? null : toNumber(value);

/**
 * DB の明細を画面・API で扱う形（Decimal は number、日時は文字列）へ直す。
 * 顧客1件のポートフォリオと不動産一覧の両方がこの変換を通るので、
 * 片方だけ Decimal のままになって金額の計算が文字列連結になる事故を防ぐ。
 */
export function toPositionView(position: PositionRecord): Position & { snapshotId: number; sortOrder: number; createdAt: string; updatedAt: string } {
  return {
    ...position,
    side: position.side as Position["side"],
    valuationFormula: position.valuationFormula as ValuationFormula,
    assetDetails: (position.assetDetails ?? null) as AssetDetails | null,
    originalAmount: toNumber(position.originalAmount),
    fxRate: toNumber(position.fxRate),
    valueJpy: toNumber(position.valueJpy),
    valuationQuantity: toOptionalNumber(position.valuationQuantity),
    valuationUnitPrice: toOptionalNumber(position.valuationUnitPrice),
    adjustmentRate: toOptionalNumber(position.adjustmentRate),
    landArea: toOptionalNumber(position.landArea),
    roadsideValue: toOptionalNumber(position.roadsideValue),
    fixedAssetTaxValue: toOptionalNumber(position.fixedAssetTaxValue),
    valuationMultiplier: toOptionalNumber(position.valuationMultiplier),
    ownershipShare: toOptionalNumber(position.ownershipShare),
    createdAt: position.createdAt.toISOString(),
    updatedAt: position.updatedAt.toISOString(),
  };
}

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
  const familyMembers = await prisma.familyMember.findMany({
    where: { householdId: household.id },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  // 家族構成は親族関係タブの明細を唯一の真実の源とする。
  // 明細が1件でもあれば明細から導出し、明細が空のときだけ household に保存した簡易入力値を使う。
  const composition = familyMembers.length > 0
    ? familyComposition(familyMembers.map((member) => ({
      relationship: member.relationship as Relationship,
      acquisitionReason: member.acquisitionReason as AcquisitionReason,
    })))
    : { hasSpouse: household.hasSpouse, heirRank: household.heirRank as "none" | "rank1" | "rank2" | "rank3", heirCount: household.heirCount };

  return {
    household: {
      id: household.id,
      clientCode: household.clientCode,
      name: household.name,
      nameKana: household.nameKana,
      birthDate: household.birthDate?.toISOString().slice(0, 10) ?? null,
      assignedStaff: household.assignedStaff,
      currency: household.currency,
    },
    planning: {
      estimatedInheritanceTax: toNumber(household.estimatedInheritanceTax),
      otherTaxes: toNumber(household.otherTaxes),
      successionCosts: toNumber(household.successionCosts),
      inheritanceTaxUpdatedAt: household.inheritanceTaxUpdatedAt?.toISOString() ?? null,
      hasSpouse: composition.hasSpouse,
      heirRank: composition.heirRank,
      heirCount: composition.heirCount,
    },
    familyMembers: familyMembers.map((member) => ({
      id: member.id,
      name: member.name,
      nameKana: member.nameKana,
      relationship: member.relationship,
      acquisitionReason: member.acquisitionReason,
      civilShareNumerator: member.civilShareNumerator,
      civilShareDenominator: member.civilShareDenominator,
      taxShareNumerator: member.taxShareNumerator,
      taxShareDenominator: member.taxShareDenominator,
      specialTaxAddition: member.specialTaxAddition,
      disabilityCategory: member.disabilityCategory,
      birthDate: member.birthDate?.toISOString().slice(0, 10) ?? null,
      note: member.note,
      sortOrder: member.sortOrder,
    })),
    snapshots: snapshots.map((snapshot) => ({
      id: snapshot.id,
      label: snapshot.label,
      asOfDate: snapshot.asOfDate.toISOString().slice(0, 10),
      fiscalYear: snapshot.fiscalYear,
      isCurrent: snapshot.isCurrent,
      estimatedInheritanceTax: toNumber(snapshot.estimatedInheritanceTax),
      inheritanceTaxCalculation: parseInheritanceTaxCalculation(snapshot.inheritanceTaxCalculation),
      otherTaxes: toNumber(snapshot.otherTaxes),
      fxRates: parseFxRates(snapshot.fxRates),
      updatedAt: snapshot.updatedAt.toISOString(),
      positions: snapshot.positions.map(toPositionView),
    })),
  };
}
