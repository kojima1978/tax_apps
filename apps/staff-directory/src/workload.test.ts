import { describe, expect, it } from 'vitest';
import { WORKLOAD_SOURCES } from '../server/linkedApps';
import {
  formatRoleCount,
  indexWorkloads,
  remainingWorkload,
  primaryActive,
  retiredWithWorkload,
  workloadLines,
  workloadTitle,
  type AppWorkload,
} from './workload';
import type { Staff } from './types';

const [itcm, pb, svf, bank] = WORKLOAD_SOURCES;

// 架空の件数。案件管理は担当と社内紹介、ほかは担当だけ
const apps: AppWorkload[] = [
  {
    source: itcm,
    data: {
      roles: [
        { key: 'assignee', label: '担当' },
        { key: 'internalReferrer', label: '社内紹介' },
      ],
      activeLabel: '見送り・入金済を除く',
      staff: [
        {
          staffDirectoryId: 1,
          counts: { assignee: { active: 2, total: 5 }, internalReferrer: { active: 0, total: 1 } },
          links: { assignee: '?assigneeId=10&fiscalYear=all', internalReferrer: '?internalReferrerId=10&fiscalYear=all' },
        },
        { staffDirectoryId: 3, counts: { assignee: { active: 0, total: 0 }, internalReferrer: { active: 1, total: 1 } }, links: { internalReferrer: '?internalReferrerId=30&fiscalYear=all' } },
      ],
    },
  },
  {
    source: pb,
    data: { roles: [{ key: 'assignee', label: '担当' }], activeLabel: 'すべて', staff: [{ staffDirectoryId: 1, counts: { assignee: { active: 3, total: 3 } }, links: { assignee: '?staffId=7' } }] },
  },
  { source: svf, data: 'unreachable' },
  { source: bank, data: { roles: [{ key: 'assignee', label: '担当' }], activeLabel: 'すべて', staff: [] } },
];

describe('primaryActive', () => {
  const index = indexWorkloads(apps);

  it('読めたアプリの担当（進行中）を足す。社内紹介は数えない', () => {
    expect(primaryActive(index, 1)).toBe(5);
    expect(primaryActive(index, 3)).toBe(0);
    expect(primaryActive(index, 99)).toBe(0);
  });

  it('どのアプリも読めなければ null', () => {
    const none = indexWorkloads(apps.map((a) => ({ ...a, data: 'unreachable' as const })));
    expect(primaryActive(none, 1)).toBeNull();
  });
});

describe('workloadLines', () => {
  const index = indexWorkloads(apps);

  it('アプリの順に内訳を並べ、読めないアプリは unreachable。リンクは進行中が1件以上の役割だけ', () => {
    const lines = workloadLines(index, 1);
    expect(lines.map((l) => l.source.key)).toEqual(['itcm', 'private-banking', 'stock-valuation-form', 'bank-analyzer']);
    const [a, b, c, d] = lines;
    if (a.unreachable || b.unreachable || d.unreachable) throw new Error('読めているはず');
    expect(a.roles).toEqual([
      { key: 'assignee', label: '担当', active: 2, total: 5, primary: true, url: '/itcm?assigneeId=10&fiscalYear=all' },
      { key: 'internalReferrer', label: '社内紹介', active: 0, total: 1, primary: false, url: null },
    ]);
    expect(b.roles[0].url).toBe('/private-banking?staffId=7');
    expect(c.unreachable).toBe(true);
    expect(d.roles).toEqual([{ key: 'assignee', label: '担当', active: 0, total: 0, primary: true, url: null }]);
  });

  it('ツールチップは件数のあるアプリと読めなかったアプリだけ', () => {
    expect(workloadTitle(workloadLines(index, 1))).toBe(
      ['案件管理: 担当 2件（すべて 5件）・社内紹介 0件（すべて 1件）', '資産・負債管理（PB）: 担当 3件', '株式評価明細書: —（読めませんでした）'].join('\n'),
    );
    const allRead = indexWorkloads(apps.filter((a) => a.data !== 'unreachable'));
    expect(workloadTitle(workloadLines(allRead, 99))).toBe('担当している案件はありません');
  });

  it('件数の書き方: 進行中とすべてが同じなら「すべて」を添えない', () => {
    expect(formatRoleCount({ label: '担当', active: 3, total: 3 })).toBe('担当 3件');
  });
});

describe('retiredWithWorkload', () => {
  it('退職日のある人のうち、担当（進行中）が残っている人', () => {
    const index = indexWorkloads(apps);
    const people = [
      { id: 1, retiredOn: '2026-03-31' },
      { id: 3, retiredOn: '2026-03-31' },
      { id: 4, retiredOn: null },
    ] as Staff[];
    expect(retiredWithWorkload(people, index, '2026-11-12').map((s) => s.id)).toEqual([1]);
  });

  it('退職日が今日以降（退職予定）の人は退職者に数えない。翌日から数える', () => {
    const index = indexWorkloads(apps);
    const people = [{ id: 1, retiredOn: '2026-11-12' }] as Staff[];
    expect(retiredWithWorkload(people, index, '2026-11-12')).toEqual([]);
    expect(retiredWithWorkload(people, index, '2026-11-13').map((s) => s.id)).toEqual([1]);
  });
});

describe('remainingWorkload', () => {
  it('主の役割（担当）の進行中が残っているアプリだけ、一覧へのリンクつきで。読めないアプリは入れない', () => {
    expect(remainingWorkload(workloadLines(indexWorkloads(apps), 1))).toEqual([
      { app: '案件管理', active: 2, url: '/itcm?assigneeId=10&fiscalYear=all' },
      { app: '資産・負債管理（PB）', active: 3, url: '/private-banking?staffId=7' },
    ]);
    expect(remainingWorkload(workloadLines(indexWorkloads(apps), 3))).toEqual([]);
  });
});
