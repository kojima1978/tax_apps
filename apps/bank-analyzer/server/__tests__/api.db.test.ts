// /api/cases 以下を実際の要求の形で叩く。値はすべて架空。

import { describe, expect, it } from 'vitest';
import { BASE_PATH, createApp } from '../app.js';
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

describe('案件', () => {
  it('作成・一覧・名前の変更・削除', async () => {
    const created = await call('POST', '', { name: '  架空 花子 ' });
    expect(created.status).toBe(200);
    expect(created.json.case).toEqual({ id: 1, name: '架空 花子' });
    expect((await call('POST', '', { name: '架空 花子' })).json.error).toBe('この案件名はすでに使われています。');
    expect((await call('POST', '', { name: ' ' })).status).toBe(400);

    await seedCase(db(), '架空 次郎', [{ category: '未分類' }, { category: '給与', accountNumber: '7654321' }]);
    const list = await call('GET', '');
    expect(list.json).toMatchObject([
      { name: '架空 次郎', transactionCount: 2, unclassifiedCount: 1, accountCount: 2 },
      { name: '架空 花子', transactionCount: 0, unclassifiedCount: 0, accountCount: 0 },
    ]);

    expect((await call('PATCH', '/1', { name: '架空 次郎' })).status).toBe(400);
    expect((await call('PATCH', '/1', { name: '架空 三郎' })).json.name).toBe('架空 三郎');
    expect((await call('PATCH', '/99', { name: 'x' })).status).toBe(404);
    expect((await call('DELETE', '/1')).status).toBe(200);
    expect((await call('GET', '/1')).status).toBe(404);
  });

  it('基準日は設定とクリアができ、実在しない日は弾く', async () => {
    const { caseId } = await seedCase(db());
    expect((await call('PUT', `/${caseId}/reference-date`, { referenceDate: '2025-02-30' })).status).toBe(400);
    expect((await call('PUT', `/${caseId}/reference-date`, { referenceDate: '2025-03-31' })).json.referenceDate).toBe('2025-03-31');
    expect((await call('GET', `/${caseId}`)).json.case.referenceDate).toBe('2025-03-31');
    const cleared = await call('PUT', `/${caseId}/reference-date`, { referenceDate: '' });
    expect(cleared.json).toMatchObject({ referenceDate: null, message: '基準日をクリアしました' });
  });

  it('無い案件の下は 404', async () => {
    expect((await call('GET', '/5/field-values?field=description')).status).toBe(404);
    expect((await call('GET', '/abc/transactions/1')).status).toBe(404);
  });
});

describe('取引1件', () => {
  it('追加は金額や日付が読めなければ何も書かない（Django は 0 円・日付なしで登録していた）', async () => {
    const { caseId } = await seedCase(db());
    expect((await call('POST', `/${caseId}/transactions`, { date: '2025/04/01', amountOut: '1,000' })).status).toBe(400);
    expect((await call('POST', `/${caseId}/transactions`, { date: '2025-04-01', amountOut: '1,2x' })).status).toBe(400);
    expect(await db().transaction.count()).toBe(0);

    const good = await call('POST', `/${caseId}/transactions`, {
      date: '2025-04-01',
      description: 'ｱｲｳ商店',
      amountOut: '1,000',
      accountNumber: '1111111',
      bankName: '架空銀行',
    });
    expect(good.status).toBe(200);
    expect(good.json.transaction).toMatchObject({ date: '2025-04-01', amountOut: 1000, category: '未分類', accountNumber: '1111111' });
    const row = await db().transaction.findFirstOrThrow();
    expect(row.descriptionSearch).not.toBe('');
  });

  it('更新は送った欄だけ変え、日付と残高は空で消せる。分類の変更は履歴に残る', async () => {
    const { caseId, ids } = await seedCase(db(), '架空 太郎', [{ description: '架空商店', balance: 5000, memo: 'x' }]);
    const res = await call('PATCH', `/${caseId}/transactions/${ids[0]}`, { date: '', balance: null, category: '生活費' });
    expect(res.status).toBe(200);
    expect(res.json.transaction).toMatchObject({ date: null, balance: null, category: '生活費', description: '架空商店', memo: 'x' });
    const history = await db().classificationChange.findMany();
    expect(history.map((h) => [h.oldCategory, h.newCategory, h.source])).toEqual([['未分類', '生活費', 'transaction_edit']]);
  });

  it('口座番号を別の口座の番号へ変えようとしたら 409（Django は 500）', async () => {
    const { caseId, ids } = await seedCase(db(), '架空 太郎', [{}, { accountNumber: '7654321' }]);
    expect((await call('PATCH', `/${caseId}/transactions/${ids[0]}`, { accountNumber: '7654321' })).status).toBe(409);
    expect((await call('PATCH', `/${caseId}/transactions/${ids[0]}`, { accountNumber: '' })).status).toBe(400);
  });

  it('付箋・メモ・削除。他の案件の取引には触れない', async () => {
    const { caseId, ids } = await seedCase(db(), '架空 太郎', [{}]);
    const other = await seedCase(db(), '架空 花子', [{}]);
    const flag = `/${caseId}/transactions/${ids[0]}/flag`;
    expect((await call('POST', flag)).json).toMatchObject({ isFlagged: true, message: '付箋を追加しました' });
    expect((await call('POST', flag)).json.isFlagged).toBe(false);
    expect((await call('PUT', `/${caseId}/transactions/${ids[0]}/memo`, { memo: ' 確認済 ' })).json.memo).toBe('確認済');
    expect((await call('POST', `/${caseId}/transactions/${other.ids[0]}/flag`)).status).toBe(404);
    expect((await call('DELETE', `/${caseId}/transactions/${other.ids[0]}`)).status).toBe(404);
    expect((await call('DELETE', `/${caseId}/transactions/${ids[0]}`)).status).toBe(200);
    expect(await db().transaction.count()).toBe(1);
  });
});

