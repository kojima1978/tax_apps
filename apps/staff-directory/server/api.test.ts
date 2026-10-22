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

// 新しい DB には「会社名未設定」の会社（id 1）が1件だけある
const staff = (familyName: string, over: Record<string, unknown> = {}) => ({ familyName, ...over });
const at = (companyId: number, over: Record<string, unknown> = {}) => ({ companyId, ...over });

async function addDepartment(name: string, companyId = 1): Promise<number> {
  const res = await call('POST', '/departments', { companyId, name });
  expect(res.status).toBe(201);
  return res.body.id;
}

async function addCompany(name: string, over: Record<string, unknown> = {}): Promise<number> {
  const res = await call('POST', '/companies', { name, ...over });
  expect(res.status).toBe(201);
  return res.body.id;
}

describe('社員', () => {
  it('追加すると台帳IDが振られ、所属と主所属の写しつきで読める', async () => {
    const dept = await addDepartment('資産税部');
    const created = await call('POST', '/staff', {
      familyName: '山田',
      givenName: '太郎',
      familyKana: 'やまだ',
      givenKana: 'たろう',
      mobilePhone: '090-0000-0000',
      affiliations: [at(1, { departmentId: dept, employeeNo: 'T001' })],
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      id: 1,
      fullName: '山田 太郎',
      shortName: '山田',
      name: '山田',
      nameKana: 'ヤマダ タロウ',
      employeeNo: 'T001',
      companyId: 1,
      departmentId: dept,
      departmentName: '資産税部',
      affiliations: [{ companyId: 1, departmentId: dept, departmentName: '資産税部', employeeNo: 'T001', isPrimary: true }],
    });
    expect((await call('GET', '/staff/1')).body.departmentName).toBe('資産税部');
  });

  it('所属が無くても登録でき、主所属の写しは空', async () => {
    const created = await call('POST', '/staff', staff('山田'));
    expect(created.body).toMatchObject({ affiliations: [], companyId: null, departmentId: null, employeeNo: null });
  });

  it('既定は在籍だけ。退職日を入れると在籍から外れ、退職とすべてに出る', async () => {
    await call('POST', '/staff', staff('山田'));
    await call('POST', '/staff', staff('鈴木', { retiredOn: '2026-03-31' }));

    const names = async (q: string) => (await call('GET', `/staff${q}`)).body.map((s: { name: string }) => s.name);
    expect(await names('')).toEqual(['山田']);
    expect(await names('?status=retired')).toEqual(['鈴木']);
    expect(await names('?status=all')).toHaveLength(2);
    expect((await call('GET', '/staff?status=x')).status).toBe(400);
  });

  it('セイ→メイの順に並び、未入力は末尾', async () => {
    await call('POST', '/staff', staff('未入力'));
    await call('POST', '/staff', staff('渡辺', { familyKana: 'ワタナベ' }));
    await call('POST', '/staff', staff('青木', { givenName: '花子', familyKana: 'あおき', givenKana: 'はなこ' }));
    await call('POST', '/staff', staff('青木', { givenName: '一郎', familyKana: 'あおき', givenKana: 'いちろう' }));
    const list = (await call('GET', '/staff')).body.map((s: { fullName: string }) => s.fullName);
    expect(list).toEqual(['青木 一郎', '青木 花子', '渡辺', '未入力']);
  });

  it('略称: 同じ姓の在籍者がいるときだけ、区別がつくところまで名の頭を足す', async () => {
    await call('POST', '/staff', staff('山田', { givenName: '太郎' }));
    await call('POST', '/staff', staff('山田', { givenName: '太一' }));
    await call('POST', '/staff', staff('山田', { givenName: '花子' }));
    await call('POST', '/staff', staff('鈴木', { givenName: '次郎' }));
    // 在籍者は退職者と比べない（在籍の鈴木は姓だけのまま）。退職者は在籍者とだけ比べる
    await call('POST', '/staff', staff('鈴木', { givenName: '三郎', retiredOn: '2025-03-31' }));
    await call('POST', '/staff', staff('佐藤', { givenName: '四郎', retiredOn: '2025-03-31' }));
    await call('POST', '/staff', staff('佐藤', { givenName: '五郎', retiredOn: '2025-03-31' }));

    const all = (await call('GET', '/staff?status=all')).body as { fullName: string; shortName: string }[];
    const short = Object.fromEntries(all.map((s) => [s.fullName, s.shortName]));
    expect(short).toEqual({
      '山田 太郎': '山田太郎',
      '山田 太一': '山田太一',
      '山田 花子': '山田花',
      '鈴木 次郎': '鈴木',
      '鈴木 三郎': '鈴木三',
      '佐藤 四郎': '佐藤',
      '佐藤 五郎': '佐藤',
    });
  });

  it('社員番号は会社ごとに一意。別の会社なら同じ番号でよく、空同士は何人でもよい', async () => {
    const other = await addCompany('架空商事');
    expect((await call('POST', '/staff', staff('A', { affiliations: [at(1, { employeeNo: 'T001' })] }))).status).toBe(201);
    const dup = await call('POST', '/staff', staff('B', { affiliations: [at(1, { employeeNo: 'T001' })] }));
    expect(dup).toEqual({ status: 409, body: { error: '会社名未設定で社員番号「T001」は既に使われています' } });
    expect((await call('POST', '/staff', staff('C', { affiliations: [at(other, { employeeNo: 'T001' })] }))).status).toBe(201);
    expect((await call('POST', '/staff', staff('D', { affiliations: [at(1)] }))).status).toBe(201);
    expect((await call('POST', '/staff', staff('E', { affiliations: [at(1, { employeeNo: '' })] }))).status).toBe(201);
    // 失敗した登録は何も残さない（社員の行だけ残る、をしない）
    const names = (await call('GET', '/staff')).body.map((s: { name: string }) => s.name);
    expect(names.sort()).toEqual(['A', 'C', 'D', 'E']);
  });

  it('1人が複数の会社に所属でき、主所属が先頭に来る', async () => {
    const other = await addCompany('架空商事', { sortOrder: -1 });
    const dept = await addDepartment('営業部', other);
    const created = await call(
      'POST',
      '/staff',
      staff('山田', { affiliations: [at(other, { departmentId: dept }), at(1, { employeeNo: '1001', isPrimary: true })] }),
    );
    expect(created.body.affiliations.map((a: { companyId: number }) => a.companyId)).toEqual([1, other]);
    expect(created.body).toMatchObject({ companyId: 1, employeeNo: '1001', departmentId: null });
  });

  it('所属は丸ごと入れ替わり、台帳IDは変わらない', async () => {
    const other = await addCompany('架空商事');
    await call('POST', '/staff', staff('山田', { affiliations: [at(1, { employeeNo: 'TMP-1' })] }));
    const updated = await call('PUT', '/staff/1', staff('山田', { affiliations: [at(other, { employeeNo: '1001' })] }));
    expect(updated.body).toMatchObject({ id: 1, employeeNo: '1001', companyId: other });
    expect(updated.body.affiliations).toHaveLength(1);
  });

  it('別の会社の部署は付けられない', async () => {
    const other = await addCompany('架空商事');
    const dept = await addDepartment('営業部', other);
    const res = await call('POST', '/staff', staff('山田', { affiliations: [at(1, { departmentId: dept })] }));
    expect(res).toEqual({ status: 409, body: { error: '部署「営業部」は会社名未設定の部署ではありません' } });
  });

  it('無い会社・部署は 409、無い社員の更新は 404、入力不備は 400', async () => {
    expect((await call('POST', '/staff', staff('山田', { affiliations: [at(99)] }))).status).toBe(409);
    expect((await call('POST', '/staff', staff('山田', { affiliations: [at(1, { departmentId: 99 })] }))).status).toBe(409);
    expect((await call('PUT', '/staff/99', staff('山田'))).status).toBe(404);
    expect((await call('POST', '/staff', staff(''))).status).toBe(400);
  });

  it('社員を消す口は無い', async () => {
    await call('POST', '/staff', staff('山田'));
    const res = await fetch(`${base}/staff/1`, { method: 'DELETE' });
    expect(res.status).toBe(404);
    expect((await call('GET', '/staff/1')).status).toBe(200);
  });
});

