import express from 'express';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BANK_ACCOUNT_OPENING_MATTER, BANK_INCIDENTAL_MATTER, DEFAULT_MATTER_MASTER, type MatterMaster } from '../../src/constants/powerOfAttorneyMatters.js';

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

  it.each([
    { text: '被相続人名義の全取引に関する相続手続きに関し、関係書類へ記入および、解約、手続きに関するすべての権限', updates: true },
    { text: '利用者が編集した金融機関向けの文面', updates: false },
  ])('旧マスタの金融機関向け初期文言だけを一度更新する ($updates)', async ({ text, updates }) => {
    const edited = structuredClone(DEFAULT_MATTER_MASTER);
    const matter = edited.matters.inheritance.find(({ id }) => id === 'bank-procedures')!;
    const defaultText = matter.text;
    matter.text = text;
    edited.matters.personal[0].text = '利用者が編集した別の文面';
    const saved = await save(edited, 1);
    expect(saved.response.status).toBe(200);

    const { runMasterMigrations } = await import('../masterMigrations.js');
    runMasterMigrations();
    runMasterMigrations();

    if (updates) matter.text = defaultText;
    const loaded = await load();
    expect(masterOf(loaded.body)).toEqual(edited);
    expect(loaded.body.version).toBe(saved.body.version + (updates ? 1 : 0));
    const history = await requestJson<AuditResponse[]>('/audit-logs?targetType=poa_matter');
    expect(history.body).toHaveLength(updates ? 2 : 1);
  });

  it('金融機関の選択肢を追加し、施設の旧初期文言を一度だけ更新する', async () => {
    const addedIds = [BANK_ACCOUNT_OPENING_MATTER.id, BANK_INCIDENTAL_MATTER.id];
    const legacy = structuredClone(DEFAULT_MATTER_MASTER);
    legacy.matters.inheritance = legacy.matters.inheritance.filter(({ id }) => !addedIds.includes(id));
    legacy.presets.bank = legacy.presets.bank.filter((id) => !addedIds.includes(id));
    const facility = legacy.matters.inheritance.find(({ id }) => id === 'care-facility')!;
    facility.text = '被相続人の相続税申告および関連手続きに伴い、被相続人が入居・入所していた施設が保管する「施設入所時における契約書の写し」および「介護保険被保険者証の写し」の交付請求ならびに受領に関する一切の件';
    const saved = await save(legacy, 1);
    expect(saved.response.status).toBe(200);

    const { runMasterMigrations } = await import('../masterMigrations.js');
    runMasterMigrations();
    runMasterMigrations();

    const loaded = await load();
    expect(masterOf(loaded.body)).toEqual(DEFAULT_MATTER_MASTER);
    expect(loaded.body.version).toBe(saved.body.version + 2);
    const history = await requestJson<AuditResponse[]>('/audit-logs?targetType=poa_matter');
    expect(history.body[0]).toMatchObject({ action: 'create', actor: 'システム（金融機関の委任事項を追加）' });
  });

  it.each([
    '被相続人名義の全取引に係る残高証明書、利息計算書、取引明細書等の発行請求および当該書類の受領に関する一切の権限',
    '被相続人名義の全取引に係る残高証明書、利息計算書、取引明細書等の発行請求及び受領に関する一切の権限',
  ])('旧版の取引明細書の初期文言を更新し、個別に編集した文言を保つ (%#)', async (oldText) => {
    const legacy = structuredClone(DEFAULT_MATTER_MASTER);
    legacy.matters.inheritance[0].text = oldText;
    legacy.matters.inheritance[1].text = '個別に編集した金融機関の文言';
    const saved = await save(legacy, 1);
    expect(saved.response.status).toBe(200);

    const { runMasterMigrations } = await import('../masterMigrations.js');
    runMasterMigrations();
    runMasterMigrations();

    legacy.matters.inheritance[0].text = DEFAULT_MATTER_MASTER.matters.inheritance[0].text;
    const loaded = await load();
    expect(masterOf(loaded.body)).toEqual(legacy);
    expect(loaded.body.version).toBe(saved.body.version + 1);
  });

  it('登録済みの付帯事項を相続手続き用の末尾へ一度だけ移す', async () => {
    const legacy = structuredClone(DEFAULT_MATTER_MASTER);
    const incidental = legacy.matters.inheritance.pop();
    expect(incidental).toEqual(BANK_INCIDENTAL_MATTER);
    legacy.matters.inheritance.splice(3, 0, BANK_INCIDENTAL_MATTER);
    const saved = await save(legacy, 1);
    expect(saved.response.status).toBe(200);

    const { runMasterMigrations } = await import('../masterMigrations.js');
    runMasterMigrations();
    runMasterMigrations();

    const loaded = await load();
    expect(masterOf(loaded.body)).toEqual(DEFAULT_MATTER_MASTER);
    expect(loaded.body.version).toBe(saved.body.version + 1);
    const history = await requestJson<AuditResponse[]>('/audit-logs?targetType=poa_matter');
    expect(history.body[0]).toMatchObject({ action: 'reorder', actor: 'システム（付帯事項を相続手続き用の末尾へ移動）' });
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
    expect(reorderedResult.body.presets.bank).toEqual(['new-matter', ...[...DEFAULT_MATTER_MASTER.presets.bank].reverse()]);
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
