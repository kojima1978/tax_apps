import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const current = await prisma.snapshot.findFirst({ where: { isCurrent: true }, include: { positions: true } });
  if (!current) return NextResponse.json({ error: "現在のB/Sがありません。" }, { status: 404 });

  const today = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.snapshot.update({
      where: { id: current.id },
      data: { isCurrent: false, label: `${current.asOfDate.toISOString().slice(0, 10)} 時点` },
    });
    await tx.snapshot.create({
      data: {
        householdId: current.householdId,
        label: "現在",
        asOfDate: today,
        isCurrent: true,
        positions: {
          create: current.positions.map(({ id: _id, snapshotId: _snapshotId, createdAt: _createdAt, updatedAt: _updatedAt, ...position }) => position),
        },
      },
    });
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
