import express from 'express';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MasterDocument = {
  id: string;
  name: string;
  description: string;
  howToGet: string;
  canDelegate: boolean;
  companyIds?: number[];
};

type MasterCategory = {
  id: string;
  name: string;
  isActive?: boolean;
  documents: MasterDocument[];
};

type MasterResponse = {
  code: string;
  label: string;
  version: number;
  categories: MasterCategory[];
};

type AuditResponse = {
  id: number;
  targetId: string;
  action: string;
  actor: string;
  before: unknown;
  after: unknown;
};

const document = (id: string, name: string, companyIds: number[] = []): MasterDocument => ({
  id,
  name,
  description: `${name}の説明`,
  howToGet: '取得先',
  canDelegate: false,
  companyIds,
});

const INITIAL_CATEGORIES: MasterCategory[] = [
  { id: 'common', name: '共通書類', isActive: true, documents: [document('common-doc', '全社共通書類')] },
  { id: 'limited', name: '会社別書類', isActive: true, documents: [document('limited-doc', '会社2限定書類', [2])] },
];

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

const saveDraft = (categories: MasterCategory[], operator = '架空 花子') => requestJson<{ ok?: boolean; unchanged?: boolean; error?: string }>('/document-masters/income-tax/draft', {
  method: 'PUT',
  headers: operatorHeaders(operator),
  body: JSON.stringify({ categories }),
});

beforeEach(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'document-masters-test-'));
  process.env.DATABASE_PATH = join(workDir, 'masters.sqlite');
  vi.resetModules();

  const dbModule = await import('../db.js');
  const { createDocumentMastersRouter } = await import('./documentMasters.js');
  const { createAuditLogsRouter } = await import('./auditLogs.js');
  closeDb = dbModule.closeDb;
  dbModule.seedDocumentMastersIfEmpty([{ code: 'income-tax', label: '所得税申告', categories: INITIAL_CATEGORIES }]);

  const app = express();
  app.use(express.json());
  app.use('/document-masters', createDocumentMastersRouter());
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

describe('必要書類マスタAPI', () => {
  it('会社別に絞り込み、追加・並び替え・編集・削除を履歴に分類する', async () => {
    const companyOne = await requestJson<MasterResponse>('/document-masters/income-tax?companyId=1');
    expect(companyOne.body.categories.map((category) => category.id)).toEqual(['common']);
    expect(companyOne.body.categories[0].documents.map((item) => item.id)).toEqual(['common-doc']);

    const companyTwo = await requestJson<MasterResponse>('/document-masters/income-tax?companyId=2');
    expect(companyTwo.body.categories.map((category) => category.id)).toEqual(['common', 'limited']);

    const unchanged = await saveDraft(INITIAL_CATEGORIES);
    expect(unchanged.body).toMatchObject({ ok: true, unchanged: true });

    const addedCategory: MasterCategory = { id: 'new', name: '新規カテゴリー', isActive: true, documents: [] };
    const withCreated = [...INITIAL_CATEGORIES, addedCategory];
    expect((await saveDraft(withCreated)).response.status).toBe(200);

    const reordered = [addedCategory, ...INITIAL_CATEGORIES];
    expect((await saveDraft(reordered)).response.status).toBe(200);

    const updated = reordered.map((category) => category.id === 'new' ? { ...category, name: '名称変更後', isActive: false } : category);
    expect((await saveDraft(updated)).response.status).toBe(200);

    const removed = updated.filter((category) => category.id !== 'new');
    expect((await saveDraft(removed)).response.status).toBe(200);

    const history = await requestJson<AuditResponse[]>('/audit-logs?targetType=document_master');
    expect(history.body.map((entry) => entry.action)).toEqual(['delete', 'update', 'reorder', 'create']);
    expect(history.body.every((entry) => entry.actor === '架空 花子')).toBe(true);
    expect(history.body.every((entry) => entry.before !== null && entry.after !== null)).toBe(true);
  });

  it('公開版を積み上げ、過去版を下書きへ復元する', async () => {
    const publishedCategories = INITIAL_CATEGORIES.map((category) => category.id === 'common'
      ? { ...category, name: '公開版カテゴリー' }
      : category);
    await saveDraft(publishedCategories, '架空 太郎');

    const published = await requestJson<{ version: number }>('/document-masters/income-tax/publish', {
      method: 'POST',
      headers: operatorHeaders('架空 太郎'),
    });
    expect(published.response.status).toBe(200);
    expect(published.body.version).toBe(2);

    const live = await requestJson<MasterResponse>('/document-masters/income-tax?mode=published');
    expect(live.body.version).toBe(2);
    expect(live.body.categories[0].name).toBe('公開版カテゴリー');

    const versions = await requestJson<Array<{ version: number }>>('/document-masters/income-tax/versions');
    expect(versions.body.map((item) => item.version)).toEqual([2, 1]);

    const temporaryDraft = publishedCategories.map((category) => category.id === 'common'
      ? { ...category, name: '一時的な下書き' }
      : category);
    await saveDraft(temporaryDraft);

    const restored = await requestJson<{ ok: boolean }>('/document-masters/income-tax/restore/2', {
      method: 'POST',
      headers: operatorHeaders('架空 次郎'),
    });
    expect(restored.response.status).toBe(200);

    const draft = await requestJson<MasterResponse>('/document-masters/income-tax');
    expect(draft.body.categories).toEqual(publishedCategories);
    const restoreHistory = await requestJson<AuditResponse[]>('/audit-logs?targetType=document_master&action=restore');
    expect(restoreHistory.body[0]).toMatchObject({ action: 'restore', actor: '架空 次郎' });

    const publishHistory = await requestJson<AuditResponse[]>('/audit-logs?targetType=document_master&action=publish');
    expect(publishHistory.body[0]).toMatchObject({ action: 'publish', actor: '架空 太郎' });
  });

  it('不正なカテゴリーと会社IDを保存しない', async () => {
    const duplicate = [INITIAL_CATEGORIES[0], { ...INITIAL_CATEGORIES[1], id: INITIAL_CATEGORIES[0].id }];
    expect((await saveDraft(duplicate)).response.status).toBe(400);

    const invalidCompany = INITIAL_CATEGORIES.map((category) => category.id === 'common'
      ? { ...category, documents: [{ ...category.documents[0], companyIds: [1.5] }] }
      : category);
    expect((await saveDraft(invalidCompany)).response.status).toBe(400);

    const history = await requestJson<AuditResponse[]>('/audit-logs?targetType=document_master');
    expect(history.body).toEqual([]);
  });
});
