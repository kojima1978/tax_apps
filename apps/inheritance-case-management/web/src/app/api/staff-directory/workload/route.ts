import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildWorkload } from '@/lib/staff-directory/workload';

// 社員台帳が読む「社員ごとの担当件数」。読むだけ（担当の書き換えはしない）。
// 返すのは台帳ID と件数と一覧へのリンクだけで、氏名・案件名は返さない
export async function GET() {
  const linked = { staffDirectoryId: { not: null } };
  const cases = await prisma.inheritanceCase.findMany({
    where: { OR: [{ assignee: linked }, { internalReferrer: linked }] },
    select: {
      status: true,
      assignee: { select: { id: true, staffDirectoryId: true } },
      internalReferrer: { select: { id: true, staffDirectoryId: true } },
    },
  });
  return NextResponse.json(buildWorkload(cases), { headers: { 'Cache-Control': 'no-store' } });
}
