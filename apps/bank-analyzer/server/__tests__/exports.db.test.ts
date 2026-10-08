// 取引の CSV・Excel の書き出し。値はすべて架空。

import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { BASE_PATH, createApp } from '../app.js';
import { warekiMonthShort, warekiShort } from '../lib/dates.js';
import { largeAmountLabel, sheetName } from '../services/exports.js';
import { seedCase } from './helpers/fixtures.js';
import { useTestDb } from './helpers/testDb.js';

const db = useTestDb();
const API = `${BASE_PATH}/api/cases`;

const get = (path: string) => createApp(db()).request(`${API}${path}`);
const fileName = (res: Response) => decodeURIComponent(res.headers.get('Content-Disposition')!.split("UTF-8''")[1]!);
const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error;

async function csvLines(res: Response) {
  const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await res.arrayBuffer());
  expect(text.startsWith('﻿')).toBe(true);
  return text.slice(1).trimEnd().split('\r\n');
}

async function workbook(res: Response) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await res.arrayBuffer());
  return wb;
}

const sheetValues = (ws: ExcelJS.Worksheet) =>
  ws.getSheetValues().slice(1).map((row) => (Array.isArray(row) ? row.slice(1) : []));

async function seed() {
  const seeded = await seedCase(db(), 'ZZQ架空商会', [
    { date: '2025-04-01', description: 'ZZQ架空出金', amountOut: 600000, balance: 10000, category: '生活費', isFlagged: true, memo: '架空メモ' },
    { date: '2019-04-30', description: 'ZZQ架空,"引用"', amountIn: 2000, category: '生活費' },
    { date: null, description: 'ZZQ日付なし', amountOut: 5, category: 'A/B:架空[1]' },
    { date: '2025-05-02', description: 'ZZQ移動', amountOut: 30000, balance: 3, category: '資金移動', accountNumber: '7654321' },
  ]);
  await db().transaction.update({ where: { id: seeded.ids[3]! }, data: { isTransfer: true } });
  return seeded;
}

describe('和暦の短い表記', () => {
  it('改元日をまたいで元号を切り替え、元年も数字で書く。日付が無ければ -', () => {
    expect(warekiShort('2019-04-30')).toBe('H31.4.30');
    expect(warekiShort('2019-05-01')).toBe('R1.5.1');
    expect(warekiShort('2024-01-26')).toBe('R6.1.26');
    expect(warekiShort(null)).toBe('-');
    expect(warekiMonthShort('1989-01-01')).toBe('S64.1');
  });
});

describe('シート名', () => {
  it('使えない文字は全角に、31文字で切って重なれば番号を付ける', () => {
    const used = new Set(['history']);
    expect(sheetName('A/B:架空[1]', used)).toBe('A／B：架空［1］');
    const long = 'あ'.repeat(40);
    expect(sheetName(long, used)).toBe('あ'.repeat(31));
    expect(sheetName(long, used)).toBe(`${'あ'.repeat(28)}(2)`);
    expect(sheetName('History', used)).toBe('History(2)');
  });

  it('多額取引のシート名は万で割り切れないとき円で書く', () => {
    expect(largeAmountLabel(500000)).toBe('50万円以上');
    expect(largeAmountLabel(15000)).toBe('15,000円以上');
    expect(largeAmountLabel(5000)).toBe('5,000円以上');
  });
});

