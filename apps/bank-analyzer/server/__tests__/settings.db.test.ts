// 全体の設定と分類パターン。保存の形は Django の user_settings.json と同じキー・同じ値。

import { describe, expect, it } from 'vitest';
import { DEFAULT_PATTERNS } from '../lib/categories.js';
import {
  addPattern,
  applyGlobalPatternChanges,
  applyPatternChanges,
  deletePattern,
  getAppSettings,
  getCasePatterns,
  getClassifierSettings,
  getGlobalPatterns,
  mergePatterns,
  movePattern,
  saveAnalysisParams,
  updatePattern,
} from '../services/settings.js';
import { seedCase } from './helpers/fixtures.js';
import { useTestDb } from './helpers/testDb.js';

const db = useTestDb();

const stored = async (key: string) => (await db().appSetting.findUnique({ where: { key } }))?.value;
const caseStored = async (id: bigint) => (await db().case.findUniqueOrThrow({ where: { id } })).customPatterns;

describe('分析パラメータ', () => {
  it('未設定なら既定値', async () => {
    expect(await getAppSettings(db())).toEqual({
      largeAmountThreshold: 500000,
      transferDaysWindow: 3,
      transferTolerance: 1000,
      transferDateMode: 'after_only',
      giftThreshold: 1000000,
      fuzzy: { enabled: true, threshold: 90, useTokenSetRatio: true },
    });
  });

  it('Django と同じキーで保存し、分類パターンには触らない', async () => {
    const r = await saveAnalysisParams(db(), {
      largeAmountThreshold: '300000', transferDaysWindow: 5, transferTolerance: 0, transferDateMode: 'both',
      giftThreshold: 2000000, fuzzyEnabled: false, fuzzyThreshold: 80,
    });
    expect(r.ok).toBe(true);
    expect(await stored('LARGE_AMOUNT_THRESHOLD')).toBe(300000);
    expect(await stored('TRANSFER_DATE_MODE')).toBe('both');
    expect(await stored('FUZZY_MATCHING')).toEqual({ enabled: false, threshold: 80, fallback_to_substring: true, use_token_set_ratio: true });
    expect(await stored('CLASSIFICATION_PATTERNS')).toBeUndefined();
    expect(await getAppSettings(db())).toMatchObject({ largeAmountThreshold: 300000, transferTolerance: 0, fuzzy: { enabled: false, threshold: 80 } });
  });

  it('範囲外・整数でない値は弾いて何も保存しない', async () => {
    const r = await saveAnalysisParams(db(), {
      largeAmountThreshold: -1, transferDaysWindow: 31, transferTolerance: 1.5, transferDateMode: 'x',
      giftThreshold: '', fuzzyEnabled: true, fuzzyThreshold: 101,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(
        ['fuzzyThreshold', 'giftThreshold', 'largeAmountThreshold', 'transferDateMode', 'transferDaysWindow', 'transferTolerance'],
      );
    }
    expect(await db().appSetting.count()).toBe(0);
  });
});

describe('全体のパターン', () => {
  it('未設定なら既定。最初の変更で既定の写しに足して保存する（順番も保つ）', async () => {
    expect([...(await getGlobalPatterns(db())).keys()]).toEqual(Object.keys(DEFAULT_PATTERNS));
    expect(await addPattern(db(), 'global', 0n, '新しい分類', ' 架空商店 ')).toBe(true);
    const saved = (await stored('CLASSIFICATION_PATTERNS')) as Record<string, string[]>;
    expect(Object.keys(saved)).toEqual([...Object.keys(DEFAULT_PATTERNS), '新しい分類']);
    expect(saved['新しい分類']).toEqual(['架空商店']);
    // 2回目は成功だが変わらない
    expect(await addPattern(db(), 'global', 0n, '新しい分類', '架空商店')).toBe(true);
    expect(await addPattern(db(), 'global', 0n, '新しい分類', '  ')).toBe(false);
  });

  it('古いカテゴリー名は寄せて保存し直す', async () => {
    await db().appSetting.create({ data: { key: 'CLASSIFICATION_PATTERNS', value: { '銀行': ['利息'], '生活費': ['イオン'] } } });
    expect(Object.fromEntries(await getGlobalPatterns(db()))).toEqual({ '銀行・利息・手数料': ['利息'], '生活費': ['イオン'] });
    expect(await stored('CLASSIFICATION_PATTERNS')).toEqual({ '銀行・利息・手数料': ['利息'], '生活費': ['イオン'] });
  });

  it('削除しても空のカテゴリーは残す。書き換えは位置を保ち、重複は失敗', async () => {
    await db().appSetting.create({ data: { key: 'CLASSIFICATION_PATTERNS', value: { '生活費': ['a', 'b', 'c'], '給与': ['x'] } } });
    expect(await updatePattern(db(), 'global', 0n, '生活費', 'b', 'B')).toBe(true);
    expect(await updatePattern(db(), 'global', 0n, '生活費', 'a', 'c')).toBe(false);
    expect(await updatePattern(db(), 'global', 0n, '生活費', 'zz', 'y')).toBe(false);
    expect(await deletePattern(db(), 'global', 0n, '給与', 'x')).toBe(true);
    expect(await deletePattern(db(), 'global', 0n, '給与', 'x')).toBe(false);
    expect(await stored('CLASSIFICATION_PATTERNS')).toEqual({ '生活費': ['a', 'B', 'c'], '給与': [] });
  });

  it('設定画面の一括変更は空になったカテゴリーを消し、数えるのは変わった件数だけ', async () => {
    await db().appSetting.create({ data: { key: 'CLASSIFICATION_PATTERNS', value: { '生活費': ['a'], '給与': ['x'] } } });
    const saved = await applyGlobalPatternChanges(db(), [
      { action: 'add', category: '生活費', keyword: 'b', scope: 'global' },
      { action: 'add', category: '生活費', keyword: 'a', scope: 'global' },
      { action: 'delete', category: '給与', keyword: 'x', scope: 'global' },
      { action: 'add', category: '生活費', keyword: 'z', scope: 'case' },
      { action: 'delete', category: '税金', keyword: 'none' },
    ]);
    expect(saved).toBe(2);
    expect(await stored('CLASSIFICATION_PATTERNS')).toEqual({ '生活費': ['a', 'b'] });
  });

  it('同時に追加しても片方が消えない', async () => {
    await Promise.all(Array.from({ length: 8 }, (_, i) => addPattern(db(), 'global', 0n, '生活費', `同時${i}`)));
    const list = ((await stored('CLASSIFICATION_PATTERNS')) as Record<string, string[]>)['生活費']!;
    for (let i = 0; i < 8; i++) expect(list).toContain(`同時${i}`);
  });
});

describe('案件固有のパターン', () => {
  it('削除で空になったカテゴリーは消す。移動は全体との間で1回で行う', async () => {
    const { caseId } = await seedCase(db(), '架空');
    expect(await addPattern(db(), 'case', caseId, '贈与', '架空 花子')).toBe(true);
    expect(await caseStored(caseId)).toEqual({ '贈与・教育費': ['架空 花子'] });

    expect(await movePattern(db(), caseId, '贈与・教育費', '架空 花子', 'case', 'global')).toBe(true);
    expect(await caseStored(caseId)).toEqual({});
    expect(((await stored('CLASSIFICATION_PATTERNS')) as Record<string, string[]>)['贈与・教育費']).toContain('架空 花子');

    // 移動元に無ければ何も変えない
    expect(await movePattern(db(), caseId, '生活費', '存在しない', 'global', 'case')).toBe(false);
    expect(await caseStored(caseId)).toEqual({});
    expect(await movePattern(db(), caseId, '生活費', 'イオン', 'global', 'global')).toBe(false);
  });

  it('全体と足し合わせると、案件にしか無いカテゴリーは後ろ。分類器の設定にも入る', async () => {
    const { caseId } = await seedCase(db(), '架空', []);
    await db().case.update({ where: { id: caseId }, data: { customPatterns: { '生活費': ['イオン', '架空ストア'], '独自': ['k'] } } });
    const merged = mergePatterns(await getGlobalPatterns(db()), await getCasePatterns(db(), caseId));
    expect([...merged.keys()].at(-1)).toBe('独自');
    expect(merged.get('生活費')?.filter((k) => k === 'イオン')).toHaveLength(1);
    expect(merged.get('生活費')?.at(-1)).toBe('架空ストア');

    const cs = await getClassifierSettings(db(), caseId);
    expect(cs.casePatterns).toEqual({ '生活費': ['イオン', '架空ストア'], '独自': ['k'] });
    expect((await getClassifierSettings(db(), null)).casePatterns).toBeNull();
  });

  it('分析画面の一括変更は1件ずつ当てて数える', async () => {
    const { caseId } = await seedCase(db(), '架空');
    const r = await applyPatternChanges(db(), caseId, [
      { action: 'add', category: '生活費', keyword: 'k1', scope: 'case' },
      { action: 'move', category: '生活費', keyword: 'k1', fromScope: 'case', toScope: 'global' },
      { action: 'delete', category: '生活費', keyword: 'none', scope: 'case' },
      { action: 'unknown' },
    ]);
    expect(r).toEqual({ savedCount: 2, totalCount: 4, errors: null });
  });
});
