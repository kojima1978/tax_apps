// 社員台帳が読む「社員ごとの担当件数」（GET /bank-analyzer/api/staff-directory/workload）。
// 読むだけ（担当の書き換えはしない）。返すのは台帳ID と件数と一覧へのリンクだけで、案件名・氏名は返さない。
// 案件の担当者は台帳ID をそのまま持つ。案件には終わり・ゴミ箱が無いので、進行中＝すべて

import { Hono } from 'hono';
import type { PrismaClient } from '@prisma/client';
import { summarizeWorkload, WORKLOAD_PATH } from '../shared/staff-workload/workload.js';

export function workloadRouter(db: PrismaClient) {
  const r = new Hono();
  r.get(WORKLOAD_PATH, async (c) => {
    const cases = await db.case.findMany({ where: { assigneeStaffId: { not: null } }, select: { assigneeStaffId: true } });
    c.header('Cache-Control', 'no-store');
    return c.json(
      summarizeWorkload(
        [{ key: 'assignee', label: '担当' }],
        'すべて',
        cases.map((x) => ({ staffDirectoryId: x.assigneeStaffId, role: 'assignee', active: true })),
        // 案件一覧の担当者の絞り込み
        (id) => `/?assignee=staff:${id}`,
      ),
    );
  });
  return r;
}
