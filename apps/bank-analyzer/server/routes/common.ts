// ルート共通の部品。応答の形は Django の JSON API と同じ:
//   成功 { success: true, message?, ... } / 失敗 { success: false, error } + 4xx
// 例外は createApp の onError が 500「サーバーエラーが発生しました」にする（中身は画面に出さない）。

import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { PrismaClient } from '@prisma/client';
import { parseId } from '../json.js';
import { isRecord } from '../input.js';

export type Env = { Variables: { caseId: bigint } };

export const CASE_NOT_FOUND = '案件が見つかりません';

export const fail = (c: Context, error: string, status: ContentfulStatusCode = 400) =>
  c.json({ success: false, error }, status);

export const ok = (c: Context, body: Record<string, unknown> = {}) => c.json({ success: true, ...body });

// 本文の JSON。オブジェクトでなければ空のオブジェクト扱い（各欄の検証で弾く）
export async function readBody(c: Context): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await c.req.json();
    return isRecord(body) ? body : {};
  } catch {
    return {};
  }
}

export type CaseRouter = Hono<Env>;

// /cases 以下のルート。:caseId の付くものは案件が無ければ 404 にしてから中へ通す。
// 各ルートのファイルはこの1つに足していく（ファイルごとに Hono を作ると、案件を探す
// ミドルウェアが同じ要求に何度も走る）。
export function caseRouter(db: PrismaClient): CaseRouter {
  const r = new Hono<Env>();
  r.use('/:caseId/*', async (c, next) => {
    const caseId = parseId(c.req.param('caseId'));
    const found = caseId && (await db.case.findUnique({ where: { id: caseId }, select: { id: true } }));
    if (!caseId || !found) return fail(c, CASE_NOT_FOUND, 404);
    c.set('caseId', caseId);
    await next();
  });
  return r;
}
