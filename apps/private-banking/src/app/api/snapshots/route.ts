import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const duplicateYearMessage = (fiscalYear: number) =>
  `${fiscalYear}年度はすでに登録されています。同一年度には1件だけ登録できます。`;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { sourceSnapshotId?: unknown; fiscalYear?: unknown; creationMode?: unknown } | null;
  const sourceSnapshotId = Number(body?.sourceSnapshotId);
  const fiscalYear = Number(body?.fiscalYear);
  const creationMode = body?.creationMode === undefined ? "COPY" : body.creationMode;

  if (!Number.isInteger(sourceSnapshotId) || !Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 2200 || !["COPY", "BLANK"].includes(String(creationMode))) {
    return NextResponse.json({ error: "作成方法と作成年度を正しく指定してください。" }, { status: 400 });
  }

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
          asOfDate: new Date(Date.UTC(fiscalYear, 11, 31)),
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
