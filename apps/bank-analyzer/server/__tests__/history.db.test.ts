// 分類の変更履歴と範囲削除の控え。既存の履歴を引き継ぐので、書く行の形まで Django と同じかを見る。

import { describe, expect, it } from 'vitest';
import { applyChanges, latestSummary, parseUuid, undoLatest } from '../services/classificationHistory.js';
import {
  deleteByRange,
  latestDeletionBackup,
  previewDeleteByRange,
  restoreDeletionBackup,
} from '../services/rangeDelete.js';
import { categoriesOf, seedCase } from './helpers/fixtures.js';
import { useTestDb } from './helpers/testDb.js';

const db = useTestDb();

describe('applyChanges', () => {
  it('変わった行だけを1つの組で記録し、分類を書き換える', async () => {
    const { caseId, ids } = await seedCase(db(), '架空 太郎', [
      { description: 'イオン', category: '未分類' },
      { description: '給与', category: '給与' },
      { description: null, category: '未分類' },
    ]);
    const r = await applyChanges(
      db(),
      caseId,
      { [String(ids[0])]: '生活費', [String(ids[1])]: '給与', [String(ids[2])]: 'その他' },
      'bulk_all',
    );
    expect(r.count).toBe(2);
    expect(parseUuid(r.changeGroup)).toBe(r.changeGroup);
    expect(await categoriesOf(db(), ids)).toEqual(['生活費', '給与', 'その他']);

    const rows = await db().classificationChange.findMany({ orderBy: { id: 'asc' } });
    expect(rows.map((c) => [c.transactionId, c.transactionIdentifier, c.transactionDescription, c.oldCategory, c.newCategory, c.source])).toEqual([
      [ids[0], ids[0], 'イオン', '未分類', '生活費', 'bulk_all'],
      [ids[2], ids[2], '', '未分類', 'その他', 'bulk_all'], // 摘要なしは空文字（Django: description or ""）
    ]);
    expect(new Set(rows.map((c) => c.changeGroup))).toEqual(new Set([r.changeGroup]));
    expect(rows.every((c) => c.revertedAt === null)).toBe(true);
  });

  it('空の分類・整数でない ID・他の案件の取引は扱わない', async () => {
    const a = await seedCase(db(), 'A', [{ description: 'x' }]);
    const b = await seedCase(db(), 'B', [{ description: 'y' }]);
    expect(await applyChanges(db(), a.caseId, { [String(a.ids[0])]: '' })).toEqual({ count: 0, changeGroup: null });
    expect(await applyChanges(db(), a.caseId, { abc: '生活費', [String(a.ids[0])]: '生活費' })).toEqual({ count: 0, changeGroup: null });
    expect(await applyChanges(db(), a.caseId, { [String(b.ids[0])]: '生活費' })).toEqual({ count: 0, changeGroup: null });
    expect(await db().classificationChange.count()).toBe(0);
  });
});

describe('undoLatest', () => {
  it('直前の組を元へ戻し、組の全行に取り消し日時を入れる', async () => {
    const { caseId, ids } = await seedCase(db(), '架空', [{ description: 'a' }, { description: 'b', category: '給与' }]);
    await applyChanges(db(), caseId, { [String(ids[0])]: '生活費' });
    const second = await applyChanges(db(), caseId, { [String(ids[0])]: '税金', [String(ids[1])]: '税金' }, 'bulk_large');

    const summary = await latestSummary(db(), caseId);
    expect(summary).toMatchObject({ changeGroup: second.changeGroup, count: 2, oldCategory: '複数分類', newCategory: '税金', description: 'a', source: 'bulk_large' });

    const r = await undoLatest(db(), caseId, second.changeGroup);
    expect(r).toMatchObject({ success: true, count: 2, restoredCategories: ['生活費', '給与'] });
    expect(await categoriesOf(db(), ids)).toEqual(['生活費', '給与']);
    const reverted = await db().classificationChange.findMany({ where: { changeGroup: second.changeGroup! } });
    expect(reverted.every((c) => c.revertedAt !== null)).toBe(true);

    // その前の組が次の「直前」になる
    expect((await latestSummary(db(), caseId))?.newCategory).toBe('生活費');
  });

  it('直前でない組・形の悪い ID・その後に分類が変わった取引・消えた取引は戻さない', async () => {
    const { caseId, ids } = await seedCase(db(), '架空', [{ description: 'a' }, { description: 'b' }]);
    const first = await applyChanges(db(), caseId, { [String(ids[0])]: '生活費' });
    const second = await applyChanges(db(), caseId, { [String(ids[1])]: '税金' });

    expect(await undoLatest(db(), caseId, 'not-a-uuid')).toMatchObject({ success: false, status: 400, error: '変更履歴IDが正しくありません。' });
    expect(await undoLatest(db(), caseId, first.changeGroup)).toMatchObject({ success: false, status: 409 });

    // 履歴を通さずに分類が変わった（Django の古い経路など）
    await db().transaction.update({ where: { id: ids[1] }, data: { category: 'その他' } });
    expect(await undoLatest(db(), caseId, second.changeGroup)).toMatchObject({
      success: false,
      status: 409,
      error: `取引ID ${ids[1]} はその後分類が変更されているため、安全に取り消せません。`,
    });

    await db().transaction.delete({ where: { id: ids[1] } });
    expect(await undoLatest(db(), caseId, second.changeGroup)).toMatchObject({
      success: false,
      status: 409,
      error: '対象取引が削除されているため取り消せません。',
    });
    // 履歴の行は消えずに残る（transaction_id だけ NULL になる）
    const kept = await db().classificationChange.findFirstOrThrow({ where: { changeGroup: second.changeGroup! } });
    expect(kept.transactionId).toBeNull();
    expect(kept.transactionIdentifier).toBe(ids[1]);
  });

  it('Django が書いた履歴（ハイフン無しの UUID で渡されても）を戻せる', async () => {
    const { caseId, ids } = await seedCase(db(), '架空', [{ description: 'a', category: '生活費' }]);
    const group = '0f8fad5b-d9cb-469f-a165-70867728950e';
    await db().classificationChange.create({
      data: {
        caseId, transactionId: ids[0], transactionIdentifier: ids[0]!, transactionDescription: 'a',
        oldCategory: '未分類', newCategory: '生活費', changeGroup: group, source: 'manual',
      },
    });
    const r = await undoLatest(db(), caseId, group.replaceAll('-', '').toUpperCase());
    expect(r).toMatchObject({ success: true, count: 1, restoredCategories: ['未分類'] });
  });
});

