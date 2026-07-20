import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const reorderSchema = z.object({
  snapshotId: z.coerce.number().int().positive(),
  section: z.enum(["ASSET", "LIABILITY", "CONTINGENT"]),
  orderedIds: z.array(z.coerce.number().int().positive()).min(1).refine(
    (ids) => new Set(ids).size === ids.length,
    "明細IDが重複しています。",
  ),
});

export async function PUT(request: Request) {
  const parsed = reorderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "並び順の入力内容を確認してください。" }, { status: 400 });
  }

  const { snapshotId, section, orderedIds } = parsed.data;
  const sectionWhere = section === "ASSET"
    ? { side: "ASSET" }
    : { side: "LIABILITY", includedInNetWorth: section === "LIABILITY" };
  const positions = await prisma.position.findMany({
    where: { snapshotId, ...sectionWhere },
    select: { id: true },
  });
  const storedIds = new Set(positions.map((position) => position.id));
  if (storedIds.size !== orderedIds.length || orderedIds.some((id) => !storedIds.has(id))) {
    return NextResponse.json({ error: "対象年度の明細構成が更新されています。画面を再読み込みしてください。" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await Promise.all(orderedIds.map((id, index) => tx.position.update({
      where: { id },
      data: { sortOrder: index },
    })));
    await tx.snapshot.update({ where: { id: snapshotId }, data: { updatedAt: new Date() } });
  });

  return NextResponse.json({ ok: true });
}
