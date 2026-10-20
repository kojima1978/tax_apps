import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncStaffDirectory } from "@/lib/staff-directory/sync";

/** 担当者の一覧が必要とする列。 */
const staffSelect = { id: true, staffCode: true, name: true, nameKana: true, department: true, isActive: true, staffDirectoryId: true } as const;

/**
 * 担当者は社員台帳（staff-directory）の写し。一覧を返す前に、期限が来ていれば台帳から写し直す
 * （台帳が落ちていれば3秒で諦めて写しのまま返す）。追加・修正・退職は台帳で行う。
 */
export async function GET() {
  await syncStaffDirectory();
  const staff = await prisma.staff.findMany({
    select: { ...staffSelect, _count: { select: { households: true } } },
    // 候補の並びはカナ順。カナ未登録は名前で並べる（顧客一覧と同じ考え方）。
    orderBy: [{ nameKana: "asc" }, { name: "asc" }, { staffCode: "asc" }],
  });
  return NextResponse.json(staff.map(({ _count, ...row }) => ({ ...row, clientCount: _count.households })));
}

const readOnly = () => NextResponse.json(
  { error: "担当者の追加・修正・退職は社員台帳で行ってください。" },
  { status: 405, headers: { Allow: "GET" } },
);

export const POST = readOnly;
export const PATCH = readOnly;
export const DELETE = readOnly;
