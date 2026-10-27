import express from 'express';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type PrincipalResponse = {
  id: number;
  kind: 'individual' | 'corporate';
  name: string;
  nameKana: string;
  address: string;
  birthDate: string;
  representative: string;
  memo: string;
  version: number;
  deletedAt: string | null;
  unchanged?: boolean;
  error?: string;
};
type AuditResponse = { action: string; actor: string; targetName: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null };

let server: Server;
let baseUrl: string;
let workDir: string;
let db: typeof import('../db.js');
let closeDb: () => void;

const operatorHeaders = (name = '架空 花子') => ({
  'Content-Type': 'application/json',
  'x-operator-name': encodeURIComponent(name),
});

const requestJson = async <T>(path: string, init?: RequestInit): Promise<{ response: Response; body: T }> => {
  const response = await fetch(`${baseUrl}${path}`, init);
  return { response, body: await response.json() as T };
};

const create = (body: unknown) => requestJson<PrincipalResponse>('/poa-principals', {
  method: 'POST',
  headers: operatorHeaders(),
  body: JSON.stringify(body),
});

const update = (id: number, body: unknown) => requestJson<PrincipalResponse>(`/poa-principals/${id}`, {
  method: 'PUT',
  headers: operatorHeaders(),
  body: JSON.stringify(body),
});

const list = (query = '') => requestJson<PrincipalResponse[]>(`/poa-principals${query}`);
const audits = () => requestJson<AuditResponse[]>('/audit-logs?targetType=poa_principal');

beforeEach(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'poa-principals-test-'));
  process.env.DATABASE_PATH = join(workDir, 'poa.sqlite');
  vi.resetModules();

  const dbModule = await import('../db.js');
  db = dbModule;
  const { createPoaPrincipalsRouter } = await import('./poaPrincipals.js');
  const { createAuditLogsRouter } = await import('./auditLogs.js');
  closeDb = dbModule.closeDb;

  const app = express();
  app.use(express.json());
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

describe('委任者DB API', () => {
  it('氏名だけで登録でき、生年月日は和暦に直して持つ', async () => {
    const onlyName = await create({ name: '  架空 花子  ' });
    expect(onlyName.response.status).toBe(201);
    expect(onlyName.body).toMatchObject({ kind: 'individual', name: '架空 花子', address: '', birthDate: '', version: 1 });

    const full = await create({ name: '架空 太郎', nameKana: 'カクウ タロウ', address: '架空県架空市1-2-3', birthDate: '1970/3/2' });
    expect(full.body.birthDate).toBe('昭和45年3月2日');

    // 和暦のまま送り返しても同じ値になる（画面は保存値をそのまま入力欄に戻す）
    const again = await update(full.body.id, { ...full.body, birthDate: full.body.birthDate });
    expect(again.body.unchanged).toBe(true);
    expect(again.body.version).toBe(1);
  });

  it('氏名が無い・存在しない日付は弾く。法人は生年月日を、個人は代表者を持たない', async () => {
    expect((await create({ name: ' ' })).response.status).toBe(400);
    const badDate = await create({ name: '架空 花子', birthDate: '1970/2/30' });
    expect(badDate.response.status).toBe(400);
    expect(badDate.body.error).toContain('存在しない日付');

    const corporate = await create({ kind: 'corporate', name: '架空商事株式会社', representative: '代表取締役 架空 太郎', birthDate: '1970/2/30' });
    expect(corporate.body).toMatchObject({ kind: 'corporate', representative: '代表取締役 架空 太郎', birthDate: '' });
    const individual = await create({ name: '架空 花子', representative: '使われない' });
    expect(individual.body.representative).toBe('');
  });

  it('検索は氏名・フリガナ・つながっている被相続人に当たり、空白と全角半角を無視する。並びはフリガナ順', async () => {
    const taro = (await create({ name: '架空 太郎', nameKana: 'カクウ タロウ' })).body;
    await create({ name: '架空 花子', nameKana: 'カクウ ハナコ' });
    await create({ name: '仮名 次郎', nameKana: 'アカ ジロウ' });
    // 被相続人とのつながりは被相続人DBの画面で作る（ここでは表へ直接入れる）
    const deceasedId = Number(db.getDb().prepare("INSERT INTO poa_deceased (name) VALUES ('架空 一郎')").run().lastInsertRowid);
    db.getDb().prepare('INSERT INTO poa_deceased_heirs (deceased_id, principal_id) VALUES (?, ?)').run(deceasedId, taro.id);

    expect((await list()).body.map((p) => p.name)).toEqual(['仮名 次郎', '架空 太郎', '架空 花子']);
    expect((await list('?q=' + encodeURIComponent('架空花子'))).body.map((p) => p.name)).toEqual(['架空 花子']);
    expect((await list('?q=' + encodeURIComponent('ｶｸｳ'))).body).toHaveLength(2);
    expect((await list('?q=' + encodeURIComponent('一郎'))).body.map((p) => p.name)).toEqual(['架空 太郎']);
  });

  it('古い版での更新は 409 で弾き、今の内容を返す', async () => {
    const { body: created } = await create({ name: '架空 花子' });
    const first = await update(created.id, { ...created, address: '架空県1' });
    expect(first.body.version).toBe(2);

    const stale = await update(created.id, { ...created, address: '架空県2' });
    expect(stale.response.status).toBe(409);
    expect((stale.body as unknown as { current: PrincipalResponse }).current.address).toBe('架空県1');
  });

  it('削除はゴミ箱へ移すだけで、戻せる', async () => {
    const { body: created } = await create({ name: '架空 花子' });
    const removed = await requestJson<{ ok: boolean }>(`/poa-principals/${created.id}`, { method: 'DELETE', headers: operatorHeaders() });
    expect(removed.body.ok).toBe(true);
    expect((await list()).body).toHaveLength(0);
    expect((await list('?deleted=1')).body.map((p) => p.name)).toEqual(['架空 花子']);

    // ゴミ箱の中は直せないし、1人だけ引くこともできない
    expect((await update(created.id, { ...created })).response.status).toBe(404);
    expect((await requestJson(`/poa-principals/${created.id}`)).response.status).toBe(404);

    const restored = await requestJson<PrincipalResponse>(`/poa-principals/${created.id}/restore`, { method: 'POST', headers: operatorHeaders() });
    expect(restored.body.deletedAt).toBeNull();
    expect((await list()).body).toHaveLength(1);
    expect((await requestJson<PrincipalResponse>(`/poa-principals/${created.id}`)).body.name).toBe('架空 花子');
  });

  it('操作履歴に住所と生年月日の中身を残さない', async () => {
    const { body: created } = await create({ name: '架空 花子', address: '架空県架空市1-2-3', birthDate: '1970/3/2' });
    await update(created.id, { ...created, address: '架空県架空市9-9-9' });

    const { body: logs } = await audits();
    expect(logs.map((log) => log.action)).toEqual(['update', 'create']);
    expect(logs[0].actor).toBe('架空 花子');
    const serialized = JSON.stringify(logs);
    expect(serialized).not.toContain('架空市');
    expect(serialized).not.toContain('昭和45年');
    expect(logs[0].before?.address).toBe('入力あり');
    expect(logs[0].after?.address).toBe('入力あり（変更）');
    expect(logs[0].after?.birthDate).toBe('入力あり');
  });
});
