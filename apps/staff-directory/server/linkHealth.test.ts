import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type Database from 'better-sqlite3';
import { openDb } from './db.js';
import { createApiRouter } from './api.js';
import { createNotifier, type NotifyResult } from './notify.js';
import {
  KEEP_CLOSED_PER_CHECK,
  alertLines,
  buildChecks,
  createLinkMonitor,
  formatJst,
  judgeSync,
  judgeWorkload,
  listIncidents,
  loadNotifyResults,
  openIncidents,
  recordCheck,
  runCheck,
  saveNotifyResult,
  type LinkCheck,
} from './linkHealth.js';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const syncBody = (over: Record<string, unknown> = {}) => ({ at: '2026-11-12T00:00:00.000Z', trigger: 'interval', ok: true, error: null, lastSuccessAt: '2026-11-12T00:00:00.000Z', ...over });
const workloadBody = { roles: [], staff: [] };
const notifyOf = (over: Partial<NotifyResult>): NotifyResult => ({
  key: 'private-banking',
  label: '資産・負債管理（PB）',
  url: 'http://pb/api/staff-directory',
  at: '2026-11-12T01:00:00.000Z',
  ok: true,
  synced: true,
  error: null,
  ...over,
});

const opened: Database.Database[] = [];
const tmpDirs: string[] = [];
afterEach(() => {
  opened.splice(0).forEach((d) => d.close());
  tmpDirs.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true }));
});
function memDb() {
  const db = openDb(':memory:');
  opened.push(db);
  return db;
}

describe('buildChecks', () => {
  it('写しは知らせの送り先と同じ口、担当件数は4アプリの口を読む', () => {
    const checks = buildChecks();
    expect(checks.filter((c) => c.kind === 'sync').map((c) => c.url)).toEqual([
      'http://itcm-frontend:3020/itcm/api/staff-directory',
      'http://private-banking-app:3025/private-banking/api/staff-directory',
    ]);
    expect(checks.filter((c) => c.kind === 'workload').map((c) => c.url)).toEqual([
      'http://itcm-frontend:3020/itcm/api/staff-directory/workload',
      'http://private-banking-app:3025/private-banking/api/staff-directory/workload',
      'http://stock-valuation-form:3014/stock-valuation-form/api/staff-directory/workload',
      'http://bank-analyzer:3007/bank-analyzer/api/staff-directory/workload',
    ]);
    // 知らせを止めたアプリ（LINKED_APP_ORIGINS=off）は写しを見張らない
    expect(buildChecks([]).filter((c) => c.kind === 'sync')).toEqual([]);
  });
});

describe('judgeSync', () => {
  it('まだ一度も写していない（null）は失敗にしない', () => {
    expect(judgeSync(null, undefined)).toEqual({ ok: true });
  });

  it('最後の写し直しが失敗していれば、その理由で失敗', () => {
    expect(judgeSync(syncBody({ ok: false, error: '社員台帳に接続できませんでした' }), undefined)).toEqual({
      ok: false,
      reason: '写し直しに失敗しています（社員台帳に接続できませんでした）',
    });
  });

  it('知らせが届いていなくても、そのあと写せていれば失敗にしない', () => {
    const failed = notifyOf({ ok: false, synced: null, error: '接続できませんでした（止まっているかもしれません）' });
    expect(judgeSync(syncBody({ lastSuccessAt: '2026-11-12T01:05:00.000Z' }), failed)).toEqual({ ok: true });
    expect(judgeSync(syncBody({ lastSuccessAt: '2026-11-12T00:55:00.000Z' }), failed)).toEqual({
      ok: false,
      reason: '台帳からの知らせが届いていません（接続できませんでした（止まっているかもしれません））',
    });
    expect(judgeSync(syncBody({ lastSuccessAt: '2026-11-12T00:55:00.000Z' }), notifyOf({ synced: false }))).toMatchObject({ ok: false });
    expect(judgeSync(syncBody({ lastSuccessAt: '2026-11-12T00:55:00.000Z' }), notifyOf({}))).toEqual({ ok: true });
  });

  it('形が違えば失敗', () => {
    expect(judgeSync([], undefined)).toEqual({ ok: false, reason: '返ってきた形が違います' });
    expect(judgeSync({ at: 'x' }, undefined)).toEqual({ ok: false, reason: '返ってきた形が違います' });
  });
});

describe('judgeWorkload / runCheck', () => {
  const check: LinkCheck = { app: 'bank-analyzer', label: '預貯金分析', kind: 'workload', url: 'http://ba/api/staff-directory/workload' };

  it('担当件数の口は roles と staff の配列があれば正常', () => {
    expect(judgeWorkload(workloadBody)).toEqual({ ok: true });
    expect(judgeWorkload({ staff: [] })).toMatchObject({ ok: false });
  });

  it('止まっている・エラーを返す・JSON でない、をそれぞれの理由で失敗にする', async () => {
    const down = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    expect(await runCheck(check, undefined, down)).toEqual({ ok: false, reason: '接続できませんでした（止まっているかもしれません）' });
    expect(await runCheck(check, undefined, (async () => json({}, 503)) as unknown as typeof fetch)).toEqual({ ok: false, reason: '503 が返りました' });
    const html = (async () => new Response('<html>', { status: 200 })) as unknown as typeof fetch;
    expect(await runCheck(check, undefined, html)).toEqual({ ok: false, reason: '返ってきた形が違います' });
    expect(await runCheck(check, undefined, (async () => json(workloadBody)) as unknown as typeof fetch)).toEqual({ ok: true });
  });
});

