// 全体の設定と分類パターン（Django 版 lib/config/settings.py・patterns.py・views/settings.py）。
//
// Django は data/user_settings.json 1つに入れていた。ここではその最上位のキーを1行ずつ
// analyzer_appsetting に置く（キー名も値の形も同じ。例: FUZZY_MATCHING は snake_case の object）。
// 値の列は jsonb ではなく json ── 分類パターンはカテゴリーの順番が結果に効くため（categories.ts）。
//
// Django との違いは2つ:
//   - 分析パラメータを保存しても分類パターンには触らない。Django は保存のたびに「今のパターン」を
//     書き戻していたので、一度保存すると既定のパターン（コード側）を直しても反映されなくなっていた
//   - パターンの読み→書きをロックの中で行う。Django はファイルを読んで書くだけだったので、
//     同時に2つ追加すると片方が消えた

import type { Prisma, PrismaClient } from '@prisma/client';
import { DEFAULT_ANALYSIS_SETTINGS, type AnalysisSettings } from '../lib/analyze.js';
import {
  DEFAULT_FUZZY_CONFIG,
  DEFAULT_GIFT_THRESHOLD,
  DEFAULT_PATTERNS,
  normalizeCategory,
  normalizePatterns,
  type FuzzyConfig,
  type Patterns,
} from '../lib/categories.js';
import type { ClassifierSettings } from '../lib/classify.js';
import { inTransaction, lockCase, type Tx } from './classificationHistory.js';

type Db = PrismaClient | Tx;

const KEY = {
  largeAmountThreshold: 'LARGE_AMOUNT_THRESHOLD',
  transferDaysWindow: 'TRANSFER_DAYS_WINDOW',
  transferTolerance: 'TRANSFER_AMOUNT_TOLERANCE',
  transferDateMode: 'TRANSFER_DATE_MODE',
  giftThreshold: 'GIFT_THRESHOLD',
  fuzzy: 'FUZZY_MATCHING',
  patterns: 'CLASSIFICATION_PATTERNS',
} as const;

async function readRaw(db: Db): Promise<Record<string, unknown>> {
  const rows = await db.appSetting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

async function writeRaw(db: Db, key: string, value: unknown): Promise<void> {
  const json = value as Prisma.InputJsonValue;
  await db.appSetting.upsert({ where: { key }, create: { key, value: json }, update: { value: json } });
}

// ---------------------------------------------------------------------------
// 分析パラメータ
// ---------------------------------------------------------------------------

export type AppSettings = AnalysisSettings & { giftThreshold: number; fuzzy: FuzzyConfig };

const int = (v: unknown, def: number) => {
  const n = typeof v === 'number' ? v : Number(v);
  return v === undefined || v === null || !Number.isFinite(n) ? def : Math.trunc(n);
};

function fuzzyOf(raw: unknown): FuzzyConfig {
  // Django の get_fuzzy_config: 既定値に保存値を上書き
  const v = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    enabled: 'enabled' in v ? Boolean(v.enabled) : DEFAULT_FUZZY_CONFIG.enabled,
    threshold: int(v.threshold, DEFAULT_FUZZY_CONFIG.threshold),
    useTokenSetRatio: 'use_token_set_ratio' in v ? Boolean(v.use_token_set_ratio) : DEFAULT_FUZZY_CONFIG.useTokenSetRatio,
  };
}

export async function getAppSettings(db: Db): Promise<AppSettings> {
  const raw = await readRaw(db);
  const d = DEFAULT_ANALYSIS_SETTINGS;
  return {
    largeAmountThreshold: int(raw[KEY.largeAmountThreshold], d.largeAmountThreshold),
    transferDaysWindow: int(raw[KEY.transferDaysWindow], d.transferDaysWindow),
    transferTolerance: int(raw[KEY.transferTolerance], d.transferTolerance),
    transferDateMode: raw[KEY.transferDateMode] === 'both' ? 'both' : 'after_only',
    giftThreshold: int(raw[KEY.giftThreshold], DEFAULT_GIFT_THRESHOLD),
    fuzzy: fuzzyOf(raw[KEY.fuzzy]),
  };
}

export type AnalysisParamsInput = {
  largeAmountThreshold: unknown;
  transferDaysWindow: unknown;
  transferTolerance: unknown;
  transferDateMode: unknown;
  giftThreshold: unknown;
  fuzzyEnabled: unknown;
  fuzzyThreshold: unknown;
};

