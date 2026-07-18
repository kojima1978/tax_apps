import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const inputSchema = z.object({
  side: z.enum(["ASSET", "LIABILITY"]),
  category: z.enum(["DEPOSIT", "SECURITIES", "REAL_ESTATE", "PRIVATE_SHARES", "INSURANCE", "COLLECTIBLES", "LOAN", "GUARANTEE"]),
  name: z.string().trim().min(1).max(100),
  institution: z.string().trim().max(100).default(""),
  currency: z.string().trim().length(3).default("JPY"),
  originalAmount: z.coerce.number().nonnegative(),
  fxRate: z.coerce.number().positive().default(1),
  liquidity: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  valuationMethod: z.string().trim().max(100).default("手動入力"),
  note: z.string().trim().max(500).default(""),
});

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });

  const current = await prisma.snapshot.findFirst({ where: { isCurrent: true } });
  if (!current) return NextResponse.json({ error: "現在のB/Sがありません。" }, { status: 404 });

  const data = parsed.data;
  const valueJpy = Math.round(data.originalAmount * data.fxRate);
  const position = await prisma.position.create({
    data: {
      ...data,
      snapshotId: current.id,
      originalAmount: new Prisma.Decimal(data.originalAmount),
      fxRate: new Prisma.Decimal(data.fxRate),
      valueJpy: new Prisma.Decimal(valueJpy),
      includedInNetWorth: data.category !== "GUARANTEE",
    },
  });
  return NextResponse.json({ id: position.id }, { status: 201 });
}