describe('recordCheck', () => {
  const pb = { app: 'private-banking', kind: 'workload' } as const;

  it('失敗の始まりを残し、続く間は理由と確かめた時刻だけ更新し、直ったら終わりを入れる', () => {
    const db = memDb();
    recordCheck(db, pb, { ok: true }, '2026-11-12T00:00:00.000Z');
    expect(listIncidents(db)).toEqual([]);
    recordCheck(db, pb, { ok: false, reason: 'A' }, '2026-11-12T00:05:00.000Z');
    recordCheck(db, pb, { ok: false, reason: 'B' }, '2026-11-12T00:10:00.000Z');
    expect(openIncidents(db)).toMatchObject([
      { app: 'private-banking', label: '資産・負債管理（PB）', kind: 'workload', startedAt: '2026-11-12T00:05:00.000Z', endedAt: null, reason: 'B', lastCheckedAt: '2026-11-12T00:10:00.000Z' },
    ]);
    recordCheck(db, pb, { ok: true }, '2026-11-12T00:15:00.000Z');
    expect(openIncidents(db)).toEqual([]);
    expect(listIncidents(db)).toMatchObject([{ startedAt: '2026-11-12T00:05:00.000Z', endedAt: '2026-11-12T00:15:00.000Z', reason: 'B' }]);
  });

  it('終わった記録はアプリ×見張りごとに直近の分だけ残す（ほかのアプリの記録は消さない）', () => {
    const db = memDb();
    recordCheck(db, { app: 'itcm', kind: 'sync' }, { ok: false, reason: 'itcm' }, '2026-11-01T00:00:00.000Z');
    recordCheck(db, { app: 'itcm', kind: 'sync' }, { ok: true }, '2026-11-01T00:05:00.000Z');
    for (let i = 0; i < KEEP_CLOSED_PER_CHECK + 5; i++) {
      const t = (m: number) => new Date(Date.UTC(2026, 10, 12, 0, i * 10 + m)).toISOString();
      recordCheck(db, pb, { ok: false, reason: `#${i}` }, t(0));
      recordCheck(db, pb, { ok: true }, t(5));
    }
    const rows = listIncidents(db, 1000);
    expect(rows.filter((r) => r.app === 'private-banking')).toHaveLength(KEEP_CLOSED_PER_CHECK);
    expect(rows[0].reason).toBe(`#${KEEP_CLOSED_PER_CHECK + 4}`);
    expect(rows.filter((r) => r.app === 'itcm')).toHaveLength(1);
  });

  it('台帳を作り直しても（DB を開き直しても）記録と知らせの結果は残る', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'link-health-'));
    tmpDirs.push(dir);
    const file = path.join(dir, 'staff.sqlite');
    const first = openDb(file);
    recordCheck(first, pb, { ok: false, reason: '接続できませんでした' }, '2026-11-12T00:05:00.000Z');
    saveNotifyResult(first, notifyOf({ ok: false, synced: null, error: '接続できませんでした' }));
    first.close();
    const again = openDb(file);
    opened.push(again);
    expect(openIncidents(again)).toMatchObject([{ app: 'private-banking', reason: '接続できませんでした' }]);
    expect(loadNotifyResults(again, [{ key: 'private-banking', label: 'PB', url: 'u' }, { key: 'itcm', label: '案件管理', url: 'v' }])).toEqual([
      { key: 'private-banking', label: 'PB', url: 'u', at: '2026-11-12T01:00:00.000Z', ok: false, synced: null, error: '接続できませんでした' },
    ]);
  });
});

describe('alertLines', () => {
  it('しきい値以上続いている失敗だけを、いつからと連携の画面つきで1行にする', () => {
    const db = memDb();
    recordCheck(db, { app: 'private-banking', kind: 'workload' }, { ok: false, reason: '接続できませんでした' }, '2026-11-12T05:00:00.000Z');
    recordCheck(db, { app: 'itcm', kind: 'sync' }, { ok: false, reason: '直前の失敗' }, '2026-11-12T05:25:00.000Z');
    const now = Date.parse('2026-11-12T05:31:00.000Z');
    expect(alertLines(openIncidents(db), 30, now)).toEqual([
      '社員台帳と資産・負債管理（PB）の連携（担当件数の読み取り）が11/12 14:00から失敗しています。理由: 接続できませんでした 連携の画面: http://localhost/staff-directory/links',
    ]);
    expect(alertLines(openIncidents(db), 0, now)).toHaveLength(2);
  });

  it('日本時間で書く（日付をまたぐ）', () => {
    expect(formatJst('2026-11-12T15:04:00.000Z')).toBe('11/13 00:04');
  });
});