// Django の SettingsForm と同じ範囲
const RANGES: Record<Exclude<keyof AnalysisParamsInput, 'transferDateMode' | 'fuzzyEnabled'>, [string, number, number | null]> = {
  largeAmountThreshold: ['多額取引の閾値', 0, 1_000_000_000],
  transferDaysWindow: ['資金移動の検出期間', 0, 30],
  transferTolerance: ['資金移動の金額許容誤差', 0, null],
  giftThreshold: ['贈与判定の閾値', 0, 1_000_000_000],
  fuzzyThreshold: ['ファジーマッチングの類似度閾値', 0, 100],
};

export type SaveResult = { ok: true; settings: AppSettings } | { ok: false; errors: Record<string, string> };

export async function saveAnalysisParams(db: PrismaClient, input: AnalysisParamsInput): Promise<SaveResult> {
  const errors: Record<string, string> = {};
  const values = {} as Record<keyof typeof RANGES, number>;
  for (const [field, [label, min, max]] of Object.entries(RANGES) as [keyof typeof RANGES, (typeof RANGES)[keyof typeof RANGES]][]) {
    const v = input[field];
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < min || (max !== null && n > max)) {
      errors[field] = max === null ? `${label}は${min}以上の整数で入力してください。` : `${label}は${min}〜${max.toLocaleString('ja-JP')}の整数で入力してください。`;
    } else {
      values[field] = n;
    }
  }
  const mode = input.transferDateMode;
  if (mode !== 'after_only' && mode !== 'both') errors.transferDateMode = '資金移動の日付マッチングを選んでください。';
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  await db.$transaction(async (tx) => {
    await writeRaw(tx, KEY.largeAmountThreshold, values.largeAmountThreshold);
    await writeRaw(tx, KEY.transferDaysWindow, values.transferDaysWindow);
    await writeRaw(tx, KEY.transferTolerance, values.transferTolerance);
    await writeRaw(tx, KEY.transferDateMode, mode);
    await writeRaw(tx, KEY.giftThreshold, values.giftThreshold);
    await writeRaw(tx, KEY.fuzzy, {
      enabled: input.fuzzyEnabled === true || input.fuzzyEnabled === 'true' || input.fuzzyEnabled === 'on',
      threshold: values.fuzzyThreshold,
      fallback_to_substring: true,
      use_token_set_ratio: true,
    });
  });
  return { ok: true, settings: await getAppSettings(db) };
}

// ---------------------------------------------------------------------------
// 分類パターン
// ---------------------------------------------------------------------------

export type PatternMap = Map<string, string[]>;
export type PatternScope = 'global' | 'case';

const toObject = (p: PatternMap): Record<string, string[]> => Object.fromEntries(p);
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const asPatterns = (v: unknown): Patterns | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Patterns) : null);

// 保存値（無ければ既定）。古いカテゴリー名が残っていれば寄せた形で保存し直す（Django と同じ）。
export async function getGlobalPatterns(db: Db): Promise<PatternMap> {
  const row = await db.appSetting.findUnique({ where: { key: KEY.patterns } });
  const stored = asPatterns(row?.value);
  const patterns = normalizePatterns(stored ?? DEFAULT_PATTERNS);
  // 書き戻しはロックの中で読み直してから（読んだ後に入った追加を消さないため）
  if (stored && !sameJson(toObject(patterns), stored)) await editIn(db, 'global', 0n, () => [true, true]);
  return patterns;
}

export async function getCasePatterns(db: Db, caseId: bigint): Promise<PatternMap> {
  const c = await db.case.findUnique({ where: { id: caseId }, select: { customPatterns: true } });
  const stored = asPatterns(c?.customPatterns) ?? {};
  const patterns = normalizePatterns(stored);
  if (c && !sameJson(toObject(patterns), stored)) await editIn(db, 'case', caseId, () => [true, true]);
  return patterns;
}

