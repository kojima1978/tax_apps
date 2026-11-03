import express from 'express';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let server: Server;
let baseUrl: string;
let workDir: string;
let dbModule: typeof import('../db.js');

const upload = async (body: string, name = '架空見本.png', guideId = 'family-register') => {
  const form = new FormData();
  form.append('image', new Blob([body], { type: 'image/png' }), name);
  return fetch(`${baseUrl}/images/${guideId}`, {
    method: 'PUT',
    headers: { 'x-operator-name': encodeURIComponent('架空 花子') },
    body: form,
  });
};

beforeEach(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'guide-images-test-'));
  process.env.DATABASE_PATH = join(workDir, 'resources.sqlite');
  vi.resetModules();
  dbModule = await import('../db.js');
  const { createAcquisitionGuideImagesRouter } = await import('./acquisitionGuideImages.js');
  const app = express();
  app.use('/images', createAcquisitionGuideImagesRouter());
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  dbModule.closeDb();
  delete process.env.DATABASE_PATH;
  rmSync(workDir, { recursive: true, force: true });
});

describe('取得案内画像API', () => {
  it('画像本体をDBに保存し、差し替え前の版と操作履歴を保持する', async () => {
    expect((await upload('first')).status).toBe(200);
    const listResponse = await fetch(`${baseUrl}/images`);
    expect(listResponse.headers.get('cache-control')).toBe('no-store');
    expect(await (await fetch(`${baseUrl}/images/family-register/content`)).text()).toBe('first');
    expect((await upload('second', '架空見本2.png')).status).toBe(200);
    expect(await (await fetch(`${baseUrl}/images/family-register/content`)).text()).toBe('second');

    const rows = dbModule.getDb().prepare('SELECT deleted_at, image_data FROM acquisition_guide_images ORDER BY id').all() as { deleted_at: string | null; image_data: Buffer }[];
    expect(rows).toHaveLength(2);
    expect(rows[0].deleted_at).not.toBeNull();
    expect(rows[0].image_data.toString()).toBe('first');
    expect(rows[1].deleted_at).toBeNull();
    const audits = dbModule.getDb().prepare("SELECT action, actor FROM audit_logs WHERE target_type = 'acquisition_guide_image' ORDER BY id").all();
    expect(audits).toEqual([{ action: 'create', actor: '架空 花子' }, { action: 'update', actor: '架空 花子' }]);
  });

  it('画像以外と未知の案内IDを拒否し、無効化後は配信しない', async () => {
    const bad = new FormData(); bad.append('image', new Blob(['x'], { type: 'text/plain' }), 'sample.txt');
    expect((await fetch(`${baseUrl}/images/family-register`, { method: 'PUT', body: bad })).status).toBe(400);
    expect((await upload('image')).status).toBe(200);
    expect((await fetch(`${baseUrl}/images/unknown`, { method: 'PUT', body: new FormData() })).status).toBe(404);
    expect((await fetch(`${baseUrl}/images/family-register`, { method: 'DELETE' })).status).toBe(200);
    expect((await fetch(`${baseUrl}/images/family-register/content`)).status).toBe(404);
  });

  it('追加した戸籍案内にも見本画像を登録できる', async () => {
    expect((await upload('heir-image', '架空相続人戸籍.png', 'heir-family-register')).status).toBe(200);
    expect(await (await fetch(`${baseUrl}/images/heir-family-register/content`)).text()).toBe('heir-image');
    expect((await upload('broad-image', '架空広域交付.png', 'family-register-broad-issuance')).status).toBe(200);
    expect(await (await fetch(`${baseUrl}/images/family-register-broad-issuance/content`)).text()).toBe('broad-image');
  });
});
