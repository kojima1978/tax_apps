import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const householdId = Number(new URL(request.url).searchParams.get("householdId"));
  if (!Number.isInteger(householdId) || householdId <= 0) return NextResponse.json({ error: "顧客IDが正しくありません。" }, { status: 400 });
  const logs = await prisma.activityLog.findMany({ where: { householdId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 200 });
  return NextResponse.json(logs.map((log) => ({ ...log, createdAt: log.createdAt.toISOString() })));
}
