import express from 'express';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Linked = { id: number; name: string };
type PrincipalResponse = { id: number; name: string; address: string; deceased: Linked[] };
type DeceasedResponse = {
  id: number;
  name: string;
  nameKana: string;
  birthDate: string;
  memo: string;
  version: number;
  deletedAt: string | null;
  heirs: PrincipalResponse[];
  unchanged?: boolean;
  error?: string;
};
type AuditResponse = { action: string; actor: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null };

let server: Server;
let baseUrl: string;
let workDir: string;
let closeDb: () => void;

const headers = { 'Content-Type': 'application/json', 'x-operator-name': encodeURIComponent('架空 花子') };

const requestJson = async <T>(path: string, init?: RequestInit): Promise<{ response: Response; body: T }> => {
  const response = await fetch(`${baseUrl}${path}`, init);
  return { response, body: await response.json() as T };
};
const send = <T>(method: string, path: string, body?: unknown) =>
  requestJson<T>(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });

const createDeceased = (body: unknown) => send<DeceasedResponse>('POST', '/poa-deceased', body);
const createPrincipal = async (body: unknown) => (await send<PrincipalResponse>('POST', '/poa-principals', body)).body;
const linkHeirs = (id: number, principalIds: unknown) => send<DeceasedResponse>('POST', `/poa-deceased/${id}/heirs`, { principalIds });
const listDeceased = (query = '') => requestJson<DeceasedResponse[]>(`/poa-deceased${query}`);
const listPrincipals = (query = '') => requestJson<PrincipalResponse[]>(`/poa-principals${query}`);

beforeEach(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'poa-deceased-test-'));
  process.env.DATABASE_PATH = join(workDir, 'poa.sqlite');
  vi.resetModules();

  const dbModule = await import('../db.js');
  const { createPoaDeceasedRouter } = await import('./poaDeceased.js');
  const { createPoaPrincipalsRouter } = await import('./poaPrincipals.js');
  const { createAuditLogsRouter } = await import('./auditLogs.js');
  closeDb = dbModule.closeDb;

  const app = express();
  app.use(express.json());
  app.use('/poa-deceased', createPoaDeceasedRouter());
  app.use('/poa-principals', createPoaPrincipalsRouter());
  app.use('/audit-logs', createAuditLogsRouter());
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  closeDb();
  delete process.env.DATABASE_PATH;
  rmSync(workDir, { recursive: true, force: true });
});

