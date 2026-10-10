// 取引の CSV・Excel の書き出し（Django: export_csv / export_csv_filtered /
// export_xlsx_by_category / export_monthly_cashflow_xlsx）。中身は services/exports.ts
//
// 書き出せないとき（取引が無い・条件に合うものが無い）は Django 版のように分析画面へ
// 戻すのではなく 400 の JSON を返す。画面は fetch で受けて、成功したときだけ保存させる。

import type { Context } from 'hono';
import type { PrismaClient } from '@prisma/client';
import { filterFromQuery } from '../filterQuery.js';
import { contentDisposition } from '../lib/exportFileName.js';
import {
  exportCategoryXlsx,
  exportCsv,
  exportFilteredCsv,
  exportMonthlyXlsx,
  exportSheetCsv,
  isCsvType,
  type ExportFile,
  type ExportResult,
} from '../services/exports.js';
import { fail, type CaseRouter } from './common.js';

const send = (c: Context, file: ExportFile) =>
  c.body(file.body, 200, { 'Content-Type': file.contentType, 'Content-Disposition': contentDisposition(file.filename) });

const respond = (c: Context, result: ExportResult) => (result.ok ? send(c, result.file) : fail(c, result.error));

export function exportRoutes(r: CaseRouter, db: PrismaClient) {
  // 絞り込み条件付き（分析画面の取引一覧と同じクエリ）
  r.get('/:caseId/export/csv-filtered', async (c) =>
    respond(c, await exportFilteredCsv(db, c.get('caseId'), filterFromQuery(new URL(c.req.url).searchParams))),
  );

  r.get('/:caseId/export/csv-sheet', async (c) =>
    respond(c, await exportSheetCsv(db, c.get('caseId'), filterFromQuery(new URL(c.req.url).searchParams))),
  );

  r.get('/:caseId/export/csv/:type', async (c) => {
    const type = c.req.param('type');
    if (!isCsvType(type)) return fail(c, '書き出しの種類が正しくありません', 404);
    return respond(c, await exportCsv(db, c.get('caseId'), type, filterFromQuery(new URL(c.req.url).searchParams)));
  });

  r.get('/:caseId/export/xlsx/categories', async (c) => respond(c, await exportCategoryXlsx(db, c.get('caseId'))));

  r.get('/:caseId/export/xlsx/monthly', async (c) => send(c, await exportMonthlyXlsx(db, c.get('caseId'))));
}
