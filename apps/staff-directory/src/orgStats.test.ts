import { describe, expect, it } from 'vitest';
import { WORKLOAD_SOURCES } from '../server/linkedApps';
import { companyStats, departmentStats, emptyStats } from './orgStats';
import { indexWorkloads, type AppWorkload } from './workload';
import type { Staff } from './types';

const today = '2026-11-12';
const [itcm, pb, svf, bank] = WORKLOAD_SOURCES;

// 所属は [会社, 部署] の並び。先頭が主所属
function staff(id: number, affiliations: [number, number | null][], retiredOn: string | null = null): Staff {
  return {
    id,
    retiredOn,
    companyId: affiliations[0]?.[0] ?? null,
    departmentId: affiliations[0]?.[1] ?? null,
    affiliations: affiliations.map(([companyId, departmentId], i) => ({ companyId, departmentId, isPrimary: i === 0 })),
  } as Staff;
}

const assignee = (staffDirectoryId: number, active: number) => ({
  staffDirectoryId,
  counts: { assignee: { active, total: active } },
  links: {},
});
const app = (source: (typeof WORKLOAD_SOURCES)[number], staff: ReturnType<typeof assignee>[]): AppWorkload => ({
  source,
  data: { roles: [{ key: 'assignee', label: '担当' }], activeLabel: 'すべて', staff },
});

// 架空の部署: 会社1 の 部署10・11、会社2 の 部署20
const people = [
  staff(1, [[1, 10]]), // 在籍
  staff(2, [[1, 10], [2, 20]], '2026-11-30'), // 退職予定・会社2 の部署20 と兼務
  staff(3, [[1, 11]], '2026-11-12'), // 今日が最終日（退職予定）
  staff(4, [[1, 10]], '2026-10-31'), // 退職済み・担当が残っている
  staff(5, [[2, null]]), // 部署なし
];
const apps = [app(itcm, [assignee(1, 10), assignee(2, 4), assignee(4, 3)]), app(pb, [assignee(1, 8), assignee(2, 10), assignee(3, 1)]), app(svf, [assignee(5, 2)]), app(bank, [])];

describe('departmentStats', () => {
  const stats = departmentStats(people, indexWorkloads(apps), today);

  it('担当は主所属の部署で足し、退職予定の分と退職した人の分を分ける', () => {
    expect(stats.get(10)).toEqual({ retiring: 1, workload: { active: 32, retiring: 14, retired: 3 } });
    expect(stats.get(11)).toEqual({ retiring: 1, workload: { active: 1, retiring: 1, retired: 0 } });
  });

  it('退職予定の人数は兼務先の部署にも入る。担当は兼務先では数えない', () => {
    expect(stats.get(20)).toEqual({ retiring: 1, workload: { active: 0, retiring: 0, retired: 0 } });
  });

  it('退職日の翌日から退職（退職予定には入れない）', () => {
    const next = departmentStats(people, indexWorkloads(apps), '2026-11-13');
    expect(next.get(11)).toEqual({ retiring: 0, workload: { active: 0, retiring: 0, retired: 1 } });
  });

  it('読めないアプリが1つでもあれば担当は null（「—」）。人数は数える', () => {
    const partly = indexWorkloads([apps[0], { source: pb, data: 'unreachable' }, apps[2], apps[3]]);
    expect(departmentStats(people, partly, today).get(10)).toEqual({ retiring: 1, workload: null });
    expect(emptyStats(partly)).toEqual({ retiring: 0, workload: null });

    const none = indexWorkloads(apps.map((a) => ({ ...a, data: 'unreachable' as const })));
    expect(departmentStats(people, none, today).get(10)).toEqual({ retiring: 1, workload: null });
    expect(emptyStats(none)).toEqual({ retiring: 0, workload: null });
  });
});

describe('companyStats', () => {
  it('会社ごとに同じ数え方。部署の無い人も会社には入る', () => {
    const stats = companyStats(people, indexWorkloads(apps), today);
    expect(stats.get(1)).toEqual({ retiring: 2, workload: { active: 33, retiring: 15, retired: 3 } });
    expect(stats.get(2)).toEqual({ retiring: 1, workload: { active: 2, retiring: 0, retired: 0 } });
  });
});
