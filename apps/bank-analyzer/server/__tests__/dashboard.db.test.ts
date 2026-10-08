// 分析画面のタブごとの中身。値はすべて架空。

import { describe, expect, it } from 'vitest';
import { BASE_PATH, createApp } from '../app.js';
import { paginate, parsePerPage } from '../services/dashboard.js';
import { seedCase } from './helpers/fixtures.js';
import { useTestDb } from './helpers/testDb.js';

const db = useTestDb();
const API = `${BASE_PATH}/api/cases`;

type Body = Record<string, any>;
const get = async (path: string) => {
  const res = await createApp(db()).request(`${API}${path}`);
  return { status: res.status, body: (await res.json()) as Body };
};

async function seed() {
  const seeded = await seedCase(db(), 'ZZQ架空商会', [
    { date: '2025-04-01', description: 'ZZQ架空電気', amountOut: 5000, category: '生活費' },
    { date: '2025-04-15', description: 'ZZQ架空給与', amountIn: 300000, category: '給与' },
    { date: '2025-05-02', description: 'ZZQ振替出金', amountOut: 30000 },
    { date: '2025-05-03', description: 'ZZQ振替入金', amountIn: 30000, accountNumber: '7654321' },
    { date: '2025-05-10', description: 'ZZQ謎の出金', amountOut: 800, isFlagged: true },
    { date: '2025-05-10', description: 'ZZQ謎の出金', amountOut: 800 },
    { date: null, description: 'ZZQ日付なし', amountOut: 1, category: '生活費' },
  ]);
  await db().case.update({ where: { id: seeded.caseId }, data: { referenceDate: new Date('2025-05-01T00:00:00Z') } });
  return seeded;
}

describe('ページ送り', () => {
  it('数字でなければ1ページ目、範囲外なら最後のページ。件数が無くても1ページ', () => {
    const items = [1, 2, 3, 4, 5];
    expect(paginate(items, '2', 2)).toEqual({ items: [3, 4], total: 5, page: 2, pageCount: 3, perPage: 2 });
    expect(paginate(items, 'x', 2).page).toBe(1);
    expect(paginate(items, '99', 2)).toMatchObject({ items: [5], page: 3 });
    expect(paginate([], null, 2)).toEqual({ items: [], total: 0, page: 1, pageCount: 1, perPage: 2 });
    expect(parsePerPage('50')).toBe(50);
    expect(parsePerPage('7')).toBe(100);
  });
});

describe('分析画面', () => {
  it('取引が無ければ noData', async () => {
    const { caseId } = await seedCase(db(), 'ZZQ空');
    const { body } = await get(`/${caseId}/dashboard`);
    expect(body).toMatchObject({ success: true, noData: true, activeTab: 'overview', case: { name: 'ZZQ空' } });
  });

  it('概要: 件数・分類別（件数順、未分類は最後）・月次（相続開始月の目印つき）・口座', async () => {
    const { caseId } = await seed();
    const { status, body } = await get(`/${caseId}/dashboard?tab=unknown`);
    expect(status).toBe(200);
    expect(body).toMatchObject({
      activeTab: 'overview',
      totalTxCount: 7,
      classifiedCount: 3,
      classifiedPct: 42.9,
      unclassifiedCount: 4,
      flaggedCount: 1,
      totalOut: 36601,
      totalIn: 330000,
      netFlow: 293399,
      earliestTransactionDate: '2025-04-01',
      latestTransactionDate: '2025-05-10',
      latestDeletionBackup: null,
    });
    expect(body.chartCategories).toEqual({ labels: ['生活費', '給与', '未分類'], counts: [2, 1, 4], totals: [5001, 300000, 0] });
    // 相続開始月（5月）から後は入れない
    expect(body.chartMonthly).toEqual({ months: ['R7.4'], monthKeys: ['2025-04'], out: [5000], in: [300000], inheritanceStartMonth: '2025-05' });
    expect(body.accountSummary.map((a: Body) => [a.accountNumber, a.count])).toEqual([['1234567', 6], ['7654321', 1]]);
    expect(body.options.banks).toEqual(['架空銀行']);
  });

  it('全取引: 絞り込みと並び替え、ページ送り', async () => {
    const { caseId } = await seed();
    const { body } = await get(`/${caseId}/dashboard?tab=all&amount_type=out&sort=amount_out_desc&per_page=25`);
    expect(body.allTxs).toMatchObject({ total: 5, page: 1, perPage: 25 });
    expect(body.allTxs.items.map((t: Body) => t.amountOut)).toEqual([30000, 5000, 800, 800, 1]);
    expect(body.allTxs.items[0]).toMatchObject({ bankName: '架空銀行', accountNumber: '1234567', memo: '', isTransfer: false });
  });

  it('未分類: 一覧と摘要ごとのまとめ（キーワードで絞る）', async () => {
    const { caseId } = await seed();
    const { body } = await get(`/${caseId}/dashboard?tab=unclassified&keyword=${encodeURIComponent('謎')}`);
    expect(body.unclassifiedTxs.total).toBe(2);
    expect(body.unclassifiedGroups.items).toHaveLength(1);
    expect(body.unclassifiedGroups.items[0]).toMatchObject({ description: 'ZZQ謎の出金', count: 2 });
    expect(body.unclassifiedGroupCount).toBe(1);
    expect(body.unclassifiedTxTotal).toBe(2);
  });

  it('資金移動: 組と金額差・まとめ', async () => {
    const { caseId } = await seed();
    const { body } = await get(`/${caseId}/dashboard?tab=transfers`);
    expect(body.transferPairs).toHaveLength(1);
    expect(body.transferPairs[0]).toMatchObject({
      source: { description: 'ZZQ振替出金', amount: 30000 },
      destination: { description: 'ZZQ振替入金', accountNumber: '7654321' },
      amountDiff: 0,
    });
    expect(body.transferSummary).toEqual({ totalAmount: 30000, pairCount: 1, unclassifiedCount: 1 });
  });

  it('重複の疑い・付箋付き・分類の候補', async () => {
    const { caseId } = await seed();
    const cleanup = (await get(`/${caseId}/dashboard?tab=cleanup`)).body;
    expect(cleanup.duplicateTxs.map((t: Body) => [t.description, t.dupGroupIdx])).toEqual([['ZZQ謎の出金', 0], ['ZZQ謎の出金', 0]]);

    const flagged = (await get(`/${caseId}/dashboard?tab=flagged`)).body;
    expect(flagged.flaggedTxs.map((t: Body) => t.description)).toEqual(['ZZQ謎の出金']);

    const ai = (await get(`/${caseId}/dashboard?tab=ai`)).body;
    expect(ai).toHaveProperty('aiGroups');
    expect(ai).toHaveProperty('highConfidenceTxCount');
    expect(ai.globalPatterns[0].category).toBe('生活費');
    expect(ai.casePatterns).toEqual([]);
  });

  it('知らない案件は 404', async () => {
    expect((await get('/999999/dashboard')).status).toBe(404);
  });
});