describe('CSV', () => {
  it('全取引: BOM 付き・日付順（日付なしは最後）・残高は空があっても整数のまま', async () => {
    const { caseId } = await seed();
    const res = await get(`/${caseId}/export/csv/all`);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(fileName(res)).toMatch(/^R\d{6}_ZZQ架空商会_全取引_預貯金分析\.csv$/);
    expect(await csvLines(res)).toEqual([
      '日付,銀行名,支店名,種別,口座番号,摘要,払戻,お預り,残高,分類',
      'H31.4.30,架空銀行,本店,普通,1234567,"ZZQ架空,""引用""",0,2000,,生活費',
      'R7.4.1,架空銀行,本店,普通,1234567,ZZQ架空出金,600000,0,10000,生活費',
      'R7.5.2,架空銀行,本店,普通,7654321,ZZQ移動,30000,0,3,資金移動',
      '-,架空銀行,本店,普通,1234567,ZZQ日付なし,5,0,,A/B:架空[1]',
    ]);
  });

  it('付箋付きはメモの列を足す', async () => {
    const { caseId } = await seed();
    const flagged = await get(`/${caseId}/export/csv/flagged`);
    expect(fileName(flagged)).toMatch(/_ZZQ架空商会_付箋付き取引_預貯金分析\.csv$/);
    expect(await csvLines(flagged)).toEqual([
      '日付,銀行名,支店名,種別,口座番号,摘要,払戻,お預り,残高,分類,メモ',
      'R7.4.1,架空銀行,本店,普通,1234567,ZZQ架空出金,600000,0,10000,生活費,架空メモ',
    ]);
  });

  it('付箋付きは画面と同じキーワード・並びで出す', async () => {
    const { caseId, ids } = await seedCase(db(), 'ZZQ架空質問', [
      { date: '2025-05-01', description: 'ZZQ質問あ', amountOut: 100 },
      { date: '2025-05-02', description: 'ZZQ質問い', amountOut: 300 },
      { date: '2025-05-03', description: 'ZZQ別件', amountOut: 200 },
    ]);
    await db().transaction.updateMany({ where: { id: { in: ids } }, data: { isFlagged: true } });
    const desc = (lines: string[]) => lines.slice(1).map((l) => l.split(',')[5]);
    expect(desc(await csvLines(await get(`/${caseId}/export/csv/flagged?sort=amount_out_desc`)))).toEqual(['ZZQ質問い', 'ZZQ別件', 'ZZQ質問あ']);
    expect(desc(await csvLines(await get(`/${caseId}/export/csv/flagged?keyword=${encodeURIComponent('質問')}`)))).toEqual(['ZZQ質問あ', 'ZZQ質問い']);
  });

  it('資金移動は画面と同じく判定し直した組を、出金→入金の順に。取込時の印は見ない・絞り込みも画面と同じ', async () => {
    const { caseId, ids } = await seedCase(db(), 'ZZQ架空移動', [
      { date: '2025-05-02', description: 'ZZQ移動出', amountOut: 30000, accountNumber: '7654321' },
      { date: '2025-05-02', description: 'ZZQ移動入', amountIn: 30000, accountNumber: '1234567' },
      // 印だけ付いていて相手のいない出金（取込のあとで相手が消えた、など）
      { date: '2025-06-01', description: 'ZZQ印だけ', amountOut: 777, accountNumber: '7654321' },
    ]);
    await db().transaction.update({ where: { id: ids[2]! }, data: { isTransfer: true } });
    const transfers = await csvLines(await get(`/${caseId}/export/csv/transfers`));
    expect(transfers.slice(1)).toEqual([
      'R7.5.2,架空銀行,本店,普通,7654321,ZZQ移動出,30000,0,,未分類',
      'R7.5.2,架空銀行,本店,普通,1234567,ZZQ移動入,0,30000,,未分類',
    ]);
    const none = await get(`/${caseId}/export/csv/transfers?keyword=${encodeURIComponent('存在しない')}`);
    expect(await errorOf(none)).toBe('該当するデータがありません。');
  });

  it('取引が無い・該当なし・知らない種類は弾く', async () => {
    const empty = await seedCase(db(), 'ZZQ空');
    const none = await get(`/${empty.caseId}/export/csv/all`);
    expect(none.status).toBe(400);
    expect(await errorOf(none)).toBe('エクスポートするデータがありません。');

    const { caseId } = await seedCase(db(), 'ZZQ付箋なし', [{ description: 'ZZQ' }]);
    expect(await errorOf(await get(`/${caseId}/export/csv/flagged`))).toBe('該当するデータがありません。');
    expect((await get(`/${caseId}/export/csv/xyz`)).status).toBe(404);
  });

  it('絞り込み: 画面と同じ条件で絞り、条件をファイル名に残す', async () => {
    const { caseId } = await seed();
    const q = new URLSearchParams({ category: '生活費', amount_type: 'out', amount_min: '1,000', keyword: 'ZZQ' });
    const res = await get(`/${caseId}/export/csv-filtered?${q}`);
    // ファイル名の中の `_` は空白に寄せられる（exportFileName）
    expect(fileName(res)).toMatch(/_ZZQ架空商会_絞込 分類 生活費-検索 ZZQ-出金-1000円以上_預貯金分析\.csv$/);
    const lines = await csvLines(res);
    expect(lines[0]!.endsWith(',分類,メモ')).toBe(true);
    expect(lines.slice(1)).toEqual(['R7.4.1,架空銀行,本店,普通,1234567,ZZQ架空出金,600000,0,10000,生活費,架空メモ']);

    const all = await get(`/${caseId}/export/csv-filtered`);
    expect(fileName(all)).toMatch(/_ZZQ架空商会_全取引_預貯金分析\.csv$/);
    expect(await csvLines(all)).toHaveLength(5);

    const nothing = await get(`/${caseId}/export/csv-filtered?keyword=${encodeURIComponent('存在しない')}`);
    expect(nothing.status).toBe(400);
  });
});