describe('被相続人DB API', () => {
  it('氏名だけで登録でき、生年月日は和暦に直す。氏名が無い・存在しない日付は弾く', async () => {
    const created = await createDeceased({ name: ' 架空 一郎 ', nameKana: 'カクウ イチロウ', birthDate: '1940/4/1' });
    expect(created.response.status).toBe(201);
    expect(created.body).toMatchObject({ name: '架空 一郎', birthDate: '昭和15年4月1日', version: 1, heirs: [] });

    expect((await createDeceased({ name: '' })).response.status).toBe(400);
    const badDate = await createDeceased({ name: '架空 一郎', birthDate: '1940/2/30' });
    expect(badDate.body.error).toContain('存在しない日付');

    const again = await send<DeceasedResponse>('PUT', `/poa-deceased/${created.body.id}`, { ...created.body });
    expect(again.body.unchanged).toBe(true);
    const stale = await send<DeceasedResponse>('PUT', `/poa-deceased/${created.body.id}`, { ...created.body, version: 0, memo: 'x' });
    expect(stale.response.status).toBe(409);
  });

  it('相続人は多対多でつなぐ（二次相続で同じ子が父と母の両方の相続人になる）', async () => {
    const father = (await createDeceased({ name: '架空 一郎' })).body;
    const mother = (await createDeceased({ name: '架空 花江' })).body;
    const son = await createPrincipal({ name: '架空 太郎', nameKana: 'カクウ タロウ', address: '架空県1' });
    const daughter = await createPrincipal({ name: '架空 花子', nameKana: 'カクウ ハナコ' });

    const linked = await linkHeirs(father.id, [daughter.id, son.id, son.id]);
    expect(linked.body.heirs.map((heir) => heir.name)).toEqual(['架空 太郎', '架空 花子']);
    // 相続人は委任状の欄へそのまま入れられる形で返る
    expect(linked.body.heirs[0]).toMatchObject({ address: '架空県1', deceased: [{ id: father.id, name: '架空 一郎' }] });
    await linkHeirs(mother.id, [son.id]);

    const { body: principals } = await listPrincipals();
    expect(principals.find((p) => p.id === son.id)?.deceased.map((d) => d.name)).toEqual(['架空 一郎', '架空 花江']);
    // 委任者の検索は、つながっている被相続人の名前にも当たる
    expect((await listPrincipals('?q=' + encodeURIComponent('花江'))).body.map((p) => p.name)).toEqual(['架空 太郎']);
    // 被相続人の検索は、相続人の名前にも当たる
    expect((await listDeceased('?q=' + encodeURIComponent('架空花子'))).body.map((d) => d.name)).toEqual(['架空 一郎']);

    const unlinked = await send<DeceasedResponse>('DELETE', `/poa-deceased/${father.id}/heirs/${son.id}`);
    expect(unlinked.body.heirs.map((heir) => heir.name)).toEqual(['架空 花子']);
    // 外しても委任者そのものは残る
    expect((await listPrincipals()).body).toHaveLength(2);
  });

  it('いない人・ゴミ箱の中の人はつながない。ゴミ箱へ移した相続人は一覧から消え、戻せばつながりも戻る', async () => {
    const deceased = (await createDeceased({ name: '架空 一郎' })).body;
    const heir = await createPrincipal({ name: '架空 太郎' });
    expect((await linkHeirs(deceased.id, [9999])).response.status).toBe(404);
    expect((await linkHeirs(deceased.id, [])).response.status).toBe(400);
    expect((await linkHeirs(deceased.id, ['1'])).response.status).toBe(400);

    await linkHeirs(deceased.id, [heir.id]);
    await send('DELETE', `/poa-principals/${heir.id}`);
    expect((await requestJson<DeceasedResponse>(`/poa-deceased/${deceased.id}`)).body.heirs).toEqual([]);
    expect((await linkHeirs(deceased.id, [heir.id])).response.status).toBe(404);
    await send('POST', `/poa-principals/${heir.id}/restore`);
    expect((await requestJson<DeceasedResponse>(`/poa-deceased/${deceased.id}`)).body.heirs.map((h) => h.name)).toEqual(['架空 太郎']);

    // 被相続人をゴミ箱へ移すと、委任者の側にも出なくなる
    await send('DELETE', `/poa-deceased/${deceased.id}`);
    expect((await listDeceased()).body).toEqual([]);
    expect((await listDeceased('?deleted=1')).body.map((d) => d.name)).toEqual(['架空 一郎']);
    expect((await listPrincipals()).body[0].deceased).toEqual([]);
    expect((await requestJson(`/poa-deceased/${deceased.id}`)).response.status).toBe(404);
    await send('POST', `/poa-deceased/${deceased.id}/restore`);
    expect((await listPrincipals()).body[0].deceased.map((d) => d.name)).toEqual(['架空 一郎']);
  });

  it('操作履歴に生年月日の中身を残さず、つなぎ替えは名前の一覧で残す。つながり済みなら記録しない', async () => {
    const deceased = (await createDeceased({ name: '架空 一郎', birthDate: '1940/4/1' })).body;
    const heir = await createPrincipal({ name: '架空 太郎' });
    await linkHeirs(deceased.id, [heir.id]);
    await linkHeirs(deceased.id, [heir.id]);

    const { body: logs } = await requestJson<AuditResponse[]>('/audit-logs?targetType=poa_deceased');
    expect(logs.map((log) => log.action)).toEqual(['update', 'create']);
    expect(logs[0]).toMatchObject({ actor: '架空 花子', before: { heirs: [] }, after: { heirs: ['架空 太郎'] } });
    expect(logs[1].after?.birthDate).toBe('入力あり');
    expect(JSON.stringify(logs)).not.toContain('昭和15年');
  });
});
