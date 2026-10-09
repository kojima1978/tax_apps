// 自動分類とキーワード操作の API。値はすべて架空。

import { describe, expect, it } from 'vitest';
import { BASE_PATH, createApp } from '../app.js';
import { applySelectedClassifications, classifyAndRegisterPattern } from '../services/classification.js';
import { categoriesOf, seedCase } from './helpers/fixtures.js';
import { useTestDb } from './helpers/testDb.js';

const db = useTestDb();
const API = `${BASE_PATH}/api/cases`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

async function call(method: string, path: string, body?: unknown) {
  const res = await createApp(db()).request(`${API}${path}`, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as Json };
}

const addCaseKeyword = (caseId: bigint, category: string, keyword: string) =>
  call('POST', `/${caseId}/patterns/add`, { category, keyword, scope: 'case' });

describe('ルール適用', () => {
  it('未分類で付箋の無い取引だけを分類し、履歴に残す', async () => {
    const { caseId, ids } = await seedCase(db(), '架空 太郎', [
      { description: 'ZZQ架空商会 振込' },
      { description: 'ZZQ架空商会 振込', isFlagged: true },
      { description: 'ZZQ架空商会 振込', category: '給与' },
      { description: '関係のない摘要' },
    ]);
    expect((await addCaseKeyword(caseId, '生活費', 'ZZQ架空商会')).status).toBe(200);

    const res = await call('POST', `/${caseId}/classify/rules`);
    expect(res.json).toMatchObject({ success: true, count: 1, message: 'キーワードルールを適用し、1件を分類しました。' });
    expect(await categoriesOf(db(), ids)).toEqual(['生活費', '未分類', '給与', '未分類']);
    const history = await db().classificationChange.findMany();
    expect(history.map((h: { source: string; oldCategory: string; newCategory: string }) => [h.source, h.oldCategory, h.newCategory])).toEqual([['classification_rule', '未分類', '生活費']]);

    const again = await call('POST', `/${caseId}/classify/rules`);
    expect(again.json).toMatchObject({ count: 0, changeGroup: null, message: '未分類の取引がないか、マッチするルールがありませんでした。' });
  });

  it('プレビューは書き込まず、選んだ取引にだけ当てる。選んだ後に手で分類した取引は上書きしない', async () => {
    const { caseId, ids } = await seedCase(db(), '架空 太郎', [
      { date: '2025-04-01', description: 'ZZQ架空商会', amountOut: 1000 },
      { date: '2025-05-01', description: 'zzq架空商会 振込', amountIn: 2000 },
      { date: '2025-06-01', description: '' },
    ]);
    await addCaseKeyword(caseId, '生活費', 'ZZQ架空商会');

    const preview = await call('GET', `/${caseId}/classify/preview`);
    expect(preview.json.items).toMatchObject([
      { txId: Number(ids[1]), date: '2025-05-01', amountIn: 2000, proposedCategory: '生活費', matchedKeyword: 'ZZQ架空商会', matchType: 'case' },
      { txId: Number(ids[0]), date: '2025-04-01', amountOut: 1000, currentCategory: '未分類', matchType: 'case', score: 95 },
    ]);
    expect(await categoriesOf(db(), ids)).toEqual(['未分類', '未分類', '未分類']);

    // 画面で選んだ後、適用する前に手で分類された
    await db().transaction.update({ where: { id: ids[0] }, data: { category: '給与' } });
    const items = ids.map((id) => ({ id: String(id), category: '生活費' }));
    const res = await call('POST', `/${caseId}/classify/apply-selected`, { items });
    expect(res.json).toMatchObject({ count: 1, skipped: 2, message: '1件の取引を分類しました。（2件は一覧を開いた後に分類かキーワードが変わったため見送りました）' });
    expect(await categoriesOf(db(), ids)).toEqual(['給与', '生活費', '未分類']);

    expect((await call('POST', `/${caseId}/classify/apply-selected`, { items: [] })).json.error).toBe('適用する取引が選択されていません。');
    expect((await call('POST', `/${caseId}/classify/apply-selected`, { items: [{ id: 'x', category: '生活費' }] })).status).toBe(400);
    expect((await call('POST', `/${caseId}/classify/apply-selected`, { items: [{ id: '1' }] })).status).toBe(400);
    expect((await call('POST', `/${caseId}/classify/apply-selected`, { ids: ['1'] })).status).toBe(400);
  });

  it('一覧を開いた後にキーワードが変わり、提案と違う分類になる取引は見送る', async () => {
    const { caseId, ids } = await seedCase(db(), '架空 太郎', [{ description: 'ZZQ架空商会 振込' }, { description: 'ZZQ別件' }]);
    await addCaseKeyword(caseId, '生活費', 'ZZQ架空商会');
    await addCaseKeyword(caseId, '給与', 'ZZQ別件');
    const preview = await call('GET', `/${caseId}/classify/preview`);
    const items = preview.json.items.map((i: Json) => ({ id: String(i.txId), category: i.proposedCategory }));

    // 画面を開いたまま、案件のキーワードを入れ替えた（「ZZQ架空商会」は贈与になった）
    expect((await call('POST', `/${caseId}/patterns/delete`, { category: '生活費', keyword: 'ZZQ架空商会', scope: 'case' })).status).toBe(200);
    await addCaseKeyword(caseId, '贈与', 'ZZQ架空商会');

    const res = await call('POST', `/${caseId}/classify/apply-selected`, { items });
    expect(res.json).toMatchObject({ count: 1, skipped: 1 });
    expect(await categoriesOf(db(), ids)).toEqual(['未分類', '給与']);
  });

  it('ほかの案件の取引 ID を選んでも触らない', async () => {
    const mine = await seedCase(db(), '架空 太郎', [{ description: 'ZZQ架空商会' }]);
    const other = await seedCase(db(), '架空 次郎', [{ description: 'ZZQ架空商会' }]);
    await addCaseKeyword(mine.caseId, '生活費', 'ZZQ架空商会');
    const result = await applySelectedClassifications(db(), mine.caseId, [...mine.ids, ...other.ids].map((id) => ({ id, category: '生活費' })));
    expect(result.count).toBe(1);
    expect(await categoriesOf(db(), other.ids)).toEqual(['未分類']);
  });
});

