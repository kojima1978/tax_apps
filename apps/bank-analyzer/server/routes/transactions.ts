// 取引の読み書き・まとめての削除・一括置換・ID 範囲の削除と復元
// （Django: api-get/create/delete-transaction・api-toggle-flag・api-delete-unclassified・
//   api-field-values・api-range-delete-preview と、分析画面の update_transaction / update_memo /
//   delete_account / delete_duplicates / bulk_replace_field / delete_by_range / restore_range_backup）

import type { PrismaClient } from '@prisma/client';
import { parseId } from '../json.js';
import { optionalText, parseIdList } from '../input.js';
import {
  deleteByRange,
  latestDeletionBackup,
  previewDeleteByRange,
  restoreDeletionBackup,
} from '../services/rangeDelete.js';
import {
  REPLACEABLE_FIELDS,
  bulkReplaceField,
  createTransaction,
  deleteAccountTransactions,
  deleteDuplicates,
  deleteTransaction,
  deleteUnclassified,
  fieldValues,
  getTransaction,
  isReplaceableField,
  toggleFlag,
  updateMemo,
  updateTransaction,
  validateReplace,
} from '../services/transactions.js';
import { fail, ok, readBody, type CaseRouter } from './common.js';

const TX_NOT_FOUND = '取引が見つかりません';

// ID 範囲の端。Django の int() と同じく符号付きの整数を受ける（0 や負は何にも当たらないだけ）
function parseRangeEnd(value: unknown): number | null {
  const s = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!/^[+-]?\d{1,15}$/.test(s)) return null;
  return Number(s);
}

