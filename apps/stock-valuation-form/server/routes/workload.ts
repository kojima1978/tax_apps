// 社員台帳が読む「社員ごとの担当件数」（GET /stock-valuation-form/api/staff-directory/workload）。
// 読むだけ（担当の書き換えはしない）。返すのは台帳ID と件数と一覧へのリンクだけで、会社名・氏名は返さない。
// 案件の担当者は台帳ID をそのまま持つ。進行中＝ゴミ箱に入っていない案件、すべて＝ゴミ箱を含む

import type { PrismaClient } from '@prisma/client';
import { Hono } from 'hono';
import { summarizeWorkload, WORKLOAD_PATH, type WorkloadResponse } from '../shared/staff-workload/workload.js';

export function buildWorkload(cases: { assigneeStaffId: number | null; archivedAt: Date | null }[]): WorkloadResponse {
  return summarizeWorkload(
    [{ key: 'assignee', label: '担当' }],
    'ゴミ箱を除く',
    cases.map((c) => ({ staffDirectoryId: c.assigneeStaffId, role: 'assignee', active: c.archivedAt === null })),
    // 案件一覧の担当者の絞り込み（ゴミ箱の案件は一覧に出ないので、リンク先の件数は進行中と同じ）
    (id) => `/?assignee=staff:${id}`,
  );
}

export function createWorkloadRouter(db: PrismaClient) {
  const router = new Hono();
  router.get(WORKLOAD_PATH, async (c) => {
    const cases = await db.valuationCase.findMany({
      where: { assigneeStaffId: { not: null } },
      select: { assigneeStaffId: true, archivedAt: true },
    });
    c.header('Cache-Control', 'no-store');
    return c.json(buildWorkload(cases));
  });
  return router;
}