describe('部署', () => {
  it('会社を指定しなければ 400、無い会社は 409', async () => {
    expect((await call('POST', '/departments', { name: '会計部' })).status).toBe(400);
    expect((await call('POST', '/departments', { companyId: 99, name: '会計部' })).status).toBe(409);
  });

  it('所属のある部署は消せない（退職者も数える）', async () => {
    const dept = await addDepartment('会計部');
    await call('POST', '/staff', staff('山田', { retiredOn: '2025-03-31', affiliations: [at(1, { departmentId: dept })] }));
    expect((await call('DELETE', `/departments/${dept}`)).status).toBe(409);
  });

  it('誰も所属していなければ消せる', async () => {
    const dept = await addDepartment('会計部');
    expect((await call('DELETE', `/departments/${dept}`)).status).toBe(200);
    expect((await call('GET', '/departments')).body).toEqual([]);
  });

  it('同じ会社に同じ名前は 409。別の会社なら作れて、表示名に会社が付く', async () => {
    const other = await addCompany('架空商事', { shortName: '架空' });
    await addDepartment('会計部');
    await addDepartment('総務部');
    expect((await call('POST', '/departments', { companyId: 1, name: '会計部' })).status).toBe(409);
    await addDepartment('会計部', other);
    const labels = (await call('GET', '/departments')).body.map((d: { label: string }) => d.label);
    expect(labels).toEqual(['会社名未設定 会計部', '総務部', '架空 会計部']);
  });

  it('在籍者数は退職者を数えない', async () => {
    const dept = await addDepartment('会計部');
    await call('POST', '/staff', staff('A', { affiliations: [at(1, { departmentId: dept })] }));
    await call('POST', '/staff', staff('B', { retiredOn: '2025-03-31', affiliations: [at(1, { departmentId: dept })] }));
    expect((await call('GET', '/departments')).body[0].staffCount).toBe(1);
  });
});