describe('自動分類（あいまい一致）', () => {
  it('点数を残し、しきい値の一括適用は点数で絞る', async () => {
    const { caseId, ids } = await seedCase(db(), '架空 太郎', [{ description: 'ZZQ架空商会' }, { description: '関係のない摘要' }]);
    await addCaseKeyword(caseId, '生活費', 'ZZQ架空商会');

    const res = await call('POST', `/${caseId}/classify/run`);
    expect(res.json).toMatchObject({ count: 1, message: '自動分類が完了しました。' });
    const row = await db().transaction.findUniqueOrThrow({ where: { id: ids[0] } });
    expect(row.category).toBe('生活費');
    expect(row.classificationScore).toBeGreaterThan(0);
    expect((await db().classificationChange.findFirstOrThrow()).source).toBe('auto_classifier');

    expect((await call('POST', `/${caseId}/classify/bulk-suggestions`, { minScore: '101' })).status).toBe(400);
    const bulk = await call('POST', `/${caseId}/classify/bulk-suggestions`, {});
    expect(bulk.json).toMatchObject({ count: 0, message: '信頼度95%以上の候補0件を適用しました。' });
  });

  it('候補の一括適用は分類候補タブに出ている第1候補をそのまま当てる（「その他」は当てない）', async () => {
    const { caseId, ids } = await seedCase(db(), '架空 太郎', [
      { description: 'ZZQ架空商会' },
      { description: 'ZZQ架空商事' },
      { description: 'ZZQ架空' },
      { description: 'ZZQ雑費' },
    ]);
    await addCaseKeyword(caseId, '生活費', 'ZZQ架空商会');
    await addCaseKeyword(caseId, 'その他', 'ZZQ雑費');

    const ai = await call('GET', `/${caseId}/dashboard?tab=ai&cutoff=0`);
    const expected = new Map<number, string>();
    for (const s of ai.json.aiSuggestions as Json[]) if (s.score >= 85) expected.set(s.txId, s.suggestedCategory);
    expect(expected.size).toBeGreaterThan(0);
    expect(ai.json.bulkCounts['85']).toBe(expected.size);

    const bulk = await call('POST', `/${caseId}/classify/bulk-suggestions`, { minScore: 85 });
    expect(bulk.json.count).toBe(expected.size);
    const rows = await db().transaction.findMany({ where: { caseId }, orderBy: { id: 'asc' } });
    for (const r of rows) expect([Number(r.id), r.category]).toEqual([Number(r.id), expected.get(Number(r.id)) ?? '未分類']);
    // 「自動分類」の判定なら「その他」のキーワードで当たる行。候補には出ないので当てない
    expect(rows.find((r) => r.id === ids[3])?.category).toBe('未分類');
  });

  it('提案を1件採ると点数は 100。変わらなければ点数も触らない', async () => {
    const { caseId, ids } = await seedCase(db(), '架空 太郎', [{ description: '架空' }, { description: '架空', category: '給与' }]);
    const res = await call('POST', `/${caseId}/classify/suggestion`, { txId: String(ids[0]), category: '生活費' });
    expect(res.json).toMatchObject({ count: 1, category: '生活費' });
    expect((await db().transaction.findUniqueOrThrow({ where: { id: ids[0] } })).classificationScore).toBe(100);

    const same = await call('POST', `/${caseId}/classify/suggestion`, { txId: Number(ids[1]), category: '給与' });
    expect(same.json.count).toBe(0);
    expect((await db().transaction.findUniqueOrThrow({ where: { id: ids[1] } })).classificationScore).toBe(0);

    expect((await call('POST', `/${caseId}/classify/suggestion`, { txId: 'abc', category: '給与' })).json.error).toBe('不正な取引IDです');
    expect((await call('POST', `/${caseId}/classify/suggestion`, { category: '給与' })).status).toBe(400);
  });
});

