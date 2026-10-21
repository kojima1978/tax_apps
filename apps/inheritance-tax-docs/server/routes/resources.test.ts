import express from 'express';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ResourceResponse = {
  id: number;
  title: string;
  description: string;
  filename: string | null;
  url: string | null;
  sort_order: number;
  company_ids: number[];
};

type AuditResponse = {
  id: number;
  targetId: string;
  action: string;
  actor: string;
};

let server: Server;
let baseUrl: string;
let workDir: string;
let uploadsDir: string;
let closeDb: () => void;

const operatorHeaders = (name = '架空 花子') => ({
  'x-operator-name': encodeURIComponent(name),
});

const requestJson = async <T>(path: string, init?: RequestInit): Promise<{ response: Response; body: T }> => {
  const response = await fetch(`${baseUrl}${path}`, init);
  return { response, body: await response.json() as T };
};

const createResource = async (title: string, options: { companyIds?: number[]; fileBody?: string } = {}) => {
  const form = new FormData();
  form.append('title', title);
  form.append('description', '動作確認用の説明');
  form.append('companyIds', JSON.stringify(options.companyIds ?? []));
  if (options.fileBody !== undefined) {
    form.append('file', new Blob([options.fileBody], { type: 'text/plain' }), 'sample.txt');
  } else {
    form.append('url', 'https://example.invalid/reference');
  }
  return requestJson<ResourceResponse>('/resources/', {
    method: 'POST',
    headers: operatorHeaders(),
    body: form,
  });
};

beforeEach(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'inheritance-tax-docs-test-'));
  uploadsDir = join(workDir, 'uploads');
  mkdirSync(uploadsDir);
  process.env.DATABASE_PATH = join(workDir, 'resources.sqlite');
  vi.resetModules();

  const dbModule = await import('../db.js');
  const { createResourcesRouter } = await import('./resources.js');
  const { createResourceFilesRouter } = await import('./resourceFiles.js');
  const { createAuditLogsRouter } = await import('./auditLogs.js');
  closeDb = dbModule.closeDb;

  const app = express();
  app.use(express.json());
  app.use('/resources', createResourcesRouter(uploadsDir));
  app.use('/files', createResourceFilesRouter(uploadsDir));
  app.use('/audit-logs', createAuditLogsRouter());

  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  closeDb();
  delete process.env.DATABASE_PATH;
  rmSync(workDir, { recursive: true, force: true });
});