describe('Excel', () => {
  it('分類別: 標準の分類順（知らない分類は後ろに文字コード順）に1シートずつ、続けて多額取引と付箋付き。残高は入れない', async () => {
    const { caseId } = await seed();
    const res = await get(`/${caseId}/export/xlsx/categories`);
    expect(res.status).toBe(200);
    expect(fileName(res)).toMatch(/_ZZQ架空商会_分類別取引_預貯金分析\.xlsx$/);
    const wb = await workbook(res);
    expect(wb.worksheets.map((ws) => ws.name)).toEqual(['生活費', 'A／B：架空［1］', '資金移動', '50万円以上', '付箋付き']);

    const living = wb.getWorksheet('生活費')!;
    expect(sheetValues(living)).toEqual([
      ['日付', '銀行名', '支店名', '種別', '口座番号', '摘要', '払戻', 'お預り', '分類'],
      ['H31.4.30', '架空銀行', '本店', '普通', '1234567', 'ZZQ架空,"引用"', 0, 2000, '生活費'],
      ['R7.4.1', '架空銀行', '本店', '普通', '1234567', 'ZZQ架空出金', 600000, 0, '生活費'],
    ]);
    expect(living.getCell('G2').numFmt).toBe('#,##0');
    expect(living.pageSetup).toMatchObject({ paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 });
    expect(wb.getWorksheet('50万円以上')!.properties.tabColor).toEqual({ argb: 'FFDC3545' });
    expect(sheetValues(wb.getWorksheet('付箋付き')!)[0]).toContain('メモ');
  });

  it('月次入出金: 相続開始月から後は入れず、条件を見出しに書く', async () => {
    const { caseId } = await seed();
    await db().case.update({ where: { id: caseId }, data: { referenceDate: new Date('2025-05-10T00:00:00Z') } });
    const res = await get(`/${caseId}/export/xlsx/monthly`);
    expect(fileName(res)).toMatch(/_ZZQ架空商会_月次入出金_預貯金分析\.xlsx$/);
    const ws = (await workbook(res)).getWorksheet('月次入出金')!;
    expect(ws.getCell('B2').value).toBe('ZZQ架空商会');
    expect(ws.getCell('B3').value).toBe('相続開始月（R7.5）以降を除外');
    expect(sheetValues(ws).slice(4)).toEqual([
      ['月', '出金', '入金'],
      ['H31.4', 0, 2000],
      ['R7.4', 600000, 0],
    ]);
    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 5, showGridLines: false });
  });

  it('月次入出金は取引が無くても見出しだけで出す。分類別は弾く', async () => {
    const { caseId } = await seedCase(db(), 'ZZQ空');
    const ws = (await workbook(await get(`/${caseId}/export/xlsx/monthly`))).getWorksheet('月次入出金')!;
    expect(ws.getCell('B3').value).toBe('全期間');
    expect(ws.rowCount).toBe(5);
    expect((await get(`/${caseId}/export/xlsx/categories`)).status).toBe(400);
  });
});