describe('まとめての削除', () => {
  it('未分類だけを消す', async () => {
    const { caseId, ids } = await seedCase(db(), '架空 太郎', [{ category: '未分類' }, { category: '給与' }]);
    const path = `/${caseId}/transactions/delete-unclassified`;
    expect((await call('POST', path, { ids: ids.map(String) })).json).toMatchObject({ count: 1, deletedIds: [Number(ids[0])] });
    expect((await call('POST', path, { ids: [String(ids[1])] })).status).toBe(404);
    expect((await call('POST', path, { ids: [] })).status).toBe(400);
  });

  it('重複の削除と、口座ごとの削除', async () => {
    const { caseId, ids } = await seedCase(db(), '架空 太郎', [{}, {}, { accountNumber: '7654321' }]);
    expect((await call('POST', `/${caseId}/transactions/delete-duplicates`, { ids: [Number(ids[1])] })).json.count).toBe(1);
    expect((await call('POST', `/${caseId}/transactions/delete-duplicates`, { ids: ['x'] })).status).toBe(400);
    const res = await call('POST', `/${caseId}/accounts/delete`, { accountNumber: '7654321' });
    expect(res.json.message).toBe('口座番号: 7654321 のデータ（1件）を削除しました。');
    expect(await db().account.count()).toBe(1);
  });
});

describe('一括置換', () => {
  it('候補の一覧と、摘要の置換', async () => {
    const { caseId } = await seedCase(db(), '架空 太郎', [
      { description: '架空ｼｮｳﾃﾝ' },
      { description: '架空ｼｮｳﾃﾝ' },
      { description: '別' },
    ]);
    const values = await call('GET', `/${caseId}/field-values?field=description`);
    expect(values.json.values[0]).toEqual({ value: '架空ｼｮｳﾃﾝ', count: 2 });
    expect((await call('GET', `/${caseId}/field-values`)).status).toBe(400);
    expect((await call('GET', `/${caseId}/field-values?field=memo`)).json.values).toEqual([]);

    const path = `/${caseId}/bulk-replace`;
    const res = await call('POST', path, { field: 'description', oldValue: '架空ｼｮｳﾃﾝ', newValue: ' 架空商店 ' });
    expect(res.json.message).toBe('摘要「架空ｼｮｳﾃﾝ」を「架空商店」に置換しました（2件）。');
    expect((await call('POST', path, { field: 'description', oldValue: '無い', newValue: 'x' })).status).toBe(404);
    expect((await call('POST', path, { field: 'memo', oldValue: 'a', newValue: 'b' })).status).toBe(400);
  });

  it('口座番号を既存の番号へ置換すると口座がまとまる', async () => {
    const { caseId } = await seedCase(db(), '架空 太郎', [{ accountNumber: '1111111' }, { accountNumber: '2222222' }]);
    const res = await call('POST', `/${caseId}/bulk-replace`, { field: 'accountNumber', oldValue: '1111111', newValue: '2222222' });
    expect(res.status).toBe(200);
    expect(await db().account.count()).toBe(1);
    expect(await db().transaction.count({ where: { account: { accountNumber: '2222222' } } })).toBe(2);
  });
});

