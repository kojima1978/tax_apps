import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fxRateFor, missingFxRateMessage, parseFxRates } from "@/lib/fx-rates";
import { prisma } from "@/lib/prisma";
import { isAsOfDateForFiscalYear, parseDateOnlyUtc } from "@/lib/snapshot-date";

const snapshotSettingsSchema = z.object({
  asOfDate: z.string(),
  estimatedInheritanceTax: z.coerce.number().finite().min(0),
  otherTaxes: z.coerce.number().finite().min(0),
  // 通貨→円換算レート。空欄や不正値は parseFxRates が捨てる。
  fxRates: z.unknown().optional(),
});

const snapshotDeleteSchema = z.object({
  confirmationFiscalYear: z.coerce.number().int().min(1900).max(2200),
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const snapshotId = Number(id);
  const parsed = snapshotSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(snapshotId) || !parsed.success) {
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  const snapshot = await prisma.snapshot.findUnique({ where: { id: snapshotId } });
  if (!snapshot) return NextResponse.json({ error: "対象年度が見つかりません。" }, { status: 404 });
  if (!isAsOfDateForFiscalYear(parsed.data.asOfDate, snapshot.fiscalYear)) {
    return NextResponse.json({ error: "B/S基準日は対象年度内の正しい日付を入力してください。" }, { status: 400 });
  }
  const asOfDate = parseDateOnlyUtc(parsed.data.asOfDate);
  if (!asOfDate) return NextResponse.json({ error: "B/S基準日を確認してください。" }, { status: 400 });

  // 円換算レートは年度で持つので、変更したら同じ年度の外貨建て明細を一括で評価し直す。
  const fxRates = parseFxRates(parsed.data.fxRates);
  const foreignPositions = await prisma.position.findMany({
    where: { snapshotId: snapshot.id, currency: { not: "JPY" } },
    select: { id: true, currency: true, originalAmount: true },
  });
  const missingCurrency = foreignPositions.find((position) => fxRateFor(fxRates, position.currency) === null);
  if (missingCurrency) {
    return NextResponse.json({ error: missingFxRateMessage(missingCurrency.currency) }, { status: 400 });
  }

  const estimatedInheritanceTax = new Prisma.Decimal(Math.round(parsed.data.estimatedInheritanceTax));
  const otherTaxes = new Prisma.Decimal(Math.round(parsed.data.otherTaxes));
  await prisma.$transaction(async (tx) => {
    await tx.snapshot.update({
      where: { id: snapshot.id },
      data: { asOfDate, estimatedInheritanceTax, inheritanceTaxCalculation: Prisma.DbNull, otherTaxes, fxRates },
    });
    for (const position of foreignPositions) {
      const fxRate = fxRates[position.currency];
      const valueJpy = Math.round(Number(position.originalAmount.toString()) * fxRate);
      await tx.position.update({
        where: { id: position.id },
        data: { fxRate: new Prisma.Decimal(fxRate), valueJpy: new Prisma.Decimal(valueJpy) },
      });
    }
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