describe('会社', () => {
  it('最初は「会社名未設定」が1件。直した内容が読める', async () => {
    expect((await call('GET', '/companies')).body).toMatchObject([{ id: 1, name: '会社名未設定' }]);
    const saved = await call('PUT', '/companies/1', {
      name: '架空税理士法人',
      shortName: '架空',
      postalCode: '1000001',
      address: '東京都千代田区千代田1-1',
      phone: '03-0000-0000',
      fax: '03-0000-0001',
    });
    expect(saved.status).toBe(200);
    expect((await call('GET', '/companies')).body[0]).toMatchObject({ name: '架空税理士法人', postalCode: '100-0001' });
  });

  it('同じ名前は 409。表示順で並ぶ', async () => {
    expect((await call('POST', '/companies', { name: '会社名未設定' })).status).toBe(409);
    await addCompany('後', { sortOrder: 2 });
    await addCompany('先', { sortOrder: -1 });
    expect((await call('GET', '/companies')).body.map((c: { name: string }) => c.name)).toEqual(['先', '会社名未設定', '後']);
  });

  it('部署か所属が残っている会社は消せない', async () => {
    const withDept = await addCompany('部署あり');
    await addDepartment('会計部', withDept);
    const withStaff = await addCompany('所属あり');
    await call('POST', '/staff', staff('山田', { retiredOn: '2025-03-31', affiliations: [at(withStaff)] }));
    const empty = await addCompany('空');

    expect((await call('DELETE', `/companies/${withDept}`)).status).toBe(409);
    expect((await call('DELETE', `/companies/${withStaff}`)).status).toBe(409);
    expect((await call('DELETE', `/companies/${empty}`)).status).toBe(200);
    expect((await call('DELETE', `/companies/${empty}`)).status).toBe(404);
  });

  it('件数: 部署数と、所属している在籍者数', async () => {
    const dept = await addDepartment('会計部');
    await call('POST', '/staff', staff('A', { affiliations: [at(1, { departmentId: dept })] }));
    await call('POST', '/staff', staff('B', { retiredOn: '2025-03-31', affiliations: [at(1)] }));
    expect((await call('GET', '/companies')).body[0]).toMatchObject({ departmentCount: 1, staffCount: 1 });
  });

  it('事務所の口（/office）はもう無い', async () => {
    expect((await fetch(`${base}/office`)).status).toBe(404);
  });
});

describe('他アプリとの対応', () => {
  it('app ごとの対応を返し、app が無ければ 400', async () => {
    const dept = await addDepartment('資産税部');
    const person = await call('POST', '/staff', staff('山田', { affiliations: [at(1, { departmentId: dept })] }));
    const link = db.prepare('INSERT INTO external_links (app, entity, external_id, local_id) VALUES (?, ?, ?, ?)');
    link.run('itcm', 'department', '7', dept);
    link.run('itcm', 'staff', '12', person.body.id);
    link.run('other', 'staff', '99', person.body.id);

    expect((await call('GET', '/links?app=itcm')).body).toEqual([
      { entity: 'department', externalId: '7', localId: dept },
      { entity: 'staff', externalId: '12', localId: person.body.id },
    ]);
    expect((await call('GET', '/links')).status).toBe(400);
  });
});

