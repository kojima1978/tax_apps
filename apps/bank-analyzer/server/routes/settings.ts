// 全体の設定画面（Django: settings_view と _handle_settings_bulk_pattern_changes）。中身は services/settings.ts
//
// Django 版との違い:
// - 入力の誤りは画面の再描画ではなく 400 と欄ごとのメッセージ（errors）で返す
// - 一括変更はまとめて1回の取引で保存する（Django は設定ファイルを読んでから書くまでの間に
//   別の保存が入ると、どちらかの変更が消えた）
// - キーワードの前後の空白は落とし、古いカテゴリー名は今の名前へ寄せる（分析画面の追加と同じ扱い）

import { Hono } from 'hono';
import type { PrismaClient } from '@prisma/client';
import { isRecord } from '../input.js';
import { applyGlobalPatternChanges, getAppSettings, getGlobalPatterns, patternList, saveAnalysisParams } from '../services/settings.js';
import { fail, ok, readBody } from './common.js';

// /cases の下に置かないのは、案件を探すミドルウェア（'/:caseId/*'）が当たるため（backupImportRouter と同じ）
export function settingsRouter(db: PrismaClient) {
  const r = new Hono();

  r.get('/', async (c) => {
    const [settings, patterns] = await Promise.all([getAppSettings(db), getGlobalPatterns(db)]);
    return ok(c, { settings, patterns: patternList(patterns) });
  });

  r.put('/analysis', async (c) => {
    const body = await readBody(c);
    const result = await saveAnalysisParams(db, {
      largeAmountThreshold: body.largeAmountThreshold,
      transferDaysWindow: body.transferDaysWindow,
      transferTolerance: body.transferTolerance,
      transferDateMode: body.transferDateMode,
      giftThreshold: body.giftThreshold,
      fuzzyEnabled: body.fuzzyEnabled,
      fuzzyThreshold: body.fuzzyThreshold,
    });
    if (!result.ok) return c.json({ success: false, error: '入力内容を確認してください', errors: result.errors }, 400);
    return ok(c, { settings: result.settings, message: '分析パラメータを保存しました。' });
  });

  r.post('/patterns/bulk', async (c) => {
    const changes = (await readBody(c)).changes;
    if (!Array.isArray(changes) || changes.length === 0) return fail(c, '変更がありません');
    return ok(c, { savedCount: await applyGlobalPatternChanges(db, changes.filter(isRecord)) });
  });

  return r;
}
