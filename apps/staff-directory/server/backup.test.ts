import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type Database from 'better-sqlite3';
import { openDb } from './db.js';
import { createApiRouter } from './api.js';

// 名前・住所・番号はすべて架空（リポジトリは公開）

let db: Database.Database;
let server: Server;
let base: string;

beforeEach(async () => {
  db = openDb(':memory:');
  const app = express();
  app.use(express.json());
  app.use('/api', createApiRouter(db));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

afterEach(() => {
  server.close();
  db.close();
});

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function post(path: string, body: unknown): Promise<number> {
  const res = await call('POST', path, body);
  expect(res.status).toBe(201);
  return res.body.id;
}

// 会社2社・部署2つ・社員3人（うち退職1人、兼務1人、住所あり1人）・対応表1行
async function seed() {
  const second = await post('/companies', { name: '架空関連株式会社', postalCode: '1000001', address: '架空県架空市1-1' });
  const tax = await post('/departments', { companyId: 1, name: '資産税部' });
  const audit = await post('/departments', { companyId: second, name: '監査部' });
  const yamada = await post('/staff', {
    familyName: '山田',
    givenName: '太郎',
    familyKana: 'やまだ',
    affiliations: [
      { companyId: 1, departmentId: tax, employeeNo: 'A001', isPrimary: true },
      { companyId: second, departmentId: audit, employeeNo: 'B001' },
    ],
  });
  await call('PUT', `/staff/${yamada}/personal`, { postalCode: '123-4567', address: '架空県架空町2-3', birthDate: '1980-02-29' });
  const sato = await post('/staff', { familyName: '佐藤', affiliations: [{ companyId: 1, departmentId: tax, employeeNo: 'A002' }] });
  const suzuki = await post('/staff', { familyName: '鈴木', retiredOn: '2025-03-31' });
  db.prepare(`INSERT INTO external_links (app, entity, external_id, local_id) VALUES ('itcm', 'staff', '7', ?)`).run(yamada);
  return { second, tax, audit, yamada, sato, suzuki };
}

const withoutStamp = (b: Record<string, unknown>) => ({ ...b, exportedAt: undefined });

describe('JSON の書き出し', () => {
  it('台帳IDと住所・生年月日・所属・対応表がそのまま入る', async () => {
    const ids = await seed();
    const res = await call('GET', '/backup');
    expect(res.status).toBe(200);
    const b = res.body;
    expect(b.format).toBe('staff-directory-backup');
    expect(b.version).toBe(1);
    expect(b.companies.map((c: { id: number }) => c.id)).toEqual([1, ids.second]);
    const yamada = b.staff.find((s: { id: number }) => s.id === ids.yamada);
    expect(yamada).toMatchObject({
      familyName: '山田',
      familyKana: 'ヤマダ',
      postalCode: '123-4567',
      address: '架空県架空町2-3',
      birthDate: '1980-02-29',
    });
    expect(yamada.affiliations).toEqual([
      { companyId: 1, departmentId: ids.tax, employeeNo: 'A001', isPrimary: true },
      { companyId: ids.second, departmentId: ids.audit, employeeNo: 'B001', isPrimary: false },
    ]);
    expect(b.externalLinks).toMatchObject([{ app: 'itcm', entity: 'staff', externalId: '7', localId: ids.yamada }]);
    expect(b.sequences.staff).toBe(ids.suzuki);
  });
});

describe('JSON からの復元', () => {
  it('書き出した後の変更が消え、書き出したときの中身に戻る（台帳IDも同じ）', async () => {
    const ids = await seed();
    const saved = (await call('GET', '/backup')).body;

    await call('PUT', `/staff/${ids.sato}`, { familyName: '佐藤改', affiliations: [] });
    await call('PUT', `/staff/${ids.yamada}/personal`, { postalCode: '', address: '', birthDate: '' });
    await post('/staff', { familyName: '高橋' });

    const res = await call('POST', '/backup/restore', saved);
    expect(res.status).toBe(200);
    expect(res.body.restored).toMatchObject({ companies: 2, departments: 2, staff: 3, activeStaff: 2, withPersonal: 1, externalLinks: 1 });

    const after = (await call('GET', '/backup')).body;
    expect({ ...withoutStamp(after), sequences: undefined }).toEqual({ ...withoutStamp(saved), sequences: undefined });
    expect((await call('GET', `/staff/${ids.sato}`)).body.fullName).toBe('佐藤');
  });

  it('書き出した後に足した人の台帳IDは、復元後に別の人へ振り直さない', async () => {
    await seed();
    const saved = (await call('GET', '/backup')).body;
    const takahashi = await post('/staff', { familyName: '高橋' });
    await call('POST', '/backup/restore', saved);
    expect((await call('GET', `/staff/${takahashi}`)).status).toBe(404);
    const next = await post('/staff', { familyName: '伊藤' });
    expect(next).toBeGreaterThan(takahashi);
  });

  it('preview は件数だけ返し、台帳は変えない', async () => {
    await seed();
    const saved = (await call('GET', '/backup')).body;
    await post('/staff', { familyName: '高橋' });
    const before = (await call('GET', '/backup')).body;

    const res = await call('POST', '/backup/preview', saved);
    expect(res.status).toBe(200);
    expect(res.body.current.staff).toBe(4);
    expect(res.body.restored.staff).toBe(3);
    expect(withoutStamp((await call('GET', '/backup')).body)).toEqual(withoutStamp(before));
  });

  it.each([
    ['形式が違う', (b: Record<string, unknown>) => ({ ...b, format: 'other' }), '社員台帳から書き出した JSON ではありません'],
    ['版が違う', (b: Record<string, unknown>) => ({ ...b, version: 99 }), '版（99）'],
    ['会社が無い', (b: Record<string, unknown>) => ({ ...b, companies: [] }), '会社が1つもありません'],
    [
      '生年月日が実在しない',
      (b: { staff: Record<string, unknown>[] }) => ({ ...b, staff: b.staff.map((s) => ({ ...s, birthDate: '1981-02-29' })) }),
      '生年月日が存在しない日付です',
    ],
    [
      '台帳IDが重複',
      (b: { staff: Record<string, unknown>[] }) => ({ ...b, staff: [...b.staff, b.staff[0]] }),
      '重複しています',
    ],
    [
      '部署が別の会社のもの',
      (b: { staff: { affiliations: Record<string, unknown>[] }[]; departments: { id: number; companyId: number }[] }) => ({
        ...b,
        staff: b.staff.map((s) => ({
          ...s,
          affiliations: s.affiliations.map((a) => ({ ...a, departmentId: b.departments.find((d) => d.companyId !== a.companyId)?.id })),
        })),
      }),
      '所属の部署がその会社のものではありません',
    ],
    [
      '同じ会社で社員番号が重複（DB の一意制約で止まる）',
      (b: { staff: { affiliations: Record<string, unknown>[] }[] }) => ({
        ...b,
        staff: b.staff.map((s) => ({ ...s, affiliations: s.affiliations.map((a) => ({ ...a, employeeNo: 'A001' })) })),
      }),
      '台帳の決まりに合わない行',
    ],
  ])('%s ファイルは 400 で弾き、台帳は変えない', async (_label, mutate, message) => {
    await seed();
    const saved = (await call('GET', '/backup')).body;
    const res = await call('POST', '/backup/restore', (mutate as (b: unknown) => unknown)(saved));
    expect(res.status).toBe(400);
    expect(res.body.error).toContain(message);
    expect(withoutStamp((await call('GET', '/backup')).body)).toEqual(withoutStamp(saved));
  });
});
