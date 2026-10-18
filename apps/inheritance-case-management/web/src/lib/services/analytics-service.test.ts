import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aggregateCases, computeRollingAnnual } from '@/lib/analytics-utils';
import type { InheritanceCase } from '@/types/shared';

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { inheritanceCase: { findMany } } }));
import { ANALYTICS_CASE_SELECT, getAnalyticsCases } from './analytics-service';

describe('compact analytics data', () => {
  beforeEach(() => findMany.mockReset());

  it('preserves annual, referral and rolling totals without loading detail collections', async () => {
    const records = ['受託', '手続中', '申告済', '請求済', '入金済', '見送り'].map((status, index) => ({
      id: index + 1, deceasedName: '検証', dateOfDeath: new Date('2026-01-01T00:00:00Z'),
      status, fiscalYear: index % 2 ? 2025 : 2026, taxAmount: 100, propertyValue: 1000,
      feeAmount: 100000, estimateAmount: 80000, referralFeeRate: 10,
      referralFeeAmount: 10000, estimateReferralFeeAmount: index % 2 ? null : 8000,
      internalReferrerId: index % 2 ? 1 : null,
      paidDate: new Date('2026-09-01T00:00:00Z'),
      assignee: { id: 1, name: '担当', active: true, department: { name: '相続部' } },
      internalReferrer: index % 2 ? { id: 1, name: '担当', active: true, department: { name: '相続部' } } : null,
      referrer: index % 2 ? null : { name: '紹介者', company: { name: '会社' }, branch: { name: '支店' } },
      heirs: [{ person: { name: '読み込まない人物情報' } }], progress: [], expenses: [],
      memo: '読み込まないメモ', feeCalcSnapshot: { large: 'snapshot' },
    }));
    const selected = records.map(record => Object.fromEntries(
      Object.keys(ANALYTICS_CASE_SELECT).map(key => [key, record[key as keyof typeof record]]),
    ));
    findMany.mockResolvedValue(selected);
    const compact = JSON.parse(JSON.stringify(await getAnalyticsCases())) as InheritanceCase[];
    const full = JSON.parse(JSON.stringify(records)) as InheritanceCase[];
    const departments = new Map([['担当', '相続部']]);
    expect(aggregateCases(compact, departments)).toEqual(aggregateCases(full, departments));
    for (const department of [undefined, '相続部']) {
      expect(computeRollingAnnual(compact, '2026-10', department, departments))
        .toEqual(computeRollingAnnual(full, '2026-10', department, departments));
    }
    expect(findMany).toHaveBeenCalledWith({ select: ANALYTICS_CASE_SELECT, orderBy: [{ fiscalYear: 'desc' }, { dateOfDeath: 'asc' }] });
    for (const key of ['heirs', 'progress', 'expenses', 'memo', 'feeCalcSnapshot']) {
      expect(compact[0]).not.toHaveProperty(key);
    }
  });

  it('returns no fabricated records when there are no cases', async () => {
    findMany.mockResolvedValue([]);
    expect(await getAnalyticsCases()).toEqual([]);
  });
});