describe('参考資料API', () => {
  it('ファイル差し替え後も旧実体を保持し、削除履歴から新実体を復元できる', async () => {
    const created = await createResource('架空参考資料', { companyIds: [9], fileBody: 'first-version' });
    expect(created.response.status).toBe(201);
    expect(created.body.company_ids).toEqual([9]);
    expect(created.body.filename).toBe('sample.txt');
    expect(readFileSync(join(uploadsDir, 'sample.txt'), 'utf8')).toBe('first-version');

    const updateForm = new FormData();
    updateForm.append('title', '架空参考資料（更新）');
    updateForm.append('description', '更新後の説明');
    updateForm.append('companyIds', '[]');
    updateForm.append('file', new Blob(['second-version'], { type: 'text/plain' }), 'sample.txt');
    const updated = await requestJson<ResourceResponse>(`/resources/${created.body.id}/`, {
      method: 'PUT',
      headers: operatorHeaders(),
      body: updateForm,
    });
    expect(updated.response.status).toBe(200);
    expect(updated.body.filename).not.toBe('sample.txt');
    expect(readFileSync(join(uploadsDir, 'sample.txt'), 'utf8')).toBe('first-version');
    expect(readFileSync(join(uploadsDir, updated.body.filename!), 'utf8')).toBe('second-version');

    const activeDownload = await fetch(`${baseUrl}/files/${encodeURIComponent(updated.body.filename!)}`);
    expect(activeDownload.status).toBe(200);
    expect(activeDownload.headers.get('content-disposition')).toContain('attachment');
    expect(activeDownload.headers.get('x-content-type-options')).toBe('nosniff');
    expect(activeDownload.headers.get('cache-control')).toBe('private, no-store');
    expect(await activeDownload.text()).toBe('second-version');

    const removed = await fetch(`${baseUrl}/resources/${created.body.id}/`, {
      method: 'DELETE',
      headers: operatorHeaders(),
    });
    expect(removed.status).toBe(200);
    const hidden = await requestJson<ResourceResponse[]>('/resources/');
    expect(hidden.body).toEqual([]);
    expect(readFileSync(join(uploadsDir, updated.body.filename!), 'utf8')).toBe('second-version');
    expect((await fetch(`${baseUrl}/files/${encodeURIComponent(updated.body.filename!)}`)).status).toBe(404);

    const history = await requestJson<AuditResponse[]>('/audit-logs?targetType=resource');
    expect(history.body.slice(0, 3).map((entry) => entry.action)).toEqual(['delete', 'update', 'create']);
    expect(history.body.slice(0, 3).every((entry) => entry.actor === '架空 花子')).toBe(true);

    const deleteLog = history.body.find((entry) => entry.action === 'delete');
    const restored = await requestJson<ResourceResponse>(`/audit-logs/${deleteLog!.id}/restore`, {
      method: 'POST',
      headers: operatorHeaders('架空 太郎'),
    });
    expect(restored.response.status).toBe(200);
    expect(restored.body.title).toBe('架空参考資料（更新）');
    expect(restored.body.filename).toBe(updated.body.filename);
    expect(readFileSync(join(uploadsDir, restored.body.filename!), 'utf8')).toBe('second-version');
    expect((await fetch(`${baseUrl}/files/${encodeURIComponent(restored.body.filename!)}`)).status).toBe(200);

    const restoredHistory = await requestJson<AuditResponse[]>('/audit-logs?targetType=resource&action=restore');
    expect(restoredHistory.body[0]).toMatchObject({ action: 'restore', actor: '架空 太郎' });

    await fetch(`${baseUrl}/resources/${created.body.id}/`, {
      method: 'DELETE',
      headers: operatorHeaders(),
    });
    const staleRestore = await requestJson<{ error: string }>(`/audit-logs/${deleteLog!.id}/restore`, {
      method: 'POST',
      headers: operatorHeaders(),
    });
    expect(staleRestore.response.status).toBe(409);
    expect(staleRestore.body.error).toBe('最新の削除履歴から復元してください');

    const latestHistory = await requestJson<AuditResponse[]>('/audit-logs?targetType=resource');
    const latestDelete = latestHistory.body.find((entry) => entry.action === 'delete');
    expect(latestDelete!.id).not.toBe(deleteLog!.id);
    const latestRestore = await requestJson<ResourceResponse>(`/audit-logs/${latestDelete!.id}/restore`, {
      method: 'POST',
      headers: operatorHeaders(),
    });
    expect(latestRestore.response.status).toBe(200);
    expect(latestRestore.body.filename).toBe(updated.body.filename);
  });

  it('全社共通と会社限定を絞り込み、並び替え履歴を残す', async () => {
    const common = await createResource('全社共通');
    const first = await createResource('会社1限定', { companyIds: [1] });
    const second = await createResource('会社2限定', { companyIds: [2] });

    const companyOne = await requestJson<ResourceResponse[]>('/resources/?companyId=1');
    expect(companyOne.body.map((item) => item.title)).toEqual(['全社共通', '会社1限定']);

    const reorderedIds = [second.body.id, first.body.id, common.body.id];
    const reordered = await requestJson<{ ok?: boolean; error?: string }>('/resources/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
      body: JSON.stringify({ ids: reorderedIds }),
    });
    expect(reordered.response.status).toBe(200);

    const all = await requestJson<ResourceResponse[]>('/resources/');
    expect(all.body.map((item) => item.id)).toEqual(reorderedIds);
    const history = await requestJson<AuditResponse[]>('/audit-logs?targetType=resource&action=reorder');
    expect(history.body[0]).toMatchObject({ action: 'reorder', actor: '架空 花子' });

    const invalid = await requestJson<{ error: string }>('/resources/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [common.body.id] }),
    });
    expect(invalid.response.status).toBe(400);
  });

  it('危険な拡張子を拒否し、ファイル名からパス文字を除去する', async () => {
    const unsafe = new FormData();
    unsafe.append('title', '危険なファイル');
    unsafe.append('companyIds', '[]');
    unsafe.append('file', new Blob(['<script>alert(1)</script>'], { type: 'text/html' }), 'unsafe.html');
    const rejected = await requestJson<{ error: string }>('/resources/', {
      method: 'POST',
      body: unsafe,
    });
    expect(rejected.response.status).toBe(400);
    expect(rejected.body.error).toContain('PDF');
    expect(readdirSync(uploadsDir)).toEqual([]);

    const safe = new FormData();
    safe.append('title', '安全なファイル');
    safe.append('companyIds', '[]');
    safe.append('file', new Blob(['pdf-body'], { type: 'application/pdf' }), '../架空?資料.pdf');
    const created = await requestJson<ResourceResponse>('/resources/', {
      method: 'POST',
      body: safe,
    });
    expect(created.response.status).toBe(201);
    expect(created.body.filename).toBe('架空_資料.pdf');
    expect(readdirSync(uploadsDir)).toEqual(['架空_資料.pdf']);
    expect(readFileSync(join(uploadsDir, created.body.filename!), 'utf8')).toBe('pdf-body');
  });

  it('資料元を必須かつ一つに限定し、不正な入力で新規ファイルを残さない', async () => {
    const noSource = new FormData();
    noSource.append('title', '資料元なし');
    noSource.append('companyIds', '[]');
    const missing = await requestJson<{ error: string }>('/resources/', { method: 'POST', body: noSource });
    expect(missing.response.status).toBe(400);
    expect(missing.body.error).toContain('ファイルまたは外部リンク');

    const unsafeUrl = new FormData();
    unsafeUrl.append('title', '危険なリンク');
    unsafeUrl.append('companyIds', '[]');
    unsafeUrl.append('url', 'javascript:alert(1)');
    const unsafe = await requestJson<{ error: string }>('/resources/', { method: 'POST', body: unsafeUrl });
    expect(unsafe.response.status).toBe(400);
    expect(unsafe.body.error).toContain('http://');

    const both = new FormData();
    both.append('title', '資料元が二つ');
    both.append('companyIds', '[]');
    both.append('url', 'https://example.invalid/reference');
    both.append('file', new Blob(['temporary'], { type: 'text/plain' }), 'temporary.txt');
    const duplicated = await requestJson<{ error: string }>('/resources/', { method: 'POST', body: both });
    expect(duplicated.response.status).toBe(400);
    expect(duplicated.body.error).toContain('どちらか一方');
    expect(readdirSync(uploadsDir)).toEqual([]);

    const all = await requestJson<ResourceResponse[]>('/resources/');
    expect(all.body).toEqual([]);
  });

  it('不正な更新は既存資料を変更せず、新規アップロードも除去する', async () => {
    const created = await createResource('更新前の架空資料');
    expect(created.response.status).toBe(201);

    const invalid = new FormData();
    invalid.append('title', '変更されない名称');
    invalid.append('companyIds', '[]');
    invalid.append('url', 'file:///etc/passwd');
    invalid.append('file', new Blob(['temporary'], { type: 'text/plain' }), 'temporary.txt');
    const rejected = await requestJson<{ error: string }>(`/resources/${created.body.id}/`, {
      method: 'PUT',
      body: invalid,
    });
    expect(rejected.response.status).toBe(400);
    expect(readdirSync(uploadsDir)).toEqual([]);

    const after = await requestJson<ResourceResponse[]>('/resources/');
    expect(after.body).toHaveLength(1);
    expect(after.body[0]).toMatchObject({
      title: '更新前の架空資料',
      url: 'https://example.invalid/reference',
      filename: null,
    });

    const removeOnly = new FormData();
    removeOnly.append('title', '資料元を消す更新');
    removeOnly.append('companyIds', '[]');
    const sourceLess = await requestJson<{ error: string }>(`/resources/${created.body.id}/`, {
      method: 'PUT',
      body: removeOnly,
    });
    expect(sourceLess.response.status).toBe(400);
    expect(sourceLess.body.error).toContain('ファイルまたは外部リンク');
  });
});
