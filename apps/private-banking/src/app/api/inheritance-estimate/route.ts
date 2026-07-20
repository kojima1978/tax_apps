import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const booleanField = z.union([z.boolean(), z.enum(["true", "false"])]).transform((value) => value === true || value === "true");

const estimateSchema = z.object({
  householdId: z.coerce.number().int().positive(),
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

  const data: Prisma.HouseholdUpdateInput = {};
  const snapshotData: Prisma.SnapshotUpdateManyMutationInput = {};
  if (parsed.data.estimatedInheritanceTax !== undefined) {
    const estimatedInheritanceTax = new Prisma.Decimal(Math.round(parsed.data.estimatedInheritanceTax));
    data.estimatedInheritanceTax = estimatedInheritanceTax;
    snapshotData.estimatedInheritanceTax = estimatedInheritanceTax;
    data.inheritanceTaxUpdatedAt = new Date();
  }
  if (parsed.data.otherTaxes !== undefined) {
    const otherTaxes = new Prisma.Decimal(Math.round(parsed.data.otherTaxes));
    data.otherTaxes = otherTaxes;
    snapshotData.otherTaxes = otherTaxes;
  }
  if (parsed.data.successionCosts !== undefined) {
    data.successionCosts = new Prisma.Decimal(Math.round(parsed.data.successionCosts));
  }
  if (parsed.data.hasSpouse !== undefined) data.hasSpouse = parsed.data.hasSpouse;
  if (parsed.data.heirRank !== undefined) data.heirRank = parsed.data.heirRank;
  if (parsed.data.heirCount !== undefined) data.heirCount = parsed.data.heirCount;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedHousehold = await tx.household.update({ where: { id: household.id }, data });
    if (Object.keys(snapshotData).length > 0) {
      await tx.snapshot.updateMany({ where: { householdId: household.id, isCurrent: true }, data: snapshotData });
    }
    return updatedHousehold;
  });
  return NextResponse.json({
    estimatedInheritanceTax: Number(updated.estimatedInheritanceTax.toString()),
    otherTaxes: Number(updated.otherTaxes.toString()),
    successionCosts: Number(updated.successionCosts.toString()),
    inheritanceTaxUpdatedAt: updated.inheritanceTaxUpdatedAt?.toISOString() ?? null,
    hasSpouse: updated.hasSpouse,
    heirRank: updated.heirRank,
    heirCount: updated.heirCount,
  });
}
