// 取込（ウィザードのプレビュー・確定と直接入力）の API。値はすべて架空。

import { describe, expect, it } from 'vitest';
import { BASE_PATH, createApp } from '../app.js';
import { seedCase } from './helpers/fixtures.js';
import { useTestDb } from './helpers/testDb.js';

const db = useTestDb();
const API = `${BASE_PATH}/api/cases`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

async function call(method: string, path: string, body?: unknown) {
  const res = await createApp(db()).request(`${API}${path}`, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as Json };
}

async function upload(caseId: bigint, files: Record<string, File>) {
  const form = new FormData();
  for (const [k, f] of Object.entries(files)) form.append(k, f);
  const res = await createApp(db()).request(`${API}/${caseId}/import/parse`, { method: 'POST', body: form });
  return { status: res.status, json: (await res.json()) as Json };
}

const HEADER = '日付,摘要,払戻額,お預り額,差引残高\n';
const csvFile = (name: string, body: string) => new File([HEADER + body], name, { type: 'text/csv' });

const account = (accountNumber: string) => ({ bankName: '架空銀行', branchName: '本店', accountType: '普通', accountNumber });

const rowsOf = (caseId: bigint) =>
  db().transaction.findMany({ where: { caseId }, orderBy: { id: 'asc' }, include: { account: true } });

describe('プレビュー', () => {
  it('ファイルを読み、既存の取引との重複に印を付ける（書き込まない）', async () => {
    const { caseId } = await seedCase(db(), '架空 太郎', [
      { date: '2025-04-01', description: 'ZZQ架空商会', amountOut: 1000, balance: 9000 },
    ]);
    const res = await upload(caseId, {
      file_0: csvFile('架空_1234567.csv', 'R7.4.1,ZZQ架空商会,1000,,9000\nR7.4.2,ZZQ架空入金,,500,9500\n'),
    });
    expect(res.status).toBe(200);
    expect(res.json.files).toHaveLength(1);
    expect(res.json.files[0]).toMatchObject({ rowCount: 2, duplicateCount: 1, hasBalance: true });
    expect(res.json.files[0].detectedAccount.accountNumber).toBe('1234567');
    expect(res.json.files[0].rows.map((r: Json) => r.isDuplicate)).toEqual([true, false]);
    expect(await rowsOf(caseId)).toHaveLength(1);
  });

  it('読めないファイルは名前と詳細つきで弾く。ファイルが無ければ弾く', async () => {
    const { caseId } = await seedCase(db());
    const bad = await upload(caseId, { file_0: new File(['あいう\n1,2\n'], '架空.csv') });
    expect(bad.status).toBe(400);
    expect(bad.json.error).toMatch(/^ファイル '架空\.csv' のエラー: /);
    expect(bad.json.details.type).toBeTypeOf('string');

    expect((await upload(caseId, {})).json.error).toBe('ファイルが見つかりません');
    const empty = await createApp(db()).request(`${API}/${caseId}/import/parse`, { method: 'POST' });
    expect(empty.status).toBe(400);
  });
});