// 全体 → 案件固有の順に足し合わせる（案件にしか無いカテゴリーは後ろ）
export function mergePatterns(globalPatterns: PatternMap, casePatterns: PatternMap): PatternMap {
  const merged: PatternMap = new Map([...globalPatterns].map(([k, v]) => [k, [...v]]));
  for (const [category, keywords] of casePatterns) {
    const list = merged.get(category) ?? [];
    merged.set(category, list);
    for (const kw of keywords) if (!list.includes(kw)) list.push(kw);
  }
  return merged;
}

export async function getClassifierSettings(db: Db, caseId: bigint | null): Promise<ClassifierSettings> {
  const [settings, globalPatterns, casePatterns] = await Promise.all([
    getAppSettings(db),
    getGlobalPatterns(db),
    caseId === null ? Promise.resolve(new Map()) : getCasePatterns(db, caseId),
  ]);
  return {
    globalPatterns: toObject(globalPatterns),
    casePatterns: casePatterns.size > 0 ? toObject(casePatterns) : null,
    giftThreshold: settings.giftThreshold,
    fuzzy: settings.fuzzy,
  };
}

// 全体のパターンは行がまだ無いこともあるので、行ロックではなくアドバイザリロックで直列にする。
// 全体 → 案件の順で取る（移動は両方を取るため、順番を揃えて行き違いを作らない）。
const lockGlobalPatterns = (tx: Tx) => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('analyzer_appsetting:CLASSIFICATION_PATTERNS'))`;

type Edit = (p: PatternMap) => [ok: boolean, changed: boolean];

async function editGlobal(tx: Tx, edit: Edit): Promise<boolean> {
  const row = await tx.appSetting.findUnique({ where: { key: KEY.patterns } });
  const patterns = normalizePatterns(asPatterns(row?.value) ?? DEFAULT_PATTERNS);
  const [ok, changed] = edit(patterns);
  if (changed) await writeRaw(tx, KEY.patterns, toObject(patterns));
  return ok;
}

async function editCase(tx: Tx, caseId: bigint, edit: Edit): Promise<boolean> {
  const c = await tx.case.findUnique({ where: { id: caseId }, select: { customPatterns: true } });
  if (!c) return false;
  const patterns = normalizePatterns(asPatterns(c.customPatterns) ?? {});
  const [ok, changed] = edit(patterns);
  if (changed) await tx.case.update({ where: { id: caseId }, data: { customPatterns: toObject(patterns) } });
  return ok;
}

function editIn(db: Db, scope: PatternScope, caseId: bigint, edit: Edit): Promise<boolean> {
  return inTransaction(db, async (tx) => {
    if (scope === 'case') {
      await lockCase(tx, caseId);
      return editCase(tx, caseId, edit);
    }
    await lockGlobalPatterns(tx);
    return editGlobal(tx, edit);
  });
}

const addKeyword = (category: string, keyword: string): Edit => (p) => {
  const name = normalizeCategory(category);
  const list = p.get(name) ?? [];
  p.set(name, list);
  if (list.includes(keyword)) return [true, false];
  list.push(keyword);
  return [true, true];
};

const deleteKeyword = (category: string, keyword: string, removeEmpty: boolean): Edit => (p) => {
  const name = normalizeCategory(category);
  const list = p.get(name);
  const i = list?.indexOf(keyword) ?? -1;
  if (!list || i < 0) return [false, false];
  list.splice(i, 1);
  if (removeEmpty && list.length === 0) p.delete(name);
  return [true, true];
};

const updateKeyword = (category: string, oldKeyword: string, newKeyword: string): Edit => (p) => {
  const list = p.get(normalizeCategory(category));
  const i = list?.indexOf(oldKeyword) ?? -1;
  if (!list || i < 0) return [false, false];
  if (newKeyword !== oldKeyword && list.includes(newKeyword)) return [false, false];
  list[i] = newKeyword;
  return [true, true];
};

const trimmed = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

// 追加: すでにあれば何もせず成功。空のキーワードは失敗
export function addPattern(db: Db, scope: PatternScope, caseId: bigint, category: string, keyword: string): Promise<boolean> {
  const kw = trimmed(keyword);
  if (!kw) return Promise.resolve(false);
  return editIn(db, scope, caseId, addKeyword(category, kw));
}

// 削除: 全体のパターンは空になったカテゴリーも残し、案件固有は消す（Django と同じ）
export function deletePattern(db: Db, scope: PatternScope, caseId: bigint, category: string, keyword: string): Promise<boolean> {
  return editIn(db, scope, caseId, deleteKeyword(category, keyword, scope === 'case'));
}

// 書き換え: 同じカテゴリーに新しいキーワードがすでにあれば失敗。位置は保つ
export function updatePattern(
  db: Db,
  scope: PatternScope,
  caseId: bigint,
  category: string,
  oldKeyword: string,
  newKeyword: string,
): Promise<boolean> {
  const kw = trimmed(newKeyword);
  if (!kw) return Promise.resolve(false);
  return editIn(db, scope, caseId, updateKeyword(category, oldKeyword, kw));
}

// 全体 ⇔ 案件固有の移動。Django は削除と追加を別々に保存していたが、ここでは1つのトランザクションで
// （移動元から消えたのに移動先へ入らない、を作らない）
export function movePattern(
  db: Db,
  caseId: bigint,
  category: string,
  keyword: string,
  from: PatternScope,
  to: PatternScope,
): Promise<boolean> {
  if (from === to) return Promise.resolve(false);
  const kw = trimmed(keyword);
  return inTransaction(db, async (tx) => {
    await lockGlobalPatterns(tx);
    await lockCase(tx, caseId);
    const removed =
      from === 'global'
        ? await editGlobal(tx, deleteKeyword(category, keyword, false))
        : await editCase(tx, caseId, deleteKeyword(category, keyword, true));
    if (!removed || !kw) return false;
    return to === 'global' ? editGlobal(tx, addKeyword(category, kw)) : editCase(tx, caseId, addKeyword(category, kw));
  });
}

export type PatternChange = {
  action?: unknown;
  category?: unknown;
  keyword?: unknown;
  scope?: unknown;
  fromScope?: unknown;
  toScope?: unknown;
};

const scopeOf = (v: unknown): PatternScope => (v === 'case' ? 'case' : 'global');
const str = (v: unknown) => (typeof v === 'string' ? v : '');

// 分析画面のパターン一括変更（handle_bulk_pattern_changes）。1件ずつ当て、失敗しても続ける。
export async function applyPatternChanges(db: PrismaClient, caseId: bigint, changes: PatternChange[]) {
  let savedCount = 0;
  const errors: string[] = [];
  for (const change of changes) {
    const action = str(change.action);
    const category = str(change.category);
    const keyword = str(change.keyword);
    try {
      let ok = false;
      if (action === 'add') ok = await addPattern(db, scopeOf(change.scope), caseId, category, keyword);
      else if (action === 'delete') ok = await deletePattern(db, scopeOf(change.scope), caseId, category, keyword);
      else if (action === 'move') {
        const from = change.fromScope;
        const to = change.toScope;
        if ((from === 'global' && to === 'case') || (from === 'case' && to === 'global')) {
          ok = await movePattern(db, caseId, category, keyword, from, to);
        }
      }
      if (ok) savedCount++;
    } catch (e) {
      errors.push(`${action} ${category}/${keyword}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { savedCount, totalCount: changes.length, errors: errors.length > 0 ? errors : null };
}

// 設定画面のパターン一括変更（_handle_settings_bulk_pattern_changes）。全体のパターンだけを対象に、
// まとめて1回で保存する。こちらは削除で空になったカテゴリーを消す（Django の設定画面と同じ）。
// 追加済みのキーワード・存在しないキーワードの削除は数えない。
export async function applyGlobalPatternChanges(db: PrismaClient, changes: PatternChange[]): Promise<number> {
  return db.$transaction(async (tx) => {
    await lockGlobalPatterns(tx);
    let saved = 0;
    await editGlobal(tx, (p) => {
      for (const change of changes) {
        if (change.scope !== undefined && change.scope !== 'global') continue;
        const category = str(change.category);
        const keyword = trimmed(change.keyword);
        if (change.action === 'add' && keyword) {
          if (addKeyword(category, keyword)(p)[1]) saved++;
        } else if (change.action === 'add') {
          // キーワードが空でもカテゴリーだけは作る（Django と同じ）
          if (!p.has(normalizeCategory(category))) p.set(normalizeCategory(category), []);
        } else if (change.action === 'delete') {
          if (deleteKeyword(category, keyword, true)(p)[0]) saved++;
        }
      }
      return [true, true];
    });
    return saved;
  });
}

export const patternsToObject = toObject;
