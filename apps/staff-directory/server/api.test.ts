import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type Database from 'better-sqlite3';
import { openDb } from './db.js';
import { createApiRouter } from './api.js';

// 名前・番号はすべて架空（リポジトリは公開）

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

describe('社員', () => {
  it('追加すると台帳IDが振られ、部署名つきで読める', async () => {
    const dept = await call('POST', '/departments', { name: '資産税部' });
    const created = await call('POST', '/staff', {
      name: '山田',
      nameKana: 'やまだ',
      departmentId: dept.body.id,
      mobilePhone: '090-0000-0000',
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ id: 1, name: '山田', nameKana: 'ヤマダ', departmentName: '資産税部' });

    const got = await call('GET', '/staff/1');
    expect(got.body.departmentName).toBe('資産税部');
  });

  it('既定は在籍だけ。退職日を入れると在籍から外れ、退職とすべてに出る', async () => {
    await call('POST', '/staff', { name: '山田' });
    await call('POST', '/staff', { name: '鈴木', retiredOn: '2026-03-31' });

    const names = async (q: string) => (await call('GET', `/staff${q}`)).body.map((s: { name: string }) => s.name);
    expect(await names('')).toEqual(['山田']);
    expect(await names('?status=retired')).toEqual(['鈴木']);
    expect(await names('?status=all')).toHaveLength(2);
    expect((await call('GET', '/staff?status=x')).status).toBe(400);
  });

  it('フリガナ順に並び、未入力は末尾', async () => {
    await call('POST', '/staff', { name: '未入力' });
    await call('POST', '/staff', { name: '渡辺', nameKana: 'ワタナベ' });
    await call('POST', '/staff', { name: '青木', nameKana: 'あおき' });
    const list = (await call('GET', '/staff')).body.map((s: { name: string }) => s.name);
    expect(list).toEqual(['青木', '渡辺', '未入力']);
  });

  it('社員番号の重複は 409。空同士は何人でもよい', async () => {
    expect((await call('POST', '/staff', { name: 'A', employeeNo: 'T001' })).status).toBe(201);
    const dup = await call('POST', '/staff', { name: 'B', employeeNo: 'T001' });
    expect(dup).toEqual({ status: 409, body: { error: '社員番号「T001」は既に使われています' } });
    expect((await call('POST', '/staff', { name: 'C' })).status).toBe(201);
    expect((await call('POST', '/staff', { name: 'D', employeeNo: '' })).status).toBe(201);
  });

  it('社員番号は後から書き換えられ、台帳IDは変わらない', async () => {
    await call('POST', '/staff', { name: '山田', employeeNo: 'TMP-1' });
    const updated = await call('PUT', '/staff/1', { name: '山田', employeeNo: '1001' });
    expect(updated.body).toMatchObject({ id: 1, employeeNo: '1001' });
  });

  it('無い部署を指定すると 409、無い社員の更新は 404、入力不備は 400', async () => {
    expect((await call('POST', '/staff', { name: '山田', departmentId: 99 })).status).toBe(409);
    expect((await call('PUT', '/staff/99', { name: '山田' })).status).toBe(404);
    expect((await call('POST', '/staff', { name: '' })).status).toBe(400);
  });

  it('社員を消す口は無い', async () => {
    await call('POST', '/staff', { name: '山田' });
    const res = await fetch(`${base}/staff/1`, { method: 'DELETE' });
    expect(res.status).toBe(404);
    expect((await call('GET', '/staff/1')).status).toBe(200);
  });
});

describe('部署', () => {
  it('所属のある部署は消せない（退職者も数える）', async () => {
    const dept = await call('POST', '/departments', { name: '会計部' });
    await call('POST', '/staff', { name: '山田', departmentId: dept.body.id, retiredOn: '2025-03-31' });
    const del = await call('DELETE', `/departments/${dept.body.id}`);
    expect(del.status).toBe(409);
  });

  it('誰も所属していなければ消せる', async () => {
    const dept = await call('POST', '/departments', { name: '会計部' });
    expect((await call('DELETE', `/departments/${dept.body.id}`)).status).toBe(200);
    expect((await call('GET', '/departments')).body).toEqual([]);
  });

  it('同じ名前は 409', async () => {
    await call('POST', '/departments', { name: '会計部' });
    expect((await call('POST', '/departments', { name: '会計部' })).status).toBe(409);
  });

  it('在籍者数は退職者を数えない', async () => {
    const dept = await call('POST', '/departments', { name: '会計部' });
    await call('POST', '/staff', { name: 'A', departmentId: dept.body.id });
    await call('POST', '/staff', { name: 'B', departmentId: dept.body.id, retiredOn: '2025-03-31' });
    expect((await call('GET', '/departments')).body[0].staffCount).toBe(1);
  });
});

describe('事務所', () => {
  it('最初は空で、保存した内容が読める', async () => {
    expect((await call('GET', '/office')).body).toMatchObject({ name: '', phone: '' });
    const saved = await call('PUT', '/office', {
      name: '架空税理士法人',
      postalCode: '1000001',
      address: '東京都千代田区千代田1-1',
      phone: '03-0000-0000',
      fax: '03-0000-0001',
    });
    expect(saved.body).toMatchObject({ name: '架空税理士法人', postalCode: '100-0001' });
  });
});

describe('他アプリとの対応', () => {
  it('app ごとの対応を返し、app が無ければ 400', async () => {
    const dept = await call('POST', '/departments', { name: '資産税部' });
    const staff = await call('POST', '/staff', { name: '山田', departmentId: dept.body.id });
    const link = db.prepare('INSERT INTO external_links (app, entity, external_id, local_id) VALUES (?, ?, ?, ?)');
    link.run('itcm', 'department', '7', dept.body.id);
    link.run('itcm', 'staff', '12', staff.body.id);
    link.run('other', 'staff', '99', staff.body.id);

    expect((await call('GET', '/links?app=itcm')).body).toEqual([
      { entity: 'department', externalId: '7', localId: dept.body.id },
      { entity: 'staff', externalId: '12', localId: staff.body.id },
    ]);
    expect((await call('GET', '/links')).status).toBe(400);
  });
});
