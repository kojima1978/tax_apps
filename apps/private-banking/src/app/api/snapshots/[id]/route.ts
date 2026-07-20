import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const snapshotTaxSchema = z.object({
  estimatedInheritanceTax: z.coerce.number().finite().min(0),
  otherTaxes: z.coerce.number().finite().min(0),
});

const snapshotDeleteSchema = z.object({
  confirmationFiscalYear: z.coerce.number().int().min(1900).max(2200),
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const snapshotId = Number(id);
  const parsed = snapshotTaxSchema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(snapshotId) || !parsed.success) {
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  const snapshot = await prisma.snapshot.findUnique({ where: { id: snapshotId } });
  if (!snapshot) return NextResponse.json({ error: "対象年度が見つかりません。" }, { status: 404 });

  const estimatedInheritanceTax = new Prisma.Decimal(Math.round(parsed.data.estimatedInheritanceTax));
  const otherTaxes = new Prisma.Decimal(Math.round(parsed.data.otherTaxes));
  await prisma.$transaction(async (tx) => {
    await tx.snapshot.update({ where: { id: snapshot.id }, data: { estimatedInheritanceTax, otherTaxes } });
    if (snapshot.isCurrent) {
      await tx.household.update({
        where: { id: snapshot.householdId },
        data: { estimatedInheritanceTax, otherTaxes, inheritanceTaxUpdatedAt: new Date() },
      });
    }
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const snapshotId = Number(id);
  const parsed = snapshotDeleteSchema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(snapshotId) || !parsed.success) {
    return NextResponse.json({ error: "確認用の年度を正しく入力してください。" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const snapshot = await tx.snapshot.findUnique({ where: { id: snapshotId } });
    if (!snapshot) return { status: 404, error: "対象年度が見つかりません。" } as const;
    if (snapshot.fiscalYear !== parsed.data.confirmationFiscalYear) {
      return { status: 400, error: "入力した年度が削除対象と一致しません。" } as const;
    }

    const snapshotCount = await tx.snapshot.count({ where: { householdId: snapshot.householdId } });
    if (snapshotCount <= 1) {
      return { status: 409, error: "唯一の年度は削除できません。先に別の年度を作成してください。" } as const;
    }

    await tx.snapshot.delete({ where: { id: snapshot.id } });

    let promotedFiscalYear: number | null = null;
    if (snapshot.isCurrent) {
      const replacement = await tx.snapshot.findFirst({
        where: { householdId: snapshot.householdId },
        orderBy: [{ fiscalYear: "desc" }, { id: "desc" }],
      });
      if (!replacement) return { status: 409, error: "現在年度を引き継ぐ年度がありません。" } as const;

      await tx.snapshot.update({
        where: { id: replacement.id },
        data: { isCurrent: true, label: "現在" },
      });
      await tx.household.update({
        where: { id: snapshot.householdId },
        data: {
          estimatedInheritanceTax: replacement.estimatedInheritanceTax,
          otherTaxes: replacement.otherTaxes,
          inheritanceTaxUpdatedAt: new Date(),
        },
      });
      promotedFiscalYear = replacement.fiscalYear;
    }

    return { status: 200, fiscalYear: snapshot.fiscalYear, promotedFiscalYear } as const;
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, fiscalYear: result.fiscalYear, promotedFiscalYear: result.promotedFiscalYear });
}