describe('キーワード', () => {
  it('追加・書き換え・移動・削除と、その文言', async () => {
    const { caseId } = await seedCase(db(), '架空 太郎');
    const added = await addCaseKeyword(caseId, '生活費', 'ZZQ架空');
    expect(added.json.message).toBe('キーワード「ZZQ架空」を「生活費」に追加しました（案件「架空 太郎」）。');

    const updated = await call('POST', `/${caseId}/patterns/update`, { category: '生活費', oldKeyword: 'ZZQ架空', newKeyword: 'ZZQ架空2', scope: 'case' });
    expect(updated.json.message).toBe('キーワードを「ZZQ架空」→「ZZQ架空2」に更新しました（案件「架空 太郎」）。');

    expect((await call('POST', `/${caseId}/patterns/move`, { category: '生活費', keyword: 'ZZQ架空2', fromScope: 'case', toScope: 'case' })).json.error).toBe('移動元と移動先が同じです');
    const moved = await call('POST', `/${caseId}/patterns/move`, { category: '生活費', keyword: 'ZZQ架空2', fromScope: 'case', toScope: 'global' });
    expect(moved.json.message).toBe('キーワード「ZZQ架空2」を移動しました（案件固有 → グローバル）。');

    const keywords = await call('GET', `/${caseId}/patterns/keywords?category=${encodeURIComponent('生活費')}`);
    expect(keywords.json.globalKeywords).toContain('ZZQ架空2');
    expect(keywords.json.caseKeywords).toEqual([]);

    const deleted = await call('POST', `/${caseId}/patterns/delete`, { category: '生活費', keyword: 'ZZQ架空2' });
    expect(deleted.json.message).toBe('キーワード「ZZQ架空2」を削除しました（グローバル）。');
    expect((await call('POST', `/${caseId}/patterns/delete`, { category: '生活費', keyword: 'ZZQ架空2' })).status).toBe(404);
    expect((await call('GET', `/${caseId}/patterns/keywords`)).json.error).toBe('カテゴリーが指定されていません');
  });

  it('影響件数は未分類・付箋なしを、この案件とほかの案件に分けて数える', async () => {
    const mine = await seedCase(db(), '架空 太郎', [{ description: 'ZZQ架空商会' }, { description: 'zzq架空商会', isFlagged: true }]);
    await seedCase(db(), '架空 次郎', [{ description: 'ZZQ架空商会' }, { description: 'ZZQ架空商会', category: '給与' }]);
    const res = await call('GET', `/${mine.caseId}/patterns/impact?keyword=zzq${encodeURIComponent('架空')}`);
    expect(res.json).toMatchObject({ currentCaseCount: 1, otherCasesCount: 1, totalCount: 2 });
    expect((await call('GET', `/${mine.caseId}/patterns/impact?keyword=%20`)).json.error).toBe('キーワードが指定されていません');
  });

  it('一括変更は1件ずつ当て、空なら弾く', async () => {
    const { caseId } = await seedCase(db());
    expect((await call('POST', `/${caseId}/patterns/bulk`, { changes: [] })).json.error).toBe('変更がありません');
    const res = await call('POST', `/${caseId}/patterns/bulk`, {
      changes: [
        { action: 'add', category: '生活費', keyword: 'ZZQ1', scope: 'case' },
        { action: 'delete', category: '生活費', keyword: '無いキーワード', scope: 'case' },
        'おかしな行',
      ],
    });
    expect(res.json).toMatchObject({ savedCount: 1, totalCount: 2, errors: null });
  });

  it('登録＋分類はこの案件の未分類だけを分類する。空のキーワードでは何もしない（Django は全件を分類していた）', async () => {
    const mine = await seedCase(db(), '架空 太郎', [{ description: 'ZZQ架空商会' }, { description: '別の摘要' }]);
    const other = await seedCase(db(), '架空 次郎', [{ description: 'ZZQ架空商会' }]);
    const res = await call('POST', `/${mine.caseId}/patterns/classify-and-register`, { category: '生活費', keyword: 'zzq架空', scope: 'case' });
    expect(res.json).toMatchObject({ count: 1, category: '生活費', keyword: 'zzq架空', scope: 'case' });
    expect(await categoriesOf(db(), mine.ids)).toEqual(['生活費', '未分類']);
    expect(await categoriesOf(db(), other.ids)).toEqual(['未分類']);
    expect((await db().classificationChange.findFirstOrThrow()).source).toBe('pattern_registration');

    expect(await classifyAndRegisterPattern(db(), mine.caseId, 'case', '給与', '  ')).toBeNull();
    expect(await categoriesOf(db(), mine.ids)).toEqual(['生活費', '未分類']);
  });
});
