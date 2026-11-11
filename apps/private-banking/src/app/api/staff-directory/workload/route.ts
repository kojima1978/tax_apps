import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildWorkload } from "@/lib/staff-directory/workload";

// 社員台帳が読む「社員ごとの担当件数」。読むだけ（担当の書き換えはしない）。
// 返すのは台帳ID と件数と顧客一覧へのリンクだけで、氏名・顧客名は返さない
export async function GET() {
  const households = await prisma.household.findMany({
    where: { staff: { staffDirectoryId: { not: null } } },
    select: { staff: { select: { id: true, staffDirectoryId: true } } },
  });
  return NextResponse.json(buildWorkload(households), { headers: { "Cache-Control": "no-store" } });
}
