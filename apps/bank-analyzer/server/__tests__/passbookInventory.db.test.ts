// 通帳有無一覧表。値はすべて架空。

import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { BASE_PATH, createApp } from '../app.js';
import { warekiFull, warekiYearAbbr } from '../lib/dates.js';
import { seedCase } from './helpers/fixtures.js';
import { useTestDb } from './helpers/testDb.js';

const db = useTestDb();
const API = `${BASE_PATH}/api/cases`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

async function call(path: string, init?: { method: string; body?: unknown }) {
  const res = await createApp(db()).request(`${API}${path}`, init && {
    method: init.method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(init.body),
  });
  return { status: res.status, json: (await res.json()) as Json };
}

async function upload(caseId: bigint, content: string | Uint8Array, name = '架空.csv') {
  const form = new FormData();
  form.append('file', new File([content], name));
  const res = await createApp(db()).request(`${API}/${caseId}/passbook-inventory/import`, { method: 'POST', body: form });
  return { status: res.status, json: (await res.json()) as Json };
}

const inventory = async (caseId: bigint) => (await call(`/${caseId}/passbook-inventory`)).json;

async function seed() {
  const seeded = await seedCase(db(), 'ZZQ架空商会', [
    { date: '2023-05-01', description: 'ZZQ架空', amountIn: 1000, balance: 1000 },
    { date: '2025-03-01', description: 'ZZQ架空', amountOut: 100, balance: 900 },
    { date: '2025-06-01', description: 'ZZQ架空', amountOut: 100, balance: 800 },
    { date: null, description: 'ZZQ日付なし', amountOut: 1, balance: 5 },
    { date: '2024-02-01', description: 'ZZQ別口座', amountIn: 50, balance: 50, accountNumber: '7654321' },
  ]);
  return seeded;
}

describe('和暦', () => {
  it('年の見出しはその年の1月1日の元号、長い表記は元年を「元」と書く', () => {
    expect(warekiYearAbbr(2019)).toBe('H31');
    expect(warekiYearAbbr(2020)).toBe('R2');
    expect(warekiFull('2019-05-01')).toBe('令和元年5月1日');
    expect(warekiFull('2024-01-26')).toBe('令和6年1月26日');
  });
});

describe('一覧', () => {
  it('年は案件の取引の最初から最後まで。有無は取引のある年、通帳残高は相続開始日以前の最後の残高', async () => {
    const { caseId } = await seed();
    await db().case.update({ where: { id: caseId }, data: { referenceDate: new Date('2025-04-01T00:00:00Z') } });
    const inv = await inventory(caseId);
    expect(inv.years).toEqual([
      { year: 2023, wareki: 'R5' },
      { year: 2024, wareki: 'R6' },
      { year: 2025, wareki: 'R7' },
    ]);
    expect(inv.rows.map((r: Json) => [r.accountNumber, r.years.map((y: Json) => y.has), r.passbookBalance, r.balanceMatch])).toEqual([
      ['1234567', [true, false, true], 900, '残高証明なし'],
      ['7654321', [false, true, false], 50, '残高証明なし'],
    ]);
    expect(inv.totalPassbook).toBe(950);
  });

  it('相続開始日が無ければ日付のある最後の残高（Django 版は日付の無い取引の残高を拾っていた）', async () => {
    const { caseId } = await seed();
    const inv = await inventory(caseId);
    expect(inv.rows[0].autoBalance).toBe(800);
  });
});

