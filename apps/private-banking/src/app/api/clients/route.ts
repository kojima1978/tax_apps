import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const clientFieldsSchema = z.object({
  name: z.string().trim().min(1, "顧客名を入力してください。").max(100),
  nameKana: z.string().trim().max(100).optional().default(""),
  clientCode: z.string().trim().min(1, "顧客コードを入力してください。").max(30).regex(/^[A-Za-z0-9_-]+$/, "顧客コードは半角英数字・ハイフン・アンダースコアで入力してください。"),
  assignedStaff: z.string().trim().max(100).optional().default(""),
});

const createClientSchema = clientFieldsSchema.extend({
  fiscalYear: z.coerce.number().int().min(1900).max(2200),
});

const updateClientSchema = clientFieldsSchema.extend({
  id: z.coerce.number().int().positive(),
});

export async function GET() {
  const clients = await prisma.household.findMany({
    select: {
      id: true,
      clientCode: true,
      name: true,
      nameKana: true,
      assignedStaff: true,
      snapshots: { orderBy: { fiscalYear: "desc" }, take: 1, select: { fiscalYear: true } },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  return NextResponse.json(clients.map(({ snapshots, ...client }) => ({ ...client, latestFiscalYear: snapshots[0]?.fiscalYear ?? null })));
}

export async function POST(request: Request) {
  const parsed = createClientSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" }, { status: 400 });
  try {
    const created = await prisma.household.create({
      data: {
        name: parsed.data.name,
        nameKana: parsed.data.nameKana,
        clientCode: parsed.data.clientCode.toUpperCase(),
        assignedStaff: parsed.data.assignedStaff,
        snapshots: {
          create: {
            label: "現在",
            fiscalYear: parsed.data.fiscalYear,
            asOfDate: new Date(Date.UTC(parsed.data.fiscalYear, 11, 31)),
            isCurrent: true,
          },
        },
      },
      select: { id: true, clientCode: true, name: true, nameKana: true, assignedStaff: true },
    });
    return NextResponse.json({ ...created, latestFiscalYear: parsed.data.fiscalYear }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "この顧客コードはすでに使用されています。" }, { status: 409 });
    }
    throw error;
  }
}

export async function PATCH(request: Request) {
  const parsed = updateClientSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" }, { status: 400 });
  const { id, ...fields } = parsed.data;
  try {
    const updated = await prisma.household.update({
      where: { id },
      data: { ...fields, clientCode: fields.clientCode.toUpperCase() },
      select: { id: true, clientCode: true, name: true, nameKana: true, assignedStaff: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      if (error.code === "P2002") return NextResponse.json({ error: "この顧客コードはすでに使用されています。" }, { status: 409 });
      if (error.code === "P2025") return NextResponse.json({ error: "顧客が見つかりません。" }, { status: 404 });
    }
    throw error;
  }
}
