// 未分類の取引へ分類を当てる操作（Django 版 TransactionService の run_classifier /
// apply_classification_rules / get_classification_preview / apply_selected_classifications /
// apply_ai_suggestion / bulk_apply_ai_suggestions と、パターン登録＋一括分類）。
//
// 対象の取引は案件のロックを取ってから読む。Django はロックの外で読んで分類を決めていたので、
// 読んでから書くまでの間に手で分類した取引を、自動分類が古い判定で上書きすることがあった。

import type { PrismaClient } from '@prisma/client';
import { UNCATEGORIZED } from '../lib/categories.js';
import {
  classifyUnclassified,
  matchScore,
  matchWithPriority,
  suggestionUpdates,
  type ClassifiableTransaction,
  type ClassificationUpdate,
  type ClassifierSettings,
  type MatchType,
} from '../lib/classify.js';
import { toDateString, toId } from '../json.js';
import { applyChanges, lockCase, type ApplyResult, type Tx } from './classificationHistory.js';
import { addPattern, getClassifierSettings, type PatternScope } from './settings.js';

const NO_RESULT: ApplyResult = { count: 0, changeGroup: null };

// 自動分類の対象（未分類で付箋の無いもの）
const targetWhere = (caseId: bigint) => ({ caseId, category: UNCATEGORIZED, isFlagged: false });

async function loadTargets(tx: Tx, caseId: bigint, ids?: bigint[]) {
  const rows = await tx.transaction.findMany({
    where: { ...targetWhere(caseId), ...(ids ? { id: { in: ids } } : {}) },
    select: { id: true, description: true, amountOut: true, category: true, isFlagged: true },
    orderBy: { id: 'asc' },
  });
  return rows.map((r) => ({ ...r, id: toId(r.id) }));
}

// 分類を当て、点数のあるものは点数も書く（点数は履歴の対象外。Django も bulk_update で別に書いていた）
async function writeUpdates(tx: Tx, caseId: bigint, updates: ClassificationUpdate[], source: string) {
  if (updates.length === 0) return NO_RESULT;
  const result = await applyChanges(tx, caseId, new Map(updates.map((u) => [u.id, u.category])), source);
  const byScore = new Map<number, bigint[]>();
  for (const u of updates) {
    if (u.classificationScore === undefined) continue;
    byScore.set(u.classificationScore, [...(byScore.get(u.classificationScore) ?? []), BigInt(u.id)]);
  }
  for (const [score, ids] of byScore) {
    await tx.transaction.updateMany({ where: { id: { in: ids } }, data: { classificationScore: score } });
  }
  return result;
}

async function classifyCase(
  db: PrismaClient,
  caseId: bigint,
  decide: (targets: ClassifiableTransaction[], settings: ClassifierSettings) => ClassificationUpdate[],
  source: string,
): Promise<ApplyResult> {
  const settings = await getClassifierSettings(db, caseId);
  return db.$transaction(async (tx) => {
    await lockCase(tx, caseId);
    return writeUpdates(tx, caseId, decide(await loadTargets(tx, caseId), settings), source);
  });
}

// 「自動分類」: あいまい一致まで使い、点数も残す
export const runClassifier = (db: PrismaClient, caseId: bigint) =>
  classifyCase(db, caseId, (t, s) => classifyUnclassified(t, s, { useFuzzy: true }), 'auto_classifier');

// 「ルール適用」: キーワードが含まれるかだけを見る
export const applyClassificationRules = (db: PrismaClient, caseId: bigint) =>
  classifyCase(db, caseId, (t, s) => classifyUnclassified(t, s, { useFuzzy: false }), 'classification_rule');

// 分類候補の第1候補のうち、点数が min 以上のものを一括で当てる。
// Django は「自動分類」と同じ判定（classify_by_rules: 閾値は設定のまま・贈与は金額で判定・
// 「その他」も当てる）で当てていて、画面の候補（下げた閾値の fuzzy 候補）と別物だった。
// 「85%以上」を押しても画面に出ている 85〜89 点の候補は当たらず、画面に無い分類が当たることもあった
export const bulkApplyAiSuggestions = (db: PrismaClient, caseId: bigint, minScore: number) =>
  classifyCase(db, caseId, (t, s) => suggestionUpdates(t, s, minScore), 'ai_bulk');