export function transactionRoutes(r: CaseRouter, db: PrismaClient) {
  r.post('/:caseId/transactions', async (c) => {
    const result = await createTransaction(db, c.get('caseId'), await readBody(c));
    if (!result.ok) return fail(c, result.error, result.status);
    return ok(c, { transaction: result.transaction, message: '取引を追加しました' });
  });

  r.get('/:caseId/transactions/:txId', async (c) => {
    const txId = parseId(c.req.param('txId'));
    const tx = txId && (await getTransaction(db, c.get('caseId'), txId));
    if (!tx) return fail(c, TX_NOT_FOUND, 404);
    return ok(c, { transaction: tx });
  });

  r.patch('/:caseId/transactions/:txId', async (c) => {
    const txId = parseId(c.req.param('txId'));
    if (!txId) return fail(c, TX_NOT_FOUND, 404);
    const result = await updateTransaction(db, c.get('caseId'), txId, await readBody(c));
    if (!result.ok) return fail(c, result.error, result.status);
    return ok(c, { transaction: result.transaction, message: '取引データを更新しました。' });
  });

  r.delete('/:caseId/transactions/:txId', async (c) => {
    const txId = parseId(c.req.param('txId'));
    if (!txId || !(await deleteTransaction(db, c.get('caseId'), txId))) return fail(c, TX_NOT_FOUND, 404);
    return ok(c, { message: '取引を削除しました' });
  });

  r.post('/:caseId/transactions/:txId/flag', async (c) => {
    const txId = parseId(c.req.param('txId'));
    const state = txId ? await toggleFlag(db, c.get('caseId'), txId) : null;
    if (state === null) return fail(c, TX_NOT_FOUND, 404);
    return ok(c, { isFlagged: state, message: state ? '付箋を追加しました' : '付箋を外しました' });
  });

  r.put('/:caseId/transactions/:txId/memo', async (c) => {
    const txId = parseId(c.req.param('txId'));
    const memo = optionalText((await readBody(c)).memo);
    if (!txId || !(await updateMemo(db, c.get('caseId'), txId, memo))) return fail(c, TX_NOT_FOUND, 404);
    return ok(c, { memo: memo ?? '', message: 'メモを更新しました。' });
  });

  r.post('/:caseId/transactions/delete-unclassified', async (c) => {
    const raw = (await readBody(c)).ids;
    if (!Array.isArray(raw) || raw.length === 0) return fail(c, '削除する未分類取引が選択されていません');
    const ids = parseIdList(raw);
    if (!ids) return fail(c, '取引IDが正しくありません');
    const { count, deletedIds } = await deleteUnclassified(db, c.get('caseId'), ids);
    if (count === 0) return fail(c, '削除できる未分類取引がありませんでした', 404);
    return ok(c, { count, deletedIds, message: `${count}件の未分類取引を削除しました` });
  });

  r.post('/:caseId/transactions/delete-duplicates', async (c) => {
    const ids = parseIdList((await readBody(c)).ids);
    if (!ids) return fail(c, '取引IDが正しくありません');
    const count = await deleteDuplicates(db, c.get('caseId'), ids);
    if (count === 0) return fail(c, '削除対象が選択されていません。');
    return ok(c, { count, message: `${count}件の重複データを削除しました。` });
  });

  // 口座ごと消す（取引も）。口座番号は記号を含みうるので URL ではなく本文で受ける
  r.post('/:caseId/accounts/delete', async (c) => {
    const accountNumber = optionalText((await readBody(c)).accountNumber);
    if (!accountNumber) return fail(c, '口座番号が指定されていません');
    const count = await deleteAccountTransactions(db, c.get('caseId'), accountNumber);
    return ok(c, { count, message: `口座番号: ${accountNumber} のデータ（${count}件）を削除しました。` });
  });

  r.get('/:caseId/field-values', async (c) => {
    const field = c.req.query('field') ?? '';
    if (!field) return fail(c, 'フィールド名が指定されていません');
    // Django は対象外の名前に空の一覧を返していた
    const values = isReplaceableField(field) ? await fieldValues(db, c.get('caseId'), field) : [];
    return ok(c, { values });
  });

  r.post('/:caseId/bulk-replace', async (c) => {
    const body = await readBody(c);
    const oldValue = typeof body.oldValue === 'string' ? body.oldValue.trim() : '';
    const newValue = typeof body.newValue === 'string' ? body.newValue.trim() : '';
    const error = validateReplace(body.field, oldValue, newValue);
    if (error || !isReplaceableField(body.field)) return fail(c, error ?? '不正なフィールドが指定されました。');
    const count = await bulkReplaceField(db, c.get('caseId'), body.field, oldValue, newValue);
    if (count === 0) return fail(c, '該当するデータがありませんでした。', 404);
    const label = REPLACEABLE_FIELDS[body.field];
    return ok(c, { count, message: `${label}「${oldValue}」を「${newValue}」に置換しました（${count}件）。` });
  });

  // --- ID 範囲の削除と復元 ---

  r.get('/:caseId/range-delete/preview', async (c) => {
    const start = parseRangeEnd(c.req.query('startId'));
    const end = parseRangeEnd(c.req.query('endId'));
    if (start === null || end === null) return fail(c, '開始IDと終了IDを整数で入力してください。');
    return ok(c, await previewDeleteByRange(db, c.get('caseId'), start, end));
  });

  // 画面で見た件数（expectedCount）と今の件数が違えば消さない。見てから消すまでの間に
  // 取り込みなどで範囲の中身が変わっていたら、見ていない行まで消すことになるため。
  r.post('/:caseId/range-delete', async (c) => {
    const body = await readBody(c);
    const start = parseRangeEnd(body.startId);
    const end = parseRangeEnd(body.endId);
    const expected = parseRangeEnd(body.expectedCount);
    if (start === null || end === null || expected === null) return fail(c, 'IDは整数で入力してください。');
    if (String(body.confirmation ?? '').trim() !== '削除') return fail(c, '確認欄に「削除」と入力してください。');
    const caseId = c.get('caseId');
    const preview = await previewDeleteByRange(db, caseId, start, end, 0);
    if (preview.count !== expected) {
      return fail(c, '削除対象の件数が変わりました。プレビューを更新してから再実行してください。', 409);
    }
    const count = await deleteByRange(db, caseId, start, end);
    if (count === 0) return fail(c, '指定した範囲に削除対象の取引がありませんでした。', 404);
    return ok(c, {
      count,
      message: `ID ${preview.startId}〜${preview.endId} の範囲で ${count}件を削除しました。バックアップから復元できます。`,
    });
  });

  r.get('/:caseId/range-delete/backup', async (c) => ok(c, { backup: await latestDeletionBackup(db, c.get('caseId')) }));

  r.post('/:caseId/range-delete/restore', async (c) => {
    const backupId = parseId((await readBody(c)).backupId);
    if (!backupId) return fail(c, 'バックアップ情報が正しくありません。');
    const [restored, skipped] = await restoreDeletionBackup(db, c.get('caseId'), backupId);
    if (restored === 0) return fail(c, '復元できる取引がありませんでした。', 404);
    const message = `${restored}件の取引を復元しました。` + (skipped ? ` IDが重複した${skipped}件は復元していません。` : '');
    return ok(c, { restored, skipped, message });
  });
}
