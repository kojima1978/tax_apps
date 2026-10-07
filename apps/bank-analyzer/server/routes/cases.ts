// 案件（Django: case-list / case-create / case-update / case-delete / api-update-case-name / api-reference-date）

import type { PrismaClient } from '@prisma/client';
import { parseId } from '../json.js';
import { parseDateValue } from '../input.js';
import { createCase, deleteCase, getCase, listCases, renameCase, setReferenceDate } from '../services/cases.js';
import { CASE_NOT_FOUND, fail, ok, readBody, type CaseRouter } from './common.js';

export function caseRoutes(r: CaseRouter, db: PrismaClient) {
  // 一覧は配列のまま返す（画面の既存の読み口）
  r.get('/', async (c) => c.json(await listCases(db)));

  r.post('/', async (c) => {
    const result = await createCase(db, (await readBody(c)).name);
    if (!result.ok) return fail(c, result.error);
    return ok(c, { case: result.value, message: '案件を作成しました。' });
  });

  r.get('/:caseId', async (c) => {
    const caseId = parseId(c.req.param('caseId'));
    const found = caseId && (await getCase(db, caseId));
    if (!found) return fail(c, CASE_NOT_FOUND, 404);
    return ok(c, { case: found });
  });

  // 案件名の変更（一覧の編集と、分析画面のお客様名の両方）
  r.patch('/:caseId', async (c) => {
    const caseId = parseId(c.req.param('caseId'));
    const result = caseId && (await renameCase(db, caseId, (await readBody(c)).name));
    if (!result) return fail(c, CASE_NOT_FOUND, 404);
    if (!result.ok) return fail(c, result.error);
    return ok(c, { name: result.value, message: 'お客様名を更新しました' });
  });

  r.delete('/:caseId', async (c) => {
    const caseId = parseId(c.req.param('caseId'));
    if (!caseId || !(await deleteCase(db, caseId))) return fail(c, CASE_NOT_FOUND, 404);
    return ok(c, { message: '案件を削除しました。' });
  });

  r.put('/:caseId/reference-date', async (c) => {
    const date = parseDateValue((await readBody(c)).referenceDate);
    if (!date.ok) return fail(c, date.error);
    await setReferenceDate(db, c.get('caseId'), date.value);
    const referenceDate = date.value ? date.value.toISOString().slice(0, 10) : null;
    return ok(c, { referenceDate, message: referenceDate ? '基準日を更新しました' : '基準日をクリアしました' });
  });
}
