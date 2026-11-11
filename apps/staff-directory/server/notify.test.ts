import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type Database from 'better-sqlite3';
import { openDb } from './db.js';
import { createApiRouter } from './api.js';
import { createNotifier, resolveTargets, type Notifier } from './notify.js';

// 名前はすべて架空（リポジトリは公開）

describe('resolveTargets', () => {
  it('未設定なら既定のコンテナ名へ送る', () => {
    expect(resolveTargets(undefined).map((t) => t.url)).toEqual([
      'http://itcm-frontend:3020/itcm/api/staff-directory',
      'http://private-banking-app:3025/private-banking/api/staff-directory',
    ]);
  });

  it('off で全部止め、送り先ごとに差し替え・停止できる', () => {
    expect(resolveTargets('off')).toEqual([]);
    expect(resolveTargets('itcm=http://localhost:3020/, private-banking=off').map((t) => t.url)).toEqual([
      'http://localhost:3020/itcm/api/staff-directory',
    ]);
  });

  it('知らないアプリ・http で始まらない送り先は起動時に止める', () => {
    expect(() => resolveTargets('unknown=http://x')).toThrow('読めません');
    expect(() => resolveTargets('itcm=itcm-frontend:3020')).toThrow('http(s)://');
  });
});

type Call = { url: string; body: unknown };

function fakeFetch(respond: (url: string) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return respond(String(url));
  }) as typeof fetch;
  return { calls, impl };
}

const targets = resolveTargets(undefined);
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('createNotifier', () => {
  it('続けて保存してもまとめて1回だけ送り、台帳からの知らせだと分かる本文を付ける', async () => {
    const f = fakeFetch(() => json({ ok: true }));
    const n = createNotifier({ targets, fetchImpl: f.impl, debounceMs: 10, log: () => {} });
    n.notify();
    n.notify();
    n.notify();
    expect(n.status().pending).toBe(true);
    await n.idle();
    expect(f.calls).toHaveLength(2);
    expect(f.calls[0].body).toEqual({ trigger: 'directory' });
    expect(n.status()).toMatchObject({ pending: false, results: [{ key: 'itcm', ok: true, synced: true }, { key: 'private-banking', ok: true, synced: true }] });
  });

  it('送っている間の保存は、送り終えてからもう1回送る', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const f = fakeFetch(async () => {
      await gate;
      return json({ ok: true });
    });
    const n = createNotifier({ targets: targets.slice(0, 1), fetchImpl: f.impl, debounceMs: 5, log: () => {} });
    n.notify();
    await vi.waitFor(() => expect(f.calls).toHaveLength(1));
    n.notify();
    release();
    await n.idle();
    expect(f.calls).toHaveLength(2);
  });

  it('相手が止まっていても例外にせず、失敗として残す。相手が台帳を読めなかったことも分ける', async () => {
    const f = fakeFetch((url) => {
      if (url.includes('itcm')) throw new TypeError('fetch failed');
      return json({ ok: false, error: '社員台帳に接続できませんでした' });
    });
    const logs: string[] = [];
    const n = createNotifier({ targets, fetchImpl: f.impl, debounceMs: 1, log: (m) => logs.push(m) });
    n.notify();
    await n.idle();
    expect(n.status().results).toMatchObject([
      { key: 'itcm', ok: false, error: '接続できませんでした（止まっているかもしれません）' },
      { key: 'private-banking', ok: true, synced: false },
    ]);
    expect(logs).toHaveLength(1);
  });

  it('送り先が無ければ何も送らない', () => {
    const n = createNotifier({ targets: [], debounceMs: 1 });
    n.notify();
    expect(n.status()).toMatchObject({ enabled: false, pending: false });
    expect(n.status().lastChangeAt).not.toBeNull();
  });
});

describe('API の書き込みと知らせ', () => {
  let db: Database.Database;
  let server: Server;
  let base: string;
  let count: number;

  beforeEach(async () => {
    db = openDb(':memory:');
    count = 0;
    const notifier: Notifier = { notify: () => void count++, status: () => ({ enabled: true, targets: [], pending: false, lastChangeAt: null, results: [] }), idle: async () => {} };
    const app = express();
    app.use(express.json());
    app.use('/api', createApiRouter(db, { notifier }));
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  });

  afterEach(() => {
    server.close();
    db.close();
  });

  const call = (method: string, path: string, body?: unknown) =>
    fetch(`${base}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  it('成功した保存だけ知らせる。読み取り・入力の誤り・住所・復元の確かめでは知らせない', async () => {
    const created = (await (await call('POST', '/staff', { familyName: '架空' })).json()) as { id: number };
    await vi.waitFor(() => expect(count).toBe(1));

    await call('GET', '/staff');
    await call('POST', '/staff', {});
    expect((await call('PUT', `/staff/${created.id}/personal`, { postalCode: '', address: '架空県', birthDate: null })).status).toBe(200);
    await call('POST', '/backup/preview', { not: 'a backup' });
    await call('PUT', `/staff/${created.id}/short-name`, { shortName: '架' });
    await vi.waitFor(() => expect(count).toBe(2));
    expect(count).toBe(2);
  });

  it('知らせの状況を返す', async () => {
    expect(await (await call('GET', '/notify')).json()).toMatchObject({ enabled: true });
  });
});