describe('createLinkMonitor', () => {
  const checks: LinkCheck[] = [
    { app: 'private-banking', label: '資産・負債管理（PB）', kind: 'sync', url: 'http://pb/api/staff-directory' },
    { app: 'private-banking', label: '資産・負債管理（PB）', kind: 'workload', url: 'http://pb/api/staff-directory/workload' },
  ];

  it('全部の口を読んで状態を返す。止まったアプリはいつからかを持つ', async () => {
    const db = memDb();
    let down = false;
    const fetchImpl = (async (url: string) => {
      if (down) throw new TypeError('fetch failed');
      return json(url.endsWith('/workload') ? workloadBody : syncBody());
    }) as unknown as typeof fetch;
    const m = createLinkMonitor(db, { checks, fetchImpl, schedule: false, log: () => {} });
    expect(m.status().checks.map((c) => c.state)).toEqual(['unchecked', 'unchecked']);
    await m.checkAll();
    expect(m.status().checks.map((c) => c.state)).toEqual(['ok', 'ok']);
    down = true;
    await m.checkAll();
    const s = m.status();
    expect(s.checks).toMatchObject([
      { kind: 'sync', state: 'failed', reason: '接続できませんでした（止まっているかもしれません）' },
      { kind: 'workload', state: 'failed' },
    ]);
    expect(s.checks[0].since).toBe(s.checkedAt);
    down = false;
    await m.checkAll();
    expect(m.status().checks.map((c) => c.state)).toEqual(['ok', 'ok']);
    expect(m.status().incidents.every((i) => i.endedAt !== null)).toBe(true);
  });

  it('作り直した直後でも、続いている失敗は DB から「失敗」と出す', () => {
    const db = memDb();
    recordCheck(db, { app: 'private-banking', kind: 'workload' }, { ok: false, reason: 'x' }, '2026-11-12T00:00:00.000Z');
    const m = createLinkMonitor(db, { checks, fetchImpl: fetch, schedule: false });
    expect(m.status().checks.map((c) => c.state)).toEqual(['unchecked', 'failed']);
  });

  it('知らせの結果を判定に使う（知らせが届かず、その後も写せていなければ失敗）', async () => {
    const db = memDb();
    const fetchImpl = (async (url: string) =>
      json(url.endsWith('/workload') ? workloadBody : syncBody({ lastSuccessAt: '2026-11-12T00:00:00.000Z' }))) as unknown as typeof fetch;
    const m = createLinkMonitor(db, {
      checks,
      fetchImpl,
      schedule: false,
      log: () => {},
      notifyResults: () => [notifyOf({ ok: false, synced: null, error: '接続できませんでした' })],
    });
    await m.checkAll();
    expect(m.status().checks[0]).toMatchObject({ state: 'failed', reason: '台帳からの知らせが届いていません（接続できませんでした）' });
  });
});

describe('知らせの結果を DB に残す（notify.ts の initialResults / onResult）', () => {
  it('送るたびに残し、次に起動したときに読み戻す', async () => {
    const db = memDb();
    const targets = [{ key: 'itcm' as const, label: '案件管理', url: 'http://itcm/api/staff-directory' }];
    const fetchImpl = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const n = createNotifier({ targets, fetchImpl, debounceMs: 1, log: () => {}, onResult: (r) => saveNotifyResult(db, r) });
    n.notify();
    await n.idle();
    const restored = createNotifier({ targets, initialResults: loadNotifyResults(db, targets) });
    expect(restored.status().results).toMatchObject([{ key: 'itcm', ok: false, synced: null, error: '接続できませんでした（止まっているかもしれません）' }]);
  });
});

describe('API /link-health', () => {
  it('/link-health は状態と記録を、/link-health/alerts は読み直してしきい値以上の行だけを text で返す', async () => {
    const db = memDb();
    const fetchImpl = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const checks: LinkCheck[] = [{ app: 'bank-analyzer', label: '預貯金分析', kind: 'workload', url: 'http://ba/w' }];
    const linkMonitor = createLinkMonitor(db, { checks, fetchImpl, schedule: false, log: () => {} });
    const app = express();
    app.use('/api', createApiRouter(db, { linkMonitor }));
    const server = app.listen(0);
    try {
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
      expect(await (await fetch(`${base}/link-health/alerts?minutes=30`)).text()).toBe('');
      const now = await (await fetch(`${base}/link-health/alerts?minutes=0`)).text();
      expect(now).toMatch(/^社員台帳と預貯金分析の連携（担当件数の読み取り）が.+から失敗しています。理由: 接続できませんでした.+links\n$/);
      expect((await fetch(`${base}/link-health/alerts?minutes=x`)).status).toBe(400);
      const status = await (await fetch(`${base}/link-health`)).json();
      expect(status.checks).toMatchObject([{ app: 'bank-analyzer', state: 'failed' }]);
      expect(status.incidents).toHaveLength(1);
    } finally {
      server.close();
    }
  });
});
