// 分析画面の表示（Django: analysis_dashboard の GET）。操作（POST）は classification / categories /
// transactions の各ルート。中身は services/dashboard.ts

import type { PrismaClient } from '@prisma/client';
import { filterFromQuery } from '../filterQuery.js';
import { DASHBOARD_TABS, getDashboard, parsePerPage, type DashboardTab } from '../services/dashboard.js';
import { ok, type CaseRouter } from './common.js';

export function dashboardRoutes(r: CaseRouter, db: PrismaClient) {
  r.get('/:caseId/dashboard', async (c) => {
    const q = new URL(c.req.url).searchParams;
    const tabParam = q.get('tab');
    // 知らないタブは概要（Django と同じ）
    const tab: DashboardTab = DASHBOARD_TABS.includes(tabParam as DashboardTab) ? (tabParam as DashboardTab) : 'overview';
    return ok(
      c,
      await getDashboard(db, c.get('caseId'), {
        tab,
        filter: filterFromQuery(q, { includeTabFilters: true }),
        perPage: parsePerPage(q.get('per_page')),
        page: q.get('page'),
        unclassifiedPage: q.get('unclassified_page'),
        groupPage: q.get('group_page'),
      }),
    );
  });
}
