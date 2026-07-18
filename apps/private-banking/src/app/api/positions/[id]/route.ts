import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const position = await prisma.position.findUnique({ where: { id: Number(id) }, include: { snapshot: true } });
  if (!position || !position.snapshot.isCurrent) {
    return NextResponse.json({ error: "削除対象が見つかりません。" }, { status: 404 });
  }
  await prisma.position.delete({ where: { id: position.id } });
  return new NextResponse(null, { status: 204 });
}
