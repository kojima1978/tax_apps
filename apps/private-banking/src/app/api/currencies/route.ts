import { NextResponse } from "next/server";
import { appCurrencySchema, standardCurrencies } from "@/lib/app-currencies";
import { positionCurrencies } from "@/lib/fx-rates";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return NextResponse.json([...standardCurrencies, ...await prisma.appCurrency.findMany({ orderBy: { code: "asc" }, select: { code: true, name: true } })]);
}
export async function POST(request: Request) {
  const parsed = appCurrencySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  if (positionCurrencies.includes(parsed.data.code)) return NextResponse.json({ error: "標準通貨として登録済みです。" }, { status: 409 });
  try {
    return NextResponse.json(await prisma.appCurrency.create({ data: parsed.data }), { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return NextResponse.json({ error: "この通貨は登録済みです。" }, { status: 409 });
    throw error;
  }
}
