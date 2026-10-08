// 自動分類とキーワード（分類パターン）の操作
// （Django: 分析画面の run_classifier / apply_rules / run_auto_classify / apply_ai_suggestion /
//   bulk_apply_ai_suggestions / classification-preview / apply-selected と、handlers/pattern.py）

import type { PrismaClient } from '@prisma/client';
import { parseId } from '../json.js';
import { isRecord, optionalText, parseIdList } from '../input.js';
import {
  applyClassificationRules,
  applySelectedClassifications,
  applySuggestion,
  bulkApplyAiSuggestions,
  classificationPreview,
  classifyAndRegisterPattern,
  patternImpact,
  runClassifier,
} from '../services/classification.js';
import {
  addPattern,
  applyPatternChanges,
  deletePattern,
  getCasePatterns,
  getGlobalPatterns,
  movePattern,
  updatePattern,
  type PatternScope,
} from '../services/settings.js';
import { fail, ok, readBody, type CaseRouter } from './common.js';

const MISSING = 'パラメータが不足しています';

// Django と同じく 'case' 以外はすべて全体のパターン扱い
const scopeOf = (v: unknown): PatternScope => (v === 'case' ? 'case' : 'global');

// 信頼度のしきい値（0〜100 の整数）。省略時は 95
function parseMinScore(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return 95;
  const s = String(v).trim();
  if (!/^\d{1,3}$/.test(s)) return null;
  const n = Number(s);
  return n <= 100 ? n : null;
}