describe('欄の書き込み', () => {
  it('通帳残高・残証残高で一致を判定し、空にすれば自動の残高へ戻る', async () => {
    const { caseId, accounts } = await seed();
    const id = accounts.get('1234567')!;
    const path = `/${caseId}/passbook-inventory/accounts/${id}`;
    expect((await call(path, { method: 'PATCH', body: { field: 'certificateBalance', value: '800' } })).json).toMatchObject({
      balanceMatch: '○', passbookBalance: 800,
    });
    expect((await call(path, { method: 'PATCH', body: { field: 'passbookBalance', value: '1,000' } })).json).toMatchObject({
      balanceMatch: '×', passbookBalance: 1000, autoBalance: 800, manualBalance: 1000,
    });
    // 空にすると手で入れた値が消え（画面は欄を空にして「自動」と出す）、残高は自動へ戻る
    expect((await call(path, { method: 'PATCH', body: { field: 'passbookBalance', value: '' } })).json).toMatchObject({
      passbookBalance: 800, manualBalance: null,
    });
  });

  it('年の通帳有無は1キーずつ書き、取引のある年でも「無」にできる', async () => {
    const { caseId, accounts } = await seed();
    const path = `/${caseId}/passbook-inventory/accounts/${accounts.get('1234567')}`;
    await Promise.all([
      call(path, { method: 'PATCH', body: { field: 'passbookYear', year: 2023, value: false } }),
      call(path, { method: 'PATCH', body: { field: 'passbookYear', year: '2024', value: true } }),
    ]);
    const row = (await inventory(caseId)).rows[0];
    expect(row.years.map((y: Json) => y.has)).toEqual([false, true, true]);
  });

  it('読めない値・知らない項目・他の案件の口座は弾く（Django 版は 500 だった）', async () => {
    const { caseId, accounts } = await seed();
    const other = await seedCase(db(), 'ZZQ別案件', [{ description: 'ZZQ', accountNumber: '1111111' }]);
    const path = `/${caseId}/passbook-inventory/accounts/${accounts.get('1234567')}`;
    expect((await call(path, { method: 'PATCH', body: { field: 'passbookBalance', value: '12x' } })).json.error).toBe('通帳残高が不正な値です');
    expect((await call(path, { method: 'PATCH', body: { field: 'passbookYear', value: true } })).json.error).toBe('年が正しくありません');
    expect((await call(path, { method: 'PATCH', body: { field: 'hasAccruedInterest', value: 'on' } })).status).toBe(400);
    expect((await call(path, { method: 'PATCH', body: { field: 'xyz', value: 1 } })).status).toBe(400);
    const foreign = await call(`/${caseId}/passbook-inventory/accounts/${other.accounts.get('1111111')}`, {
      method: 'PATCH', body: { field: 'inventoryRemarks', value: '架空' },
    });
    expect(foreign.status).toBe(404);
  });
});

describe('口座を足す・取り込む', () => {
  it('新しい口座は末尾に既定の備考で足し、既にある口座は入っている欄だけ直す（備考は上書きしない）', async () => {
    const { caseId } = await seed();
    const add = (body: Json) => call(`/${caseId}/passbook-inventory/accounts`, { method: 'POST', body });
    expect((await add({ accountNumber: '9999999', bankName: '架空信金', certificateBalance: '300,000' })).json).toMatchObject({
      created: true, message: '残高証明書の口座を追加しました。',
    });
    await db().account.update({ where: { caseId_accountNumber: { caseId, accountNumber: '1234567' } }, data: { inventoryRemarks: '架空の備考' } });
    expect((await add({ accountNumber: '1234567', certificateBalance: 800, hasAccruedInterest: true })).json.message).toBe('残高証明書の口座を更新しました。');

    const rows = (await inventory(caseId)).rows;
    expect(rows.map((r: Json) => [r.accountNumber, r.bankName, r.certificateBalance, r.hasAccruedInterest, r.inventoryRemarks])).toEqual([
      ['1234567', '架空銀行', 800, true, '架空の備考'],
      ['7654321', '架空銀行', null, false, ''],
      ['9999999', '架空信金', 300000, false, '取引履歴なし・残高証明書あり'],
    ]);
    expect((await add({ bankName: '架空' })).json.error).toBe('口座番号を入力してください');
    expect((await add({ accountNumber: '1', certificateBalance: '1.5' })).json.error).toBe('残証残高が不正な値です');
  });

  it('CSV（別名の列）を取り込み、口座番号の無い行は数えて飛ばす。既経過利息の列が無ければ触らない', async () => {
    const { caseId } = await seed();
    await db().account.updateMany({ where: { caseId }, data: { hasAccruedInterest: true } });
    const csv = '金融機関,店舗名,口座No,残高証明書\r\n架空信金,駅前,8888888,"1,500"\r\n架空信金,駅前,,9\r\n,,1234567,800\r\n';
    const res = await upload(caseId, csv);
    expect(res.json).toMatchObject({ created: 1, updated: 1, skipped: 1, message: '残高証明書の口座リストを取り込みました。追加1件、更新1件、スキップ1件。' });
    const rows = (await inventory(caseId)).rows;
    expect(rows.map((r: Json) => [r.accountNumber, r.branchName, r.certificateBalance, r.hasAccruedInterest])).toEqual([
      ['1234567', '本店', 800, true],
      ['7654321', '本店', null, true],
      ['8888888', '駅前', 1500, false],
    ]);
  });

  it('Excel も読む。読めない行があれば行番号を出して1件も書かない', async () => {
    const { caseId } = await seed();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('架空');
    ws.addRows([['銀行名', '口座番号', '残証残高', '既経過利息'], ['架空銀行', 5555555, 1200, '有']]);
    const ok = await upload(caseId, new Uint8Array(await wb.xlsx.writeBuffer()), '架空.xlsx');
    expect(ok.json).toMatchObject({ created: 1 });
    expect((await inventory(caseId)).rows.at(-1)).toMatchObject({ accountNumber: '5555555', certificateBalance: 1200, hasAccruedInterest: true });

    const bad = await upload(caseId, '口座番号,残証残高\n6666666,1\n7777777,x\n');
    expect(bad.status).toBe(400);
    expect(bad.json.error).toBe('取込に失敗しました: 行3: 残証残高が不正な値です');
    expect(await db().account.count({ where: { caseId, accountNumber: '6666666' } })).toBe(0);
    expect((await upload(caseId, '銀行名,残高\nA,1\n')).json.error).toMatch(/口座番号の列が見つかりません/);
  });
});

