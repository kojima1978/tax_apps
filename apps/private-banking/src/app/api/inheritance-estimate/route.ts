import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const booleanField = z.union([z.boolean(), z.enum(["true", "false"])]).transform((value) => value === true || value === "true");

const estimateSchema = z.object({
  householdId: z.coerce.number().int().positive(),
  // 税金・費用は年度（Snapshot）が持つ。省略されたら現在年度を対象にする。
  snapshotId: z.coerce.number().int().positive().optional(),
  estimatedInheritanceTax: z.coerce.number().finite().min(0).optional(),
  otherTaxes: z.coerce.number().finite().min(0).optional(),
  successionCosts: z.coerce.number().finite().min(0).optional(),
  hasSpouse: booleanField.optional(),
  heirRank: z.enum(["none", "rank1", "rank2", "rank3"]).optional(),
  heirCount: z.coerce.number().int().min(0).max(20).optional(),
}).refine((value) => value.estimatedInheritanceTax !== undefined || value.otherTaxes !== undefined || value.successionCosts !== undefined, {
  message: "更新する予測値を指定してください。",
});

export async function PUT(request: Request) {
  const parsed = estimateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const household = await prisma.household.findUnique({ where: { id: parsed.data.householdId }, select: { id: true } });
  if (!household) return NextResponse.json({ error: "管理対象がありません。" }, { status: 404 });

  // 年度の指定はその顧客のものに限る（ほかの顧客の年度を書き換えられないようにする）。
  const snapshot = await prisma.snapshot.findFirst({
    where: parsed.data.snapshotId === undefined
      ? { householdId: household.id, isCurrent: true }
      : { id: parsed.data.snapshotId, householdId: household.id },
    select: { id: true },
  });
  if (!snapshot) return NextResponse.json({ error: "対象年度が見つかりません。" }, { status: 404 });

  const snapshotData: Prisma.SnapshotUpdateInput = {};
  const householdData: Prisma.HouseholdUpdateInput = {};
  if (parsed.data.estimatedInheritanceTax !== undefined) {
    snapshotData.estimatedInheritanceTax = new Prisma.Decimal(Math.round(parsed.data.estimatedInheritanceTax));
    // 手で入れ直した額なので、計算結果の内訳は残さない。
    snapshotData.inheritanceTaxCalculation = Prisma.DbNull;
    snapshotData.inheritanceTaxUpdatedAt = new Date();
  }
  if (parsed.data.otherTaxes !== undefined) {
    snapshotData.otherTaxes = new Prisma.Decimal(Math.round(parsed.data.otherTaxes));
  }
  if (parsed.data.successionCosts !== undefined) {
    snapshotData.successionCosts = new Prisma.Decimal(Math.round(parsed.data.successionCosts));
  }
  // 家族構成は親族関係タブの明細を唯一の真実の源とする。明細が1件でもあれば、
  // 簡易入力（hasSpouse/heirRank/heirCount）は受け付けず明細から導出した値を優先する。
  const familyMemberCount = await prisma.familyMember.count({ where: { householdId: household.id } });
  if (familyMemberCount === 0) {
    if (parsed.data.hasSpouse !== undefined) householdData.hasSpouse = parsed.data.hasSpouse;
    if (parsed.data.heirRank !== undefined) householdData.heirRank = parsed.data.heirRank;
    if (parsed.data.heirCount !== undefined) householdData.heirCount = parsed.data.heirCount;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedSnapshot = await tx.snapshot.update({ where: { id: snapshot.id }, data: snapshotData });
    const updatedHousehold = Object.keys(householdData).length > 0
      ? await tx.household.update({ where: { id: household.id }, data: householdData })
      : await tx.household.findUniqueOrThrow({ where: { id: household.id } });
    return { snapshot: updatedSnapshot, household: updatedHousehold };
  });
  return NextResponse.json({
    snapshotId: updated.snapshot.id,
    estimatedInheritanceTax: Number(updated.snapshot.estimatedInheritanceTax.toString()),
    otherTaxes: Number(updated.snapshot.otherTaxes.toString()),
    successionCosts: Number(updated.snapshot.successionCosts.toString()),
    inheritanceTaxUpdatedAt: updated.snapshot.inheritanceTaxUpdatedAt?.toISOString() ?? null,
    hasSpouse: updated.household.hasSpouse,
    heirRank: updated.household.heirRank,
    heirCount: updated.household.heirCount,
  });
}
