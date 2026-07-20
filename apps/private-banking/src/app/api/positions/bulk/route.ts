import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  calculatedOriginalAmount,
  calculatedOwnershipShare,
  liquidityForCategory,
  normalizedValuationMethod,
  positionInputSchema,
} from "@/lib/position-input";

const bulkEntryCategories = new Set(["SECURITIES", "PRIVATE_SHARES", "HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"]);

const bulkPositionInputSchema = z.object({
  snapshotId: z.coerce.number().int().positive(),
  positions: z.array(positionInputSchema).min(1).max(100),
}).superRefine((data, context) => {
  data.positions.forEach((position, index) => {
    if (position.side !== "ASSET") context.addIssue({ code: z.ZodIssueCode.custom, path: ["positions", index, "side"], message: "一括入力は資産の部のみ利用できます。" });
    if (!bulkEntryCategories.has(position.category)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["positions", index, "category"], message: "一括入力の対象外科目です。" });
  });
});

const bulkPositionUpdateSchema = z.object({
  snapshotId: z.coerce.number().int().positive(),
  positions: z.array(z.object({ id: z.coerce.number().int().positive(), data: positionInputSchema })).min(1).max(100),
}).superRefine((data, context) => {
  const ids = new Set<number>();
  data.positions.forEach((position, index) => {
    if (ids.has(position.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["positions", index, "id"], message: "同じ明細が重複しています。" });
    ids.add(position.id);
    if (position.data.side !== "ASSET") context.addIssue({ code: z.ZodIssueCode.custom, path: ["positions", index, "data", "side"], message: "一括修正は資産の部のみ利用できます。" });
    if (!bulkEntryCategories.has(position.data.category)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["positions", index, "data", "category"], message: "一括修正の対象外科目です。" });
  });
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bulkPositionInputSchema.safeParse(body);
  if (!parsed.success) {
    const rowIssue = parsed.error.issues.find((issue) => issue.path[0] === "positions" && typeof issue.path[1] === "number");
    const rowNumber = typeof rowIssue?.path[1] === "number" ? rowIssue.path[1] + 1 : null;
    return NextResponse.json(
      { error: rowNumber ? `${rowNumber}行目の入力内容を確認してください。` : "一括入力の内容を確認してください。" },
      { status: 400 },
    );
  }

  const snapshot = await prisma.snapshot.findUnique({ where: { id: parsed.data.snapshotId } });
  if (!snapshot) return NextResponse.json({ error: "対象年度のB/Sがありません。" }, { status: 404 });

  const ids = await prisma.$transaction(async (tx) => {
    const lastPosition = await tx.position.findFirst({
      where: { snapshotId: snapshot.id, side: "ASSET" },
      orderBy: [{ sortOrder: "desc" }, { id: "desc" }],
      select: { sortOrder: true },
    });
    let sortOrder = (lastPosition?.sortOrder ?? -1) + 1;
    const createdIds: number[] = [];
    for (const data of parsed.data.positions) {
      const originalAmount = calculatedOriginalAmount(data);
      const valueJpy = Math.round(originalAmount * data.fxRate);
      const created = await tx.position.create({
        data: {
          ...data,
          ownershipShare: calculatedOwnershipShare(data),
          valuationMethod: normalizedValuationMethod(data),
          liquidity: liquidityForCategory(data.category),
          snapshotId: snapshot.id,
          originalAmount: new Prisma.Decimal(originalAmount),
          fxRate: new Prisma.Decimal(data.fxRate),
          valueJpy: new Prisma.Decimal(valueJpy),
          includedInNetWorth: data.category !== "GUARANTEE",
          sortOrder,
        },
        select: { id: true },
      });
      createdIds.push(created.id);
      sortOrder += 1;
    }
    await tx.snapshot.update({ where: { id: snapshot.id }, data: { updatedAt: new Date() } });
    return createdIds;
  });

  return NextResponse.json({ ids, count: ids.length }, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bulkPositionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const rowIssue = parsed.error.issues.find((issue) => issue.path[0] === "positions" && typeof issue.path[1] === "number");
    const rowNumber = typeof rowIssue?.path[1] === "number" ? rowIssue.path[1] + 1 : null;
    return NextResponse.json(
      { error: rowNumber ? `${rowNumber}行目の入力内容を確認してください。` : "一括修正の内容を確認してください。" },
      { status: 400 },
    );
  }

  const snapshot = await prisma.snapshot.findUnique({ where: { id: parsed.data.snapshotId }, select: { id: true } });
  if (!snapshot) return NextResponse.json({ error: "対象年度のB/Sがありません。" }, { status: 404 });

  const requestedIds = parsed.data.positions.map((position) => position.id);
  const registeredPositions = await prisma.position.findMany({
    where: { id: { in: requestedIds }, snapshotId: snapshot.id },
    select: { id: true },
  });
  if (registeredPositions.length !== requestedIds.length) {
    return NextResponse.json({ error: "対象年度に存在しない明細が含まれています。画面を更新してください。" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    for (const position of parsed.data.positions) {
      const data = position.data;
      const originalAmount = calculatedOriginalAmount(data);
      const valueJpy = Math.round(originalAmount * data.fxRate);
      await tx.position.update({
        where: { id: position.id },
        data: {
          ...data,
          ownershipShare: calculatedOwnershipShare(data),
          valuationMethod: normalizedValuationMethod(data),
          liquidity: liquidityForCategory(data.category),
          originalAmount: new Prisma.Decimal(originalAmount),
          fxRate: new Prisma.Decimal(data.fxRate),
          valueJpy: new Prisma.Decimal(valueJpy),
          includedInNetWorth: data.category !== "GUARANTEE",
        },
      });
    }
    await tx.snapshot.update({ where: { id: snapshot.id }, data: { updatedAt: new Date() } });
  });

  return NextResponse.json({ ids: requestedIds, count: requestedIds.length });
}