describe('並び替え', () => {
  it('まとめて書く。他の案件の口座や重複があれば何も書かない', async () => {
    const { caseId, accounts } = await seed();
    const a = accounts.get('1234567')!;
    const b = accounts.get('7654321')!;
    const other = await seedCase(db(), 'ZZQ別案件', [{ description: 'ZZQ', accountNumber: '1111111' }]);
    const put = (order: unknown) => call(`/${caseId}/passbook-inventory/order`, { method: 'PUT', body: { order } });

    expect((await put([String(b), String(a)])).status).toBe(200);
    expect((await inventory(caseId)).rows.map((r: Json) => r.accountNumber)).toEqual(['7654321', '1234567']);

    expect((await put([String(a), String(other.accounts.get('1111111'))])).status).toBe(400);
    expect((await put([String(a), String(a)])).status).toBe(400);
    expect((await put([])).status).toBe(400);
    expect((await inventory(caseId)).rows.map((r: Json) => r.accountNumber)).toEqual(['7654321', '1234567']);
  });
});

describe('Excel', () => {
  it('Django 版と同じ体裁: 年の見出し2段・最低12行・合計行・A4 横1枚', async () => {
    const { caseId, accounts } = await seed();
    await db().case.update({ where: { id: caseId }, data: { referenceDate: new Date('2019-05-01T00:00:00Z') } });
    await db().account.update({ where: { id: accounts.get('7654321')! }, data: { certificateBalance: 50, hasAccruedInterest: true } });
    const res = await createApp(db()).request(`${API}/${caseId}/export/xlsx/passbook-inventory`);
    expect(res.status).toBe(200);
    expect(decodeURIComponent(res.headers.get('Content-Disposition')!)).toMatch(/_ZZQ架空商会_通帳有無一覧表_預貯金分析\.xlsx$/);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await res.arrayBuffer());
    const ws = wb.getWorksheet('通帳有無一覧表')!;
    expect(ws.getCell('A1').value).toBe('ZZQ架空商会  通帳有無一覧表');
    expect(ws.getCell('G1').value).toBe('相続開始日：令和元年5月1日');
    expect(ws.getCell('M1').value).toMatch(/^\d{4}\/\d{2}\/\d{2}\n\(作成日\)$/);
    // 年は 2023〜2025 の3列（F〜H）、続いて 通帳残高（I）〜備考（M）
    expect([ws.getCell('F2').value, ws.getCell('F3').value, ws.getCell('I2').value, ws.getCell('M2').value]).toEqual(['2023', '(R5)', '通帳\n残高', '備考']);
    // 相続開始日（2019-05-01）以前に残高のある取引が無いので、通帳残高は空
    expect([4, 5].map((r) => ['A', 'E', 'F', 'G', 'I', 'J', 'K', 'L'].map((col) => ws.getCell(`${col}${r}`).value))).toEqual([
      [1, '1234567', '○', '', null, '残高証明なし', null, '□ 有'],
      [2, '7654321', '', '○', null, '証明のみ', 50, '☑ 有'],
    ]);
    expect(ws.getCell('A15').value).toBe(12);
    expect(ws.getCell('J15').value).toBe('残高証明なし');
    expect(ws.getCell('A16').value).toBe('計');
    expect(ws.getCell('K16').value).toBe(50);
    expect(ws.getCell('B4').fill).toMatchObject({ fgColor: { argb: 'FFFFDAB9' } });
    expect(ws.pageSetup).toMatchObject({ paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 });
  });

  it('取引も口座も無い案件でも出す', async () => {
    const { caseId } = await seedCase(db(), 'ZZQ空');
    const res = await createApp(db()).request(`${API}/${caseId}/export/xlsx/passbook-inventory`);
    expect(res.status).toBe(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await res.arrayBuffer());
    expect(wb.getWorksheet('通帳有無一覧表')!.getCell('F1').value).toBe('相続開始日：○年○月○日');
  });
});