export function classificationRoutes(r: CaseRouter, db: PrismaClient) {
  // --- 自動分類 ---

  r.post('/:caseId/classify/run', async (c) => {
    const { count, changeGroup } = await runClassifier(db, c.get('caseId'));
    return ok(c, { count, changeGroup, message: count > 0 ? '自動分類が完了しました。' : 'データがありません。' });
  });

  // Django には「ルール適用」と「自動分類（AJAX）」の2つの口があったが、中身は同じで
  // 文言だけが違った。画面が1つにまとまるので口も1つにし、文言は件数が分かる方に揃える。
  r.post('/:caseId/classify/rules', async (c) => {
    const { count, changeGroup } = await applyClassificationRules(db, c.get('caseId'));
    return ok(c, {
      count,
      changeGroup,
      message:
        count > 0
          ? `キーワードルールを適用し、${count}件を分類しました。`
          : '未分類の取引がないか、マッチするルールがありませんでした。',
    });
  });

  r.get('/:caseId/classify/preview', async (c) => ok(c, { items: await classificationPreview(db, c.get('caseId')) }));

  r.post('/:caseId/classify/apply-selected', async (c) => {
    const raw = (await readBody(c)).ids;
    const ids = parseIdList(raw);
    if (!ids) return fail(c, '取引IDが正しくありません');
    if (ids.length === 0) return fail(c, '適用する取引が選択されていません。');
    const { count, changeGroup } = await applySelectedClassifications(db, c.get('caseId'), ids);
    return ok(c, { count, changeGroup, message: `${count}件の取引を分類しました。` });
  });

  r.post('/:caseId/classify/suggestion', async (c) => {
    const body = await readBody(c);
    const category = optionalText(body.category);
    if (body.txId === undefined || body.txId === null || body.txId === '' || !category) return fail(c, MISSING);
    const txId = parseId(body.txId);
    if (!txId) return fail(c, '不正な取引IDです');
    const { count, changeGroup } = await applySuggestion(db, c.get('caseId'), txId, category);
    return ok(c, { count, category, changeGroup, message: `「${category}」に分類しました。` });
  });

  r.post('/:caseId/classify/bulk-suggestions', async (c) => {
    const minScore = parseMinScore((await readBody(c)).minScore);
    if (minScore === null) return fail(c, '信頼度は0〜100の整数で指定してください');
    const { count, changeGroup } = await bulkApplyAiSuggestions(db, c.get('caseId'), minScore);
    return ok(c, { count, changeGroup, message: `信頼度${minScore}%以上の候補${count}件を適用しました。` });
  });

  // --- キーワード ---

  const scopeLabel = async (scope: PatternScope, caseId: bigint) => {
    if (scope === 'global') return 'グローバル';
    const row = await db.case.findUnique({ where: { id: caseId }, select: { name: true } });
    return `案件「${row?.name ?? ''}」`;
  };

  r.post('/:caseId/patterns/add', async (c) => {
    const body = await readBody(c);
    const category = optionalText(body.category);
    const keyword = optionalText(body.keyword);
    if (!category || !keyword) return fail(c, MISSING);
    const scope = scopeOf(body.scope);
    const caseId = c.get('caseId');
    // Django と同じく、既に登録済みのキーワードは「追加した」扱い（何も変わらない）
    if (!(await addPattern(db, scope, caseId, category, keyword))) return fail(c, `キーワード「${keyword}」を追加できませんでした。`);
    return ok(c, { category, keyword, scope, message: `キーワード「${keyword}」を「${category}」に追加しました（${await scopeLabel(scope, caseId)}）。` });
  });

  r.post('/:caseId/patterns/delete', async (c) => {
    const body = await readBody(c);
    const category = optionalText(body.category);
    const keyword = optionalText(body.keyword);
    if (!category || !keyword) return fail(c, MISSING);
    const scope = scopeOf(body.scope);
    const caseId = c.get('caseId');
    if (!(await deletePattern(db, scope, caseId, category, keyword))) return fail(c, `キーワード「${keyword}」が見つかりません。`, 404);
    return ok(c, { category, keyword, message: `キーワード「${keyword}」を削除しました（${await scopeLabel(scope, caseId)}）。` });
  });

  r.post('/:caseId/patterns/update', async (c) => {
    const body = await readBody(c);
    const category = optionalText(body.category);
    const oldKeyword = optionalText(body.oldKeyword);
    const newKeyword = optionalText(body.newKeyword);
    if (!category || !oldKeyword || !newKeyword) return fail(c, MISSING);
    const scope = scopeOf(body.scope);
    const caseId = c.get('caseId');
    if (!(await updatePattern(db, scope, caseId, category, oldKeyword, newKeyword))) {
      return fail(c, `キーワード「${oldKeyword}」が見つからないか、更新できません。`);
    }
    return ok(c, {
      category,
      oldKeyword,
      newKeyword,
      message: `キーワードを「${oldKeyword}」→「${newKeyword}」に更新しました（${await scopeLabel(scope, caseId)}）。`,
    });
  });

  r.post('/:caseId/patterns/move', async (c) => {
    const body = await readBody(c);
    const category = optionalText(body.category);
    const keyword = optionalText(body.keyword);
    const { fromScope, toScope } = body;
    if (!category || !keyword || !fromScope || !toScope) return fail(c, MISSING);
    if (fromScope === toScope) return fail(c, '移動元と移動先が同じです');
    const valid = (fromScope === 'global' && toScope === 'case') || (fromScope === 'case' && toScope === 'global');
    if (!valid || !(await movePattern(db, c.get('caseId'), category, keyword, fromScope, toScope))) {
      return fail(c, `キーワード「${keyword}」の移動に失敗しました。`);
    }
    const direction = fromScope === 'global' ? 'グローバル → 案件固有' : '案件固有 → グローバル';
    return ok(c, { category, keyword, direction, message: `キーワード「${keyword}」を移動しました（${direction}）。` });
  });

  r.get('/:caseId/patterns/keywords', async (c) => {
    const category = c.req.query('category')?.trim();
    if (!category) return fail(c, 'カテゴリーが指定されていません');
    const [globalPatterns, casePatterns] = await Promise.all([getGlobalPatterns(db), getCasePatterns(db, c.get('caseId'))]);
    return ok(c, {
      category,
      globalKeywords: globalPatterns.get(category) ?? [],
      caseKeywords: casePatterns.get(category) ?? [],
    });
  });

  r.get('/:caseId/patterns/impact', async (c) => {
    const keyword = c.req.query('keyword')?.trim();
    if (!keyword) return fail(c, 'キーワードが指定されていません');
    return ok(c, await patternImpact(db, c.get('caseId'), keyword));
  });

  r.post('/:caseId/patterns/bulk', async (c) => {
    const changes = (await readBody(c)).changes;
    if (!Array.isArray(changes) || changes.length === 0) return fail(c, '変更がありません');
    const objects = changes.filter(isRecord);
    return ok(c, await applyPatternChanges(db, c.get('caseId'), objects));
  });

  r.post('/:caseId/patterns/classify-and-register', async (c) => {
    const body = await readBody(c);
    const category = optionalText(body.category);
    const keyword = optionalText(body.keyword);
    if (!category || !keyword) return fail(c, MISSING);
    const scope = scopeOf(body.scope);
    const result = await classifyAndRegisterPattern(db, c.get('caseId'), scope, category, keyword);
    if (!result) return fail(c, `キーワード「${keyword}」を登録できませんでした。`);
    return ok(c, {
      count: result.count,
      category,
      keyword,
      scope,
      changeGroup: result.changeGroup,
      message: `キーワード「${keyword}」を登録し、${result.count}件を「${category}」に分類しました。`,
    });
  });
}
