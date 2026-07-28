import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { defaultAsOfDate, isAsOfDateForFiscalYear, parseDateOnlyUtc } from "@/lib/snapshot-date";

const duplicateYearMessage = (fiscalYear: number) =>
  `${fiscalYear}年度はすでに登録されています。同一年度には1件だけ登録できます。`;

export async function POST(request: Request) {
  const schema = z.object({
    sourceSnapshotId: z.coerce.number().int().positive(),
    fiscalYear: z.coerce.number().int().min(1900).max(2200),
    creationMode: z.enum(["COPY", "BLANK"]).optional().default("COPY"),
    asOfDate: z.string().optional(),
  }).superRefine((data, context) => {
    const asOfDate = data.asOfDate ?? defaultAsOfDate(data.fiscalYear);
    if (!isAsOfDateForFiscalYear(asOfDate, data.fiscalYear)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["asOfDate"], message: "B/S基準日は作成年度内の正しい日付を入力してください。" });
    }
  });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "作成方法と作成年度を正しく指定してください。" }, { status: 400 });
  }
  const { sourceSnapshotId, fiscalYear, creationMode } = parsed.data;
  const asOfDate = parseDateOnlyUtc(parsed.data.asOfDate ?? defaultAsOfDate(fiscalYear));
  if (!asOfDate) return NextResponse.json({ error: "B/S基準日を確認してください。" }, { status: 400 });

  const source = await prisma.snapshot.findUnique({
    where: { id: sourceSnapshotId },
    include: { positions: true },
  });
  if (!source) {
    return NextResponse.json({ error: "コピー元のB/Sが見つかりません。" }, { status: 404 });
  }

  const existing = await prisma.snapshot.findUnique({
    where: {
      householdId_fiscalYear: {
        householdId: source.householdId,
        fiscalYear,
      },
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: duplicateYearMessage(fiscalYear), existingSnapshotId: existing.id },
      { status: 409 },
    );
  }

  const latest = await prisma.snapshot.findFirst({
    where: { householdId: source.householdId },
    orderBy: { fiscalYear: "desc" },
    select: { fiscalYear: true },
  });
  const becomesCurrent = !latest || fiscalYear > latest.fiscalYear;

  try {
    const created = await prisma.$transaction(async (tx) => {
      if (becomesCurrent) {
        const current = await tx.snapshot.findFirst({
          where: { householdId: source.householdId, isCurrent: true },
          select: { id: true, fiscalYear: true },
        });
        if (current) {
          await tx.snapshot.update({
            where: { id: current.id },
            data: { isCurrent: false, label: `${current.fiscalYear}年度` },
          });
        }
      }

      return tx.snapshot.create({
        data: {
          householdId: source.householdId,
          label: becomesCurrent ? "現在" : `${fiscalYear}年度`,
          asOfDate,
          fiscalYear,
          isCurrent: becomesCurrent,
          estimatedInheritanceTax: creationMode === "COPY" ? source.estimatedInheritanceTax : new Prisma.Decimal(0),
          otherTaxes: creationMode === "COPY" ? source.otherTaxes : new Prisma.Decimal(0),
          ...(creationMode === "COPY" ? { positions: {
            create: source.positions.map(
              // Database identifiers and timestamps are regenerated for the copied fiscal year.
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              ({ id: _id, snapshotId: _snapshotId, createdAt: _createdAt, updatedAt: _updatedAt, assetDetails, ...position }) => ({
                ...position,
                assetDetails: assetDetails === null ? Prisma.DbNull : assetDetails as Prisma.InputJsonValue,
              }),
            ),
          } } : {}),
        },
        select: { id: true, fiscalYear: true, isCurrent: true },
      });
    });

    return NextResponse.json({ ok: true, creationMode, snapshot: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const conflict = await prisma.snapshot.findUnique({
        where: {
          householdId_fiscalYear: {
            householdId: source.householdId,
            fiscalYear,
          },
        },
        select: { id: true },
      });
      return NextResponse.json(
        { error: duplicateYearMessage(fiscalYear), existingSnapshotId: conflict?.id },
        { status: 409 },
      );
    }
    throw error;
  }
}
