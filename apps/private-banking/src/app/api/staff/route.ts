import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/** 担当者の一覧が必要とする列。GET・POST・PATCH で同じ形を返す。 */
const staffSelect = { id: true, name: true, nameKana: true, isActive: true } as const;

const staffFieldsSchema = z.object({
  name: z.string().trim().min(1, "担当者名を入力してください。").max(100),
  nameKana: z.string().trim().max(100).optional().default(""),
});

const updateStaffSchema = staffFieldsSchema.extend({
  id: z.coerce.number().int().positive(),
  isActive: z.boolean().optional().default(true),
});

const deleteStaffSchema = z.object({ id: z.coerce.number().int().positive() });

/** 登録揺れを止めるのは name の一意制約なので、衝突はすべてここで同じ文言にする。 */
const duplicateName = () => NextResponse.json({ error: "同じ名前の担当者がすでに登録されています。" }, { status: 409 });
const isPrismaError = (error: unknown, code: string) =>
  typeof error === "object" && error !== null && "code" in error && error.code === code;

export async function GET() {
  const staff = await prisma.staff.findMany({
    select: { ...staffSelect, _count: { select: { households: true } } },
    // 候補の並びはカナ順。カナ未登録は名前で並べる（顧客一覧と同じ考え方）。
    orderBy: [{ nameKana: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(staff.map(({ _count, ...row }) => ({ ...row, clientCount: _count.households })));
}

export async function POST(request: Request) {
  const parsed = staffFieldsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" }, { status: 400 });
  try {
    const created = await prisma.staff.create({ data: parsed.data, select: staffSelect });
    return NextResponse.json({ ...created, clientCount: 0 }, { status: 201 });
  } catch (error) {
    if (isPrismaError(error, "P2002")) return duplicateName();
    throw error;
  }
}

export async function PATCH(request: Request) {
  const parsed = updateStaffSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" }, { status: 400 });
  const { id, ...fields } = parsed.data;
  try {
    const updated = await prisma.staff.update({
      where: { id },
      data: fields,
      select: { ...staffSelect, _count: { select: { households: true } } },
    });
    const { _count, ...staff } = updated;
    return NextResponse.json({ ...staff, clientCount: _count.households });
  } catch (error) {
    if (isPrismaError(error, "P2002")) return duplicateName();
    if (isPrismaError(error, "P2025")) return NextResponse.json({ error: "担当者が見つかりません。" }, { status: 404 });
    throw error;
  }
}

export async function DELETE(request: Request) {
  const parsed = deleteStaffSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "担当者を選び直してください。" }, { status: 400 });
  const result = await prisma.$transaction(async (tx) => {
    const staff = await tx.staff.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, name: true, _count: { select: { households: true } } },
    });
    if (!staff) return { status: 404, error: "担当者が見つかりません。" } as const;
    // 担当している顧客がいる間は消さない。消すと何件分かの担当が黙って消えるため、
    // 「退職」で候補から外す（過去の顧客の表示は残る）か、顧客側の担当者を変えてもらう。
    if (staff._count.households > 0) {
      return { status: 409, error: `${staff.name}は${staff._count.households}件の顧客の担当者です。退職にするか、その顧客の担当者を変えてから削除してください。` } as const;
    }
    await tx.staff.delete({ where: { id: staff.id } });
    return { status: 200, name: staff.name } as const;
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, name: result.name });
}
