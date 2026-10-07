// 分類の手直しと取り消し（Django: 分析画面の update_category / bulk_update_categories /
//   bulk_update_transfer_categories / undo_classification_change）

import type { PrismaClient } from '@prisma/client';
import { parseId } from '../json.js';
import { isRecord, optionalText } from '../input.js';
import { applyChanges, latestSummary, undoLatest } from '../services/classificationHistory.js';
import { updateCategory } from '../services/transactions.js';
import { fail, ok, readBody, type CaseRouter } from './common.js';

// 変更後も今の絞り込みで表示されるか（画面が行を消すかどうかの判定に使う）
function stillVisible(category: string, filterCategories: unknown, mode: unknown): boolean {
  const list = Array.isArray(filterCategories) ? filterCategories.map(String) : [];
  if (list.length === 0) return true;
  return mode === 'exclude' ? !list.includes(category) : list.includes(category);
}

// 履歴の source に入る画面の名前。任意の文字列をそのまま記録しないよう形だけ絞る
const SOURCE_TAB_RE = /^[a-z_]{1,40}$/;

export function categoryRoutes(r: CaseRouter, db: PrismaClient) {
  r.post('/:caseId/categories/update', async (c) => {
    const body = await readBody(c);
    const category = optionalText(body.category);
    if (body.txId === undefined || body.txId === null || body.txId === '' || !category) {
      return fail(c, 'パラメータが不足しています');
    }
    const txId = parseId(body.txId);
    if (!txId) return fail(c, '不正な取引IDです');
    const { count, changeGroup } = await updateCategory(db, c.get('caseId'), txId, category, body.applyAll === true);
    return ok(c, {
      count,
      category,
      changeGroup,
      stillVisible: stillVisible(category, body.filterCategories, body.filterCategoryMode),
    });
  });

  // 本文の updates は {取引ID: 新しい分類}。Django はフォームの接頭辞（cat- / uncat- /
  // transfer-src- / transfer-dest-）から組み立てていたが、JSON では画面が直接この形で送る。
  r.post('/:caseId/categories/bulk', async (c) => {
    const body = await readBody(c);
    if (!isRecord(body.updates)) return fail(c, 'パラメータが不足しています');
    const updates: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(body.updates)) updates[k] = optionalText(v);
    const tab = typeof body.sourceTab === 'string' && SOURCE_TAB_RE.test(body.sourceTab) ? body.sourceTab : 'large';
    const { count, changeGroup } = await applyChanges(db, c.get('caseId'), updates, `bulk_${tab}`);
    return ok(c, { count, changeGroup, message: count > 0 ? `${count}件の分類を更新しました。` : '変更はありませんでした。' });
  });

  r.get('/:caseId/history/latest', async (c) => ok(c, { latest: await latestSummary(db, c.get('caseId')) }));

  r.post('/:caseId/history/undo', async (c) => {
    const result = await undoLatest(db, c.get('caseId'), (await readBody(c)).changeGroup);
    if (!result.success) return fail(c, result.error, result.status);
    return ok(c, {
      count: result.count,
      restoredCategories: result.restoredCategories,
      message: `${result.count}件を変更直前の分類へ戻しました。`,
    });
  });
}
