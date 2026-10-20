import { NextResponse } from "next/server";
import { z } from "zod";
import { isCurrencyCode, positionCurrencies } from "@/lib/fx-rates";
import { prisma } from "@/lib/prisma";

const standard = [{ code: "JPY", name: "日本円" }, { code: "USD", name: "米ドル" }, { code: "EUR", name: "ユーロ" }];
const schema = z.object({ code: z.string().trim().toUpperCase().refine(isCurrencyCode, "有効な通貨コード（例：CAD）を入力してください。"), name: z.string().trim().min(1, "通貨名を入力してください。").max(100) });
export async function GET() {
  return NextResponse.json([...standard, ...await prisma.appCurrency.findMany({ orderBy: { code: "asc" }, select: { code: true, name: true } })]);
}
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  if (positionCurrencies.includes(parsed.data.code)) return NextResponse.json({ error: "標準通貨として登録済みです。" }, { status: 409 });
  try {
    return NextResponse.json(await prisma.appCurrency.create({ data: parsed.data }), { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return NextResponse.json({ error: "この通貨は登録済みです。" }, { status: 409 });
    throw error;
  }
}
