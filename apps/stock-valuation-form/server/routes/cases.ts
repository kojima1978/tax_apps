// 案件（評価する会社1社ぶんの入力データ）の保存API。
//
// これまで入力データはブラウザの localStorage にしか無く、1社ぶんしか持てないうえ
// バックアップの対象外だった。DBへ移すことで案件の切替ができるようになり、同時に
// docker/scripts/backup.sh の日次バックアップ（PG_TARGETS に svf-postgres がある）に乗る。
//
// 中身の意味づけ（どの欄が会社名か、丸めをどうするか）はフロントの領分で、ここは
// 受け取った入力をそのまま預かることに徹する。検証は cases.ts を参照。
//
// 削除は論理削除（ゴミ箱）が既定。1社ぶんの入力を消すのは取り返しがつかないため、
// 完全削除は ?purge=1 を明示したときだけ行う。

import { Hono, type Context } from 'hono';
import type { PrismaClient } from '@prisma/client';
import {
  copiedCaseName,
  parseCaseId,
  parseCaseInput,
  toCaseResponse,
  toCaseSummary,
} from '../cases.js';
import { ValidationError, toErrorResponse } from '../validation.js';

/** 案件の一覧・取得で共通の列。入力データ（data）は一覧には載せない。 */
const SUMMARY_COLUMNS = {
  id: true,
  companyName: true,
  taxPeriod: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * 検証エラー（400）の受けをルートごとに書かずに済ませる包み。
 * ValidationError 以外は toErrorResponse が投げ直すので、Hono の500に落ちる。
 */
function guard(handler: (c: Context) => Promise<Response>) {
  return async (c: Context) => {
    try {
      return await handler(c);
    } catch (error) {
      const { body, status } = toErrorResponse(error);
      return c.json(body, status);
    }
  };
}

export function createCaseRouter(db: PrismaClient) {
  const router = new Hono();

  async function readJson(request: Request) {
    try {
      return (await request.json()) as unknown;
    } catch {
      throw new ValidationError('リクエスト本体がJSONとして読めませんでした');
    }
  }

  /** 案件を1件引く。ゴミ箱の中も引ける（復元・完全削除に要るため）。 */
  async function findCase(param: string) {
    return db.valuationCase.findUnique({ where: { id: parseCaseId(param) } });
  }

  // 一覧。既定はゴミ箱を除く。?includeArchived=1 でゴミ箱も含める。
  router.get('/cases', async (c) => {
    const includeArchived = c.req.query('includeArchived') === '1';

    const cases = await db.valuationCase.findMany({
      where: includeArchived ? {} : { archivedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: SUMMARY_COLUMNS,
    });

    return c.json({ cases: cases.map(toCaseSummary) });
  });

  // 1件（入力データまで）。
  router.get('/cases/:id', guard(async (c) => {
    const found = await findCase(c.req.param('id'));
    if (!found) return c.json({ error: '指定された案件は存在しません' }, 404);
    return c.json({ case: toCaseResponse(found) });
  }));

  // 新規保存。
  router.post('/cases', guard(async (c) => {
    const input = parseCaseInput(await readJson(c.req.raw));
    const created = await db.valuationCase.create({
      data: input,
      select: SUMMARY_COLUMNS,
    });
    return c.json({ case: toCaseSummary(created) }, 201);
  }));

  // 上書き。自動保存がここを叩く。
  router.put('/cases/:id', guard(async (c) => {
    const id = parseCaseId(c.req.param('id'));
    const input = parseCaseInput(await readJson(c.req.raw));

    const existing = await db.valuationCase.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return c.json({ error: '指定された案件は存在しません' }, 404);

    const updated = await db.valuationCase.update({
      where: { id },
      data: input,
      select: SUMMARY_COLUMNS,
    });
    return c.json({ case: toCaseSummary(updated) });
  }));

  // 複製。前期の入力を土台に翌年度ぶんを作る、といった使い方を想定している。
  router.post('/cases/:id/duplicate', guard(async (c) => {
    const source = await findCase(c.req.param('id'));
    if (!source) return c.json({ error: '指定された案件は存在しません' }, 404);

    const created = await db.valuationCase.create({
      data: {
        companyName: copiedCaseName(source.companyName),
        taxPeriod: source.taxPeriod,
        data: source.data ?? {},
      },
      select: SUMMARY_COLUMNS,
    });
    return c.json({ case: toCaseSummary(created) }, 201);
  }));

  // ゴミ箱から戻す。
  router.post('/cases/:id/restore', guard(async (c) => {
    const found = await findCase(c.req.param('id'));
    if (!found) return c.json({ error: '指定された案件は存在しません' }, 404);

    const restored = await db.valuationCase.update({
      where: { id: found.id },
      data: { archivedAt: null },
      select: SUMMARY_COLUMNS,
    });
    return c.json({ case: toCaseSummary(restored) });
  }));

  // 既定はゴミ箱へ。?purge=1 のときだけ完全に消す。
  router.delete('/cases/:id', guard(async (c) => {
    const found = await findCase(c.req.param('id'));
    if (!found) return c.json({ error: '指定された案件は存在しません' }, 404);

    if (c.req.query('purge') === '1') {
      await db.valuationCase.delete({ where: { id: found.id } });
      return c.json({ purged: true });
    }

    const archived = await db.valuationCase.update({
      where: { id: found.id },
      data: { archivedAt: found.archivedAt ?? new Date() },
      select: SUMMARY_COLUMNS,
    });
    return c.json({ case: toCaseSummary(archived) });
  }));

  return router;
}