describe('社員の個人情報', () => {
  const personal = { postalCode: '〒１２３４５６７', address: '架空県架空市一丁目1-1', birthDate: '1980-02-29' };

  it('/personal だけで読み書きでき、郵便番号は 123-4567 の形で保存する', async () => {
    await call('POST', '/staff', staff('山田'));
    expect((await call('GET', '/staff/1/personal')).body).toEqual({ id: 1, postalCode: '', address: '', birthDate: null });
    const put = await call('PUT', '/staff/1/personal', personal);
    expect(put.status).toBe(200);
    expect(put.body).toEqual({ id: 1, postalCode: '123-4567', address: '架空県架空市一丁目1-1', birthDate: '1980-02-29' });
    expect((await call('GET', '/staff/1/personal')).body).toEqual(put.body);
  });

  it('一覧・詳細（他アプリが読む形）には出ない', async () => {
    await call('POST', '/staff', staff('山田'));
    await call('PUT', '/staff/1/personal', personal);
    const keys = ['postalCode', 'address', 'birthDate', 'postal_code', 'birth_date'];
    for (const s of [(await call('GET', '/staff?status=all')).body[0], (await call('GET', '/staff/1')).body]) {
      for (const k of keys) expect(s).not.toHaveProperty(k);
    }
  });

  it('社員の更新（PUT /staff/:id）では消えない', async () => {
    await call('POST', '/staff', staff('山田'));
    await call('PUT', '/staff/1/personal', personal);
    await call('PUT', '/staff/1', staff('山田', { givenName: '一郎' }));
    expect((await call('GET', '/staff/1/personal')).body.address).toBe('架空県架空市一丁目1-1');
  });

  it('存在しない生年月日・郵便番号の形違いは 400、無い社員は 404', async () => {
    await call('POST', '/staff', staff('山田'));
    expect((await call('PUT', '/staff/1/personal', { birthDate: '1981-02-29' })).status).toBe(400);
    expect((await call('PUT', '/staff/1/personal', { birthDate: '1980/01/01' })).status).toBe(400);
    expect((await call('PUT', '/staff/1/personal', { postalCode: '12-345' })).status).toBe(400);
    expect((await call('GET', '/staff/99/personal')).status).toBe(404);
    expect((await call('PUT', '/staff/99/personal', personal)).status).toBe(404);
    expect((await call('GET', '/staff/x/personal')).status).toBe(404);
  });
});

describe('略称を手で決める', () => {
  it('決めた略称が shortName と name に出て、空にすると自動へ戻る', async () => {
    const id = (await call('POST', '/staff', staff('山田', { givenName: '太郎' }))).body.id;
    const set = await call('PUT', `/staff/${id}/short-name`, { shortName: ' ヤマ ダ ' });
    expect(set.status).toBe(200);
    expect(set.body).toMatchObject({ shortName: 'ヤマダ', name: 'ヤマダ', customShortName: 'ヤマダ', autoShortName: '山田' });

    const back = await call('PUT', `/staff/${id}/short-name`, { shortName: '' });
    expect(back.body).toMatchObject({ shortName: '山田', customShortName: '' });
  });

  it('社員の更新（PUT /staff/:id）では消えない', async () => {
    const id = (await call('POST', '/staff', staff('山田'))).body.id;
    await call('PUT', `/staff/${id}/short-name`, { shortName: '山ちゃん' });
    await call('PUT', `/staff/${id}`, staff('山田', { givenName: '太郎' }));
    expect((await call('GET', `/staff/${id}`)).body.shortName).toBe('山ちゃん');
  });

  it('長すぎる略称は 400、無い社員は 404', async () => {
    const id = (await call('POST', '/staff', staff('山田'))).body.id;
    expect((await call('PUT', `/staff/${id}/short-name`, { shortName: 'あ'.repeat(11) })).status).toBe(400);
    expect((await call('PUT', '/staff/99/short-name', { shortName: '山' })).status).toBe(404);
  });
});