describe('確定', () => {
  const seedExisting = () =>
    seedCase(db(), '架空 太郎', [{ date: '2025-04-01', description: 'ZZQ架空商会', amountOut: 1000, balance: 9000 }]);
  const files = [
    {
      account: account('1234567'),
      rows: [
        { date: '2025-04-01', description: 'ZZQ架空商会', amountOut: 1000, amountIn: 0, balance: 9000 },
        { date: '2025-04-05', description: 'ZZQ架空商会', amountOut: 600000, amountIn: 0, balance: null },
      ],
    },
  ];

  it('重複は既定で除外する。分類と多額の印を付け、取込時の点数と履歴は残さない', async () => {
    const { caseId } = await seedExisting();
    await call('POST', `/${caseId}/patterns/add`, { category: '生活費', keyword: 'ZZQ架空商会', scope: 'case' });

    const res = await call('POST', `/${caseId}/import/commit`, { files });
    expect(res.json).toMatchObject({ imported: 1, skipped: 1, message: '1件の取引を取り込みました（1件の重複をスキップ）' });
    const rows = await rowsOf(caseId);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ amountOut: 600000, isLarge: true, category: '生活費', classificationScore: 0, balance: null });
    expect(rows[1]!.descriptionSearch).toBe('zzq架空商会');
    expect(rows[1]!.accountId).toBe(rows[0]!.accountId);
    expect(await db().classificationChange.count()).toBe(0);
  });

  it('「重複を除外」を外せば重複も入れる（Django 版は常に除外していた）', async () => {
    const { caseId } = await seedExisting();
    const res = await call('POST', `/${caseId}/import/commit`, { files, skipDuplicates: false });
    expect(res.json).toMatchObject({ imported: 2, skipped: 0, message: '2件の取引を取り込みました' });
    expect(await rowsOf(caseId)).toHaveLength(3);
  });

  it('口座をまたぐ同額の出入金に資金移動の印を付ける。口座は無ければ作る', async () => {
    const { caseId } = await seedCase(db());
    const res = await call('POST', `/${caseId}/import/commit`, {
      files: [
        { account: account('1111111'), rows: [{ date: '2025-05-01', description: 'ZZQ振替', amountOut: 300000 }] },
        { account: account('2222222'), rows: [{ date: '2025-05-02', description: 'ZZQ振替', amountIn: 300000 }] },
      ],
    });
    expect(res.json.imported).toBe(2);
    const rows = await rowsOf(caseId);
    expect(rows.map((r) => [r.account?.accountNumber, r.isTransfer])).toEqual([
      ['1111111', true],
      ['2222222', true],
    ]);
    expect(rows.every((r) => r.transferTo)).toBe(true);
  });

  it('1行でも読めなければ、どのファイルも入れない', async () => {
    const { caseId } = await seedCase(db());
    const res = await call('POST', `/${caseId}/import/commit`, {
      files: [
        { account: account('1111111'), rows: [{ date: '2025-05-01', description: 'ZZQ', amountOut: 1 }] },
        { account: account('2222222'), rows: [{ date: '2025-02-30', description: 'ZZQ', amountIn: 1 }] },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.json.error).toBe('ファイル2 行1: 日付の形式が正しくありません（YYYY-MM-DD）');
    expect(await rowsOf(caseId)).toHaveLength(0);

    expect((await call('POST', `/${caseId}/import/commit`, { files: [] })).json.error).toBe('インポートデータがありません');
    expect((await call('POST', `/${caseId}/import/commit`, {})).status).toBe(400);
  });
});

describe('直接入力', () => {
  it('空の行は読み飛ばし、残高の空欄は「残高なし」で入れる', async () => {
    const { caseId } = await seedCase(db());
    const res = await call('POST', `/${caseId}/import/direct`, {
      rows: [
        { date: '2025-06-01', description: 'ZZQ架空', amountOut: '1,500', balance: '', ...account('7654321') },
        { date: '', description: '', amountOut: '' },
        { date: '2025-06-02', description: 'ZZQ架空2', amountIn: 2000, accountNumber: '' },
      ],
    });
    expect(res.json).toMatchObject({ count: 2, message: '2件の取引を登録しました。' });
    const rows = await rowsOf(caseId);
    expect(rows.map((r) => [r.account?.accountNumber, r.amountOut, r.amountIn, r.balance])).toEqual([
      ['7654321', 1500, 0, null],
      ['unknown', 0, 2000, null],
    ]);
    expect(rows[0]!.account?.bankName).toBe('架空銀行');
  });

  it('読めない金額や日付の無い行は行番号つきで弾き、何も入れない（Django 版は 0 円にしたり捨てたりしていた）', async () => {
    const { caseId } = await seedCase(db());
    const badAmount = await call('POST', `/${caseId}/import/direct`, {
      rows: [{ date: '2025-06-01', amountOut: 100 }, { date: '2025-06-02', amountOut: '1,2x' }],
    });
    expect(badAmount.json.error).toBe('行2: 出金額が不正な値です');
    const noDate = await call('POST', `/${caseId}/import/direct`, { rows: [{ description: 'ZZQ架空', amountOut: 100 }] });
    expect(noDate.json.error).toBe('行1: 日付を入力してください');
    expect(await rowsOf(caseId)).toHaveLength(0);
    expect((await call('POST', `/${caseId}/import/direct`, { rows: [{}] })).json.error).toBe('登録するデータがありません。');
  });
});
