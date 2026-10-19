import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const householdId = Number(new URL(request.url).searchParams.get("householdId"));
  if (!Number.isSafeInteger(householdId) || householdId <= 0) return NextResponse.json({ error: "顧客を指定してください。" }, { status: 400 });
  const rows = await prisma.staffAssignment.findMany({
    where: { householdId }, orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    select: { id: true, staffCode: true, staffName: true, startedAt: true, endedAt: true },
  });
  return NextResponse.json(rows);
}
