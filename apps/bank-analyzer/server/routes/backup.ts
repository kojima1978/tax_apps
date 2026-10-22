// 案件の JSON バックアップ（Django: export_json / import_json）。中身は services/backup.ts
//
// Django 版との違い:
// - 読み込みの上限は 100MB（ゲートウェイの上限と同じ）。全案件の一括ファイルも
//   自分で書き出したあと、そのまま読み戻せる大きさを確保する
// - 文字コードが UTF-8 でないファイル・JSON でないファイルは 500 ではなく 400 で弾く

import { Hono } from 'hono';
import type { PrismaClient } from '@prisma/client';
import { contentDisposition, exportFileName } from '../lib/exportFileName.js';
import {
  BackupImportError,
  exportAllCasesJson,
  exportCaseJson,
  importAllCasesJson,
  importCaseJson,
  parseBackupFile,
} from '../services/backup.js';
import { fail, ok, type CaseRouter } from './common.js';

export const MAX_JSON_BYTES = 100 * 1024 * 1024;

export function backupExportRoutes(r: CaseRouter, db: PrismaClient) {
  r.get('/:caseId/export/json', async (c) => {
    const exported = await exportCaseJson(db, c.get('caseId'));
    if (!exported) return fail(c, 'エクスポートするデータがありません。');
    return c.body(JSON.stringify(exported.data, null, 2), 200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': contentDisposition(exportFileName([exported.name, 'バックアップ'], 'json')),
    });
  });
}

// 新しい案件として読み込む。restoreSettings を付けると全体の設定もファイルの内容で置き換える。
// /cases の下に置かないのは、案件を探すミドルウェア（'/:caseId/*'）が '/import-json' にも
// 当たって「案件が見つかりません」になるため
export function backupImportRouter(db: PrismaClient) {
  const r = new Hono();
  r.get('/export', async (c) => {
    const exported = await exportAllCasesJson(db);
    return c.body(JSON.stringify(exported, null, 2), 200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': contentDisposition(exportFileName('全案件バックアップ', 'json')),
    });
  });
  r.post('/import', async (c) => {
    let body: Record<string, unknown>;
    try {
      body = (await c.req.parseBody()) as Record<string, unknown>;
    } catch {
      return fail(c, 'ファイルを選択してください');
    }
    const file = body.file;
    if (!(file instanceof File)) return fail(c, 'ファイルを選択してください');
    if (!file.name.toLowerCase().endsWith('.json')) return fail(c, 'JSONファイル（.json）を選択してください');
    if (file.size > MAX_JSON_BYTES) return fail(c, 'ファイルが大きすぎます（100MBまで）');

    let data: unknown;
    try {
      data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()));
    } catch {
      return fail(c, 'JSONファイルを読めませんでした');
    }
    const backup = parseBackupFile(data);
    if (!backup.ok) return fail(c, backup.error);

    const restoreSettings = ['true', 'on', '1'].includes(String(body.restoreSettings ?? ''));
    try {
      if (backup.value.kind === 'bulk') {
        const result = await importAllCasesJson(db, backup.value.backups, backup.value.settings, restoreSettings);
        return ok(c, {
          bulk: true,
          ...result,
          message: `${result.cases.length}件の案件・${result.count}件の取引を復元しました。`,
        });
      }
      const result = await importCaseJson(db, backup.value.backup, restoreSettings);
      return ok(c, { bulk: false, ...result, message: `「${result.name}」として${result.count}件の取引を復元しました。` });
    } catch (error) {
      if (error instanceof BackupImportError) return fail(c, error.message);
      throw error;
    }
  });
  return r;
}