describe('ID 範囲の削除と復元', () => {
  it('見た件数と違えば消さず、消したら控えから戻せる', async () => {
    const { caseId, ids } = await seedCase(db(), '架空 太郎', [{}, {}, {}]);
    const a = Number(ids[0]);
    const c = Number(ids[2]);
    const preview = await call('GET', `/${caseId}/range-delete/preview?startId=${c}&endId=${a}`);
    expect(preview.json).toMatchObject({ startId: a, endId: c, count: 3 });
    expect((await call('GET', `/${caseId}/range-delete/preview?startId=x&endId=1`)).status).toBe(400);

    const path = `/${caseId}/range-delete`;
    const base = { startId: a, endId: c, confirmation: '削除' };
    expect((await call('POST', path, { ...base, confirmation: 'はい', expectedCount: 3 })).status).toBe(400);
    expect((await call('POST', path, { ...base, expectedCount: 2 })).status).toBe(409);
    const done = await call('POST', path, { ...base, expectedCount: 3 });
    expect(done.json.message).toBe(`ID ${a}〜${c} の範囲で 3件を削除しました。バックアップから復元できます。`);
    expect(await db().transaction.count()).toBe(0);

    const backup = (await call('GET', `/${caseId}/range-delete/backup`)).json.backup;
    expect(backup).toMatchObject({ startId: a, endId: c, transactionCount: 3 });
    const restored = await call('POST', `/${caseId}/range-delete/restore`, { backupId: backup.id });
    expect(restored.json).toMatchObject({ restored: 3, skipped: 0, message: '3件の取引を復元しました。' });
    expect((await call('POST', `/${caseId}/range-delete/restore`, { backupId: backup.id })).status).toBe(404);
    expect((await call('GET', `/${caseId}/range-delete/backup`)).json.backup).toBeNull();
  });
});

describe('分類の手直しと取り消し', () => {
  it('1件だけ / 同じ摘要すべて。絞り込みから外れるかも返す', async () => {
    const { caseId, ids } = await seedCase(db(), '架空 太郎', [
      { description: '架空商店' },
      { description: '架空商店' },
      { description: '別' },
    ]);
    const path = `/${caseId}/categories/update`;
    const one = await call('POST', path, { txId: String(ids[0]), category: '生活費', filterCategories: ['未分類'] });
    expect(one.json).toMatchObject({ count: 1, category: '生活費', stillVisible: false });
    const all = await call('POST', path, {
      txId: Number(ids[0]),
      category: '贈与',
      applyAll: true,
      filterCategories: ['未分類'],
      filterCategoryMode: 'exclude',
    });
    expect(all.json).toMatchObject({ count: 2, stillVisible: true });
    expect(await categoriesOf(db(), ids)).toEqual(['贈与', '贈与', '未分類']);
    const sources = (await db().classificationChange.findMany({ orderBy: { id: 'asc' } })).map((h) => h.source);
    expect(sources).toEqual(['manual', 'manual_same_description', 'manual_same_description']);

    expect((await call('POST', path, { txId: 'x', category: 'a' })).json.error).toBe('不正な取引IDです');
    expect((await call('POST', path, { category: 'a' })).json.error).toBe('パラメータが不足しています');
  });

  it('まとめて変えて、直前の操作だけ取り消せる', async () => {
    const { caseId, ids } = await seedCase(db(), '架空 太郎', [{}, {}]);
    const res = await call('POST', `/${caseId}/categories/bulk`, {
      sourceTab: 'transfers',
      updates: { [String(ids[0])]: '資金移動', [String(ids[1])]: '' },
    });
    expect(res.json).toMatchObject({ count: 1, message: '1件の分類を更新しました。' });
    const latest = (await call('GET', `/${caseId}/history/latest`)).json.latest;
    expect(latest).toMatchObject({ changeGroup: res.json.changeGroup, count: 1, newCategory: '資金移動', source: 'bulk_transfers' });

    expect((await call('POST', `/${caseId}/history/undo`, { changeGroup: 'x' })).status).toBe(400);
    const undo = await call('POST', `/${caseId}/history/undo`, { changeGroup: res.json.changeGroup });
    expect(undo.json.message).toBe('1件を変更直前の分類へ戻しました。');
    expect(await categoriesOf(db(), ids)).toEqual(['未分類', '未分類']);
    expect((await call('POST', `/${caseId}/history/undo`, { changeGroup: res.json.changeGroup })).status).toBe(409);
  });
});