describe('範囲削除と復元', () => {
  it('控えを Django と同じ形で残して消し、同じ id で戻す', async () => {
    const { caseId, ids, accounts } = await seedCase(db(), '架空', [
      { date: '2025-04-01', description: 'a', amountOut: 1000, balance: 9000 },
      { date: null, description: null, amountIn: 500, memo: 'メモ', isFlagged: true },
      { date: '2025-04-03', description: 'c' },
    ]);
    const [first, second, third] = ids as [bigint, bigint, bigint];

    const preview = await previewDeleteByRange(db(), caseId, Number(second), Number(first));
    expect(preview).toEqual({
      startId: Number(first),
      endId: Number(second),
      count: 2,
      sample: [
        { id: Number(first), date: '2025-04-01', description: 'a', amountOut: 1000, amountIn: 0 },
        { id: Number(second), date: '', description: '', amountOut: 0, amountIn: 500 },
      ],
    });

    expect(await deleteByRange(db(), caseId, Number(second), Number(first))).toBe(2);
    expect(await db().transaction.count()).toBe(1);

    const backup = await db().deletionBackup.findFirstOrThrow();
    expect([backup.startId, backup.endId]).toEqual([first, second]);
    const accountId = Number(accounts.get('1234567'));
    expect(backup.transactionData).toEqual([
      {
        id: Number(first), account_id: accountId, date: '2025-04-01', description: 'a', amount_out: 1000, amount_in: 0,
        balance: 9000, is_large: false, is_transfer: false, transfer_to: null, category: '未分類',
        classification_score: 0, is_flagged: false, memo: null,
      },
      {
        id: Number(second), account_id: accountId, date: null, description: null, amount_out: 0, amount_in: 500,
        balance: null, is_large: false, is_transfer: false, transfer_to: null, category: '未分類',
        classification_score: 0, is_flagged: true, memo: 'メモ',
      },
    ]);
    expect(await latestDeletionBackup(db(), caseId)).toMatchObject({ id: Number(backup.id), transactionCount: 2 });

    expect(await restoreDeletionBackup(db(), caseId, backup.id)).toEqual([2, 0]);
    const restored = await db().transaction.findMany({ orderBy: { id: 'asc' } });
    expect(restored.map((t) => t.id)).toEqual([first, second, third]);
    expect(restored[0]?.descriptionSearch).toBe('a');
    expect(restored[1]?.memo).toBe('メモ');
    expect(await latestDeletionBackup(db(), caseId)).toBeNull();
    // 2回目は何もしない
    expect(await restoreDeletionBackup(db(), caseId, backup.id)).toEqual([0, 0]);
  });

  it('対象が無ければ控えを作らない。同じ id がすでにあれば飛ばす', async () => {
    const { caseId, ids } = await seedCase(db(), '架空', [{ description: 'a' }, { description: 'b' }]);
    expect(await deleteByRange(db(), caseId, 100, 200)).toBe(0);
    expect(await db().deletionBackup.count()).toBe(0);

    await deleteByRange(db(), caseId, Number(ids[0]), Number(ids[1]));
    const backup = await db().deletionBackup.findFirstOrThrow();
    // Django が書いた控えの日付は ISO 文字列。片方の id をよそで使われた状態にする
    await db().transaction.create({
      data: { id: ids[0], caseId, descriptionSearch: '', description: '後から入った行' },
    });
    expect(await restoreDeletionBackup(db(), caseId, backup.id)).toEqual([1, 1]);
  });
});