export type PreviewItem = {
  txId: number;
  date: string | null;
  description: string;
  amountOut: number;
  amountIn: number;
  currentCategory: string;
  proposedCategory: string;
  matchedKeyword: string;
  matchType: MatchType;
  score: number;
};

// 「ルール適用」で何がどう変わるかの一覧（書き込みはしない）。新しい日付の順
export async function classificationPreview(db: PrismaClient, caseId: bigint): Promise<PreviewItem[]> {
  const settings = await getClassifierSettings(db, caseId);
  const rows = await db.transaction.findMany({
    where: targetWhere(caseId),
    orderBy: [{ date: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
  });
  const items: PreviewItem[] = [];
  for (const t of rows) {
    if (!t.description) continue;
    const hit = matchWithPriority(t.description, settings.casePatterns, settings.globalPatterns);
    if (!hit) continue;
    items.push({
      txId: toId(t.id),
      date: toDateString(t.date),
      description: t.description,
      amountOut: t.amountOut,
      amountIn: t.amountIn,
      currentCategory: t.category,
      proposedCategory: hit.category,
      matchedKeyword: hit.keyword,
      matchType: hit.matchType,
      score: matchScore(hit.matchType, hit.keyword, t.description),
    });
  }
  return items;
}

// プレビューで選んだ取引にだけ当てる（その時点でまだ未分類のものだけ）
export async function applySelectedClassifications(db: PrismaClient, caseId: bigint, ids: bigint[]): Promise<ApplyResult> {
  if (ids.length === 0) return NO_RESULT;
  const settings = await getClassifierSettings(db, caseId);
  return db.$transaction(async (tx) => {
    await lockCase(tx, caseId);
    const targets = await loadTargets(tx, caseId, ids);
    const updates: ClassificationUpdate[] = [];
    for (const t of targets) {
      const hit = t.description ? matchWithPriority(t.description, settings.casePatterns, settings.globalPatterns) : null;
      if (hit) updates.push({ id: t.id, category: hit.category });
    }
    return writeUpdates(tx, caseId, updates, 'classification_preview');
  });
}

// 提案を1件だけ採る。変わったときだけ点数を 100 にする
export async function applySuggestion(db: PrismaClient, caseId: bigint, txId: bigint, category: string): Promise<ApplyResult> {
  return db.$transaction(async (tx) => {
    await lockCase(tx, caseId);
    const result = await applyChanges(tx, caseId, new Map([[String(txId), category]]), 'ai_suggestion');
    if (result.count > 0) {
      await tx.transaction.updateMany({ where: { id: txId, caseId }, data: { classificationScore: 100 } });
    }
    return result;
  });
}

// キーワードを登録し、その案件でキーワードを含む未分類の取引をまとめて分類する。
// Django はキーワードが空で登録できなくても分類だけは進めていた（空文字は全件に含まれるので
// 未分類の全件が1つの分類になる）。ここでは登録できなければ何もしない。
export async function classifyAndRegisterPattern(
  db: PrismaClient,
  caseId: bigint,
  scope: PatternScope,
  category: string,
  keyword: string,
): Promise<ApplyResult | null> {
  const kw = keyword.trim();
  if (!kw || !(await addPattern(db, scope, caseId, category, kw))) return null;
  return db.$transaction(async (tx) => {
    await lockCase(tx, caseId);
    const rows = await tx.transaction.findMany({
      where: { ...targetWhere(caseId), description: { contains: kw, mode: 'insensitive' } },
      select: { id: true },
    });
    return applyChanges(tx, caseId, new Map(rows.map((r) => [String(r.id), category])), 'pattern_registration');
  });
}

// キーワードを登録したら未分類の何件に当たるか（この案件 / ほかの案件）
export async function patternImpact(db: PrismaClient, caseId: bigint, keyword: string) {
  const where = { category: UNCATEGORIZED, isFlagged: false, description: { contains: keyword, mode: 'insensitive' as const } };
  const [currentCaseCount, otherCasesCount] = await Promise.all([
    db.transaction.count({ where: { ...where, caseId } }),
    db.transaction.count({ where: { ...where, caseId: { not: caseId } } }),
  ]);
  return { currentCaseCount, otherCasesCount, totalCount: currentCaseCount + otherCasesCount };
}
