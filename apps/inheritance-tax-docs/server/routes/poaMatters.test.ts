import express from 'express';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_MATTER_MASTER, type MatterMaster } from '../../src/constants/powerOfAttorneyMatters.js';

type MasterResponse = MatterMaster & { version: number; ok?: boolean; unchanged?: boolean; error?: string };
type RegisterResponse = MasterResponse & { ids: string[]; created: number };
type AuditResponse = { action: string; actor: string; targetName: string; before: unknown; after: unknown };

let server: Server;
let baseUrl: string;
let workDir: string;
let closeDb: () => void;

const operatorHeaders = (name = '架空 花子') => ({
  'Content-Type': 'application/json',
  'x-operator-name': encodeURIComponent(name),
});

const requestJson = async <T>(path: string, init?: RequestInit): Promise<{ response: Response; body: T }> => {
  const response = await fetch(`${baseUrl}${path}`, init);
  return { response, body: await response.json() as T };
};

const load = () => requestJson<MasterResponse>('/poa-matters');

const save = (master: MatterMaster, version: number) => requestJson<MasterResponse>('/poa-matters', {
  method: 'PUT',
  headers: operatorHeaders(),
  body: JSON.stringify({ version, ...master }),
});

const register = (body: unknown) => requestJson<RegisterResponse>('/poa-matters/register', {
  method: 'POST',
  headers: operatorHeaders('架空 太郎'),
  body: JSON.stringify(body),
});

const masterOf = ({ matters, presets }: MasterResponse): MatterMaster => ({ matters, presets });

beforeEach(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'poa-matters-test-'));
  process.env.DATABASE_PATH = join(workDir, 'poa.sqlite');
  vi.resetModules();

  const dbModule = await import('../db.js');
  const { createPoaMattersRouter } = await import('./poaMatters.js');
  const { createAuditLogsRouter } = await import('./auditLogs.js');
  closeDb = dbModule.closeDb;
  dbModule.seedPoaMatterMasterIfEmpty(DEFAULT_MATTER_MASTER);

  const app = express();
  app.use(express.json());
  app.use('/poa-matters', createPoaMattersRouter());
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

describe('委任事項マスタAPI', () => {
  it('初期値を返し、種を入れ直しても画面で直した内容を上書きしない', async () => {
    const initial = await load();
    expect(masterOf(initial.body)).toEqual(DEFAULT_MATTER_MASTER);
    expect(initial.body.version).toBe(1);

    const edited = structuredClone(DEFAULT_MATTER_MASTER);
    edited.matters.personal[0].text = '架空の文面';
    expect((await save(edited, 1)).response.status).toBe(200);

    const dbModule = await import('../db.js');
    dbModule.seedPoaMatterMasterIfEmpty(DEFAULT_MATTER_MASTER);
    expect((await load()).body.matters.personal[0].text).toBe('架空の文面');
  });

  it('追加・並び替え・編集・削除を履歴に分けて残し、削除した事項は提出先から外させる', async () => {
    let version = (await load()).body.version;
    const unchanged = await save(DEFAULT_MATTER_MASTER, version);
    expect(unchanged.body).toMatchObject({ ok: true, unchanged: true, version });

    const added = structuredClone(DEFAULT_MATTER_MASTER);
    added.matters.inheritance.push({ id: 'new-matter', text: '架空の窓口に関する一切の権限' });
    added.presets.bank.push('new-matter');
    version = (await save(added, version)).body.version;

    const reordered = structuredClone(added);
    reordered.matters.inheritance.reverse();
    const reorderedResult = await save(reordered, version);
    // 提出先の印はマスタの並びに揃えて持つ
    expect(reorderedResult.body.presets.bank).toEqual(['new-matter', 'bank-procedures', 'bank-statements']);
    version = reorderedResult.body.version;

    const updated = structuredClone(reordered);
    updated.matters.inheritance[0].text = '  架空の窓口に関する権限（直し）  ';
    const updatedResult = await save(updated, version);
    expect(updatedResult.body.matters.inheritance[0].text).toBe('架空の窓口に関する権限（直し）');
    version = updatedResult.body.version;

    const removedButStillInPreset = structuredClone(updated);
    removedButStillInPreset.matters.inheritance.shift();
    expect((await save(removedButStillInPreset, version)).response.status).toBe(400);

    removedButStillInPreset.presets.bank = removedButStillInPreset.presets.bank.filter((id) => id !== 'new-matter');
    expect((await save(removedButStillInPreset, version)).response.status).toBe(200);

    const history = await requestJson<AuditResponse[]>('/audit-logs?targetType=poa_matter');
    expect(history.body.map((entry) => entry.action)).toEqual(['delete', 'update', 'reorder', 'create']);
    expect(history.body.every((entry) => entry.actor === '架空 花子' && entry.targetName === '委任事項')).toBe(true);
    const created = history.body[3].after as Record<string, { 文面: string; 提出先ボタン?: string }[]>;
    expect(created['相続手続き用'].at(-1)).toEqual({ 文面: '架空の窓口に関する一切の権限', 提出先ボタン: '金融機関' });
  });

  it('空の文面・提出先の過不足・古い版からの保存を弾く', async () => {
    const empty = structuredClone(DEFAULT_MATTER_MASTER);
    empty.matters.personal[0].text = '   ';
    expect((await save(empty, 1)).response.status).toBe(400);

    const extraPreset = { ...structuredClone(DEFAULT_MATTER_MASTER), presets: { ...DEFAULT_MATTER_MASTER.presets, other: [] } };
    expect((await save(extraPreset as MatterMaster, 1)).response.status).toBe(400);

    const duplicateId = structuredClone(DEFAULT_MATTER_MASTER);
    duplicateId.matters.personal.push({ ...duplicateId.matters.inheritance[0] });
    expect((await save(duplicateId, 1)).response.status).toBe(400);

    await register({ purpose: 'personal', texts: ['架空の登録'] });
    const stale = await save(DEFAULT_MATTER_MASTER, 1);
    expect(stale.response.status).toBe(409);
    expect((await load()).body.matters.personal.map((matter) => matter.text)).toContain('架空の登録');
  });

  it('定型文に登録: 元にした事項の隣へ足し、同じ文面は増やさない', async () => {
    const first = await register({ purpose: 'inheritance', texts: ['架空の直した文面', ' 架空のその他 '], afterId: 'bank-statements' });
    expect(first.response.status).toBe(200);
    expect(first.body.created).toBe(2);
    expect(first.body.matters.inheritance.slice(0, 4).map((matter) => matter.text)).toEqual([
      DEFAULT_MATTER_MASTER.matters.inheritance[0].text,
      '架空の直した文面',
      '架空のその他',
      DEFAULT_MATTER_MASTER.matters.inheritance[1].text,
    ]);
    expect(first.body.ids[0]).toBe(first.body.matters.inheritance[1].id);

    const again = await register({ purpose: 'inheritance', texts: ['架空の直した文面'] });
    expect(again.body).toMatchObject({ created: 0, version: first.body.version, ids: [first.body.ids[0]] });

    const history = await requestJson<AuditResponse[]>('/audit-logs?targetType=poa_matter');
    expect(history.body).toHaveLength(1);
    expect(history.body[0]).toMatchObject({ action: 'create', actor: '架空 太郎' });

    expect((await register({ purpose: 'other', texts: ['架空'] })).response.status).toBe(400);
    expect((await register({ purpose: 'personal', texts: ['  '] })).response.status).toBe(400);
    expect((await register({ purpose: 'personal', texts: [] })).response.status).toBe(400);
  });
});
