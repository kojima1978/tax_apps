import { describe, expect, it } from 'vitest';
import { parseWorkload, summarizeWorkload, type WorkloadRole } from './workload';

const roles: WorkloadRole[] = [
  { key: 'assignee', label: '担当' },
  { key: 'internalReferrer', label: '社内紹介' },
];
const link = (id: number, role: string) => `?${role}=${id}`;

describe('summarizeWorkload', () => {
  it('台帳ID と役割ごとに 進行中・すべて を数え、0件の役割も 0 で持つ', () => {
    const res = summarizeWorkload(
      roles,
      '見送り・入金済を除く',
      [
        { staffDirectoryId: 2, role: 'assignee', active: true },
        { staffDirectoryId: 2, role: 'assignee', active: false },
        { staffDirectoryId: 1, role: 'internalReferrer', active: true },
        { staffDirectoryId: 2, role: 'assignee', active: true },
      ],
      link,
    );
    expect(res.staff).toEqual([
      {
        staffDirectoryId: 1,
        counts: { assignee: { active: 0, total: 0 }, internalReferrer: { active: 1, total: 1 } },
        links: { internalReferrer: '?internalReferrer=1' },
      },
      {
        staffDirectoryId: 2,
        counts: { assignee: { active: 2, total: 3 }, internalReferrer: { active: 0, total: 0 } },
        links: { assignee: '?assignee=2' },
      },
    ]);
  });

  it('台帳に結び付いていない担当者と、知らない役割は数えない', () => {
    const res = summarizeWorkload(
      roles,
      'すべて',
      [
        { staffDirectoryId: null, role: 'assignee', active: true },
        { staffDirectoryId: 3, role: 'operator', active: true },
      ],
      link,
    );
    expect(res.staff).toEqual([]);
  });
});

describe('parseWorkload', () => {
  const ok = summarizeWorkload(roles, 'すべて', [{ staffDirectoryId: 1, role: 'assignee', active: true }], link);

  it('組んだ形はそのまま読める', () => {
    expect(parseWorkload(JSON.parse(JSON.stringify(ok)))).toEqual(ok);
  });

  it('形が違えば null', () => {
    expect(parseWorkload(null)).toBeNull();
    expect(parseWorkload({ roles, activeLabel: 'すべて' })).toBeNull();
    expect(parseWorkload({ ...ok, staff: [{ ...ok.staff[0], counts: { assignee: { active: 1, total: 1 } } }] })).toBeNull();
    expect(parseWorkload({ ...ok, staff: [{ ...ok.staff[0], staffDirectoryId: '1' }] })).toBeNull();
  });
});
