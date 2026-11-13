// お客様への確認事項（書面・Excel・下書き・文面の設定）。値はすべて架空。

import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { BASE_PATH, createApp } from '../app.js';
import { DEFAULT_QUESTION_TEMPLATES, QUESTION_SHEET_COLUMNS, QUESTION_SHEET_TITLE } from '../lib/questions.js';
import type { QuestionSheet } from '../services/questions.js';
import { seedCase } from './helpers/fixtures.js';
import { useTestDb } from './helpers/testDb.js';

const db = useTestDb();
const API = `${BASE_PATH}/api`;

const request = (path: string, method = 'GET', body?: unknown) =>
  createApp(db()).request(`${API}${path}`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
const json = async <T>(res: Response) => (await res.json()) as T;

async function seed() {
  const seeded = await seedCase(db(), 'ZZQ架空 花子', [
    { date: '2025-03-10', description: 'ZZQ出金A', amountOut: 800000, category: '生活費', isFlagged: true, memo: '架空の質問A', accountNumber: '7654321' },
    { date: '2025-03-01', description: 'ZZQ入金B', amountIn: 300000, isFlagged: true, memo: '架空の質問B\n2行目' },
    { date: '2025-04-05', description: 'ZZQ出金C', amountOut: 50000, isFlagged: true },
    { date: '2025-02-01', description: 'ZZQ入金D', amountIn: 70000, isFlagged: true, memo: '' },
    { date: '2025-02-02', description: 'ZZQ付箋なし', amountOut: 9000, memo: '事務所内のメモ' },
  ]);
  await db().case.update({ where: { id: seeded.caseId }, data: { referenceDate: new Date('2025-04-01T00:00:00Z') } });
  return seeded;
}

const sheetOf = async (caseId: bigint, query = '') =>
  (await json<{ sheet: QuestionSheet }>(await request(`/cases/${caseId}/questions${query}`))).sheet;

const memosOf = async (ids: bigint[]) =>
  (await db().transaction.findMany({ where: { id: { in: ids } }, orderBy: { id: 'asc' } })).map((t) => t.memo);

describe('書面', () => {
  it('メモのある質問候補だけを日付順に出し、口座番号は下4桁。空のメモは件数だけ返す', async () => {
    const { caseId } = await seed();
    const sheet = await sheetOf(caseId);
    expect(sheet.case.name).toBe('ZZQ架空 花子');
    expect(sheet.createdOn).toMatch(/^令和\d+年\d+月\d+日$/);
    expect(sheet.rows.map((r) => [r.no, r.date, r.description, r.amountOut, r.amountIn, r.question])).toEqual([
      [1, '令和7年3月1日', 'ZZQ入金B', 0, 300000, '架空の質問B\n2行目'],
      [2, '令和7年3月10日', 'ZZQ出金A', 800000, 0, '架空の質問A'],
    ]);
    expect(sheet.rows[1]!.accountLines).toEqual(['架空銀行 本店', '普通 末尾4321']);
    expect(sheet.skippedCount).toBe(2);
  });

  it('質問候補タブの絞り込みと並び替えを引き継ぐ', async () => {
    const { caseId } = await seed();
    const sorted = await sheetOf(caseId, '?sort=date_desc');
    expect(sorted.rows.map((r) => r.description)).toEqual(['ZZQ出金A', 'ZZQ入金B']);
    const filtered = await sheetOf(caseId, `?keyword=${encodeURIComponent('出金')}`);
    expect(filtered.rows.map((r) => [r.no, r.description])).toEqual([[1, 'ZZQ出金A']]);
    expect(filtered.skippedCount).toBe(1);
  });
});

describe('Excel', () => {
  it('書面と同じ行・同じ列で、回答欄は空。見出しは各ページに刷る', async () => {
    const { caseId } = await seed();
    const res = await request(`/cases/${caseId}/export/xlsx/questions?firm=${encodeURIComponent('ZZQ架空税理士法人')}`);
    expect(res.status).toBe(200);
    expect(decodeURIComponent(res.headers.get('Content-Disposition')!)).toContain(`ZZQ架空 花子_${QUESTION_SHEET_TITLE}_`);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await res.arrayBuffer());
    const ws = wb.worksheets[0]!;
    expect(ws.getCell('A1').value).toBe(QUESTION_SHEET_TITLE);
    expect(ws.getCell('A2').value).toBe('ZZQ架空 花子 様');
    expect(ws.getCell('G3').value).toBe('ZZQ架空税理士法人');
    expect((ws.getRow(6).values as unknown[]).slice(1)).toEqual([...QUESTION_SHEET_COLUMNS]);
    expect(ws.pageSetup.printTitlesRow).toBe('6:6');
    expect(ws.pageSetup.orientation).toBe('landscape');
    const first = ws.getRow(7);
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((i) => first.getCell(i).value)).toEqual([
      1, '令和7年3月1日', '架空銀行 本店\n普通 末尾4567', 'ZZQ入金B', null, 300000, '架空の質問B\n2行目', null,
    ]);
    expect(first.getCell(6).numFmt).toBe('#,##0');
    expect(first.height).toBeGreaterThanOrEqual(54);
    expect(ws.getRow(8).getCell(5).value).toBe(800000);
    expect(ws.getRow(9).getCell(1).value).toBeNull();
  });

  it('質問が1つも無ければ 400', async () => {
    const { caseId } = await seedCase(db(), 'ZZQ質問なし', [{ description: 'ZZQ', amountOut: 1, isFlagged: true }]);
    const res = await request(`/cases/${caseId}/export/xlsx/questions`);
    expect(res.status).toBe(400);
    expect((await json<{ error: string }>(res)).error).toContain('書面に出す質問がありません');
  });
});

describe('下書き', () => {
  it('質問候補タブはメモが空の行にだけ下書きを添え、保存はしない', async () => {
    const { caseId, ids } = await seed();
    const body = await json<{ flaggedTxs: { description: string; draft: string }[] }>(await request(`/cases/${caseId}/dashboard?tab=flagged`));
    expect(Object.fromEntries(body.flaggedTxs.map((t) => [t.description, t.draft]))).toEqual({
      ZZQ入金D: DEFAULT_QUESTION_TEMPLATES.deposit,
      ZZQ入金B: '',
      ZZQ出金A: '',
      ZZQ出金C: DEFAULT_QUESTION_TEMPLATES.afterReferenceOut,
    });
    expect(await memosOf(ids)).toEqual(['架空の質問A', '架空の質問B\n2行目', null, '', '事務所内のメモ']);
  });

  it('「下書きを入れる」は、付箋付きでメモが空の取引にだけ入る', async () => {
    const { caseId, ids } = await seed();
    const res = await request(`/cases/${caseId}/memo-drafts`, 'POST', { ids: ids.map(String) });
    expect((await json<{ savedCount: number }>(res)).savedCount).toBe(2);
    expect(await memosOf(ids)).toEqual([
      '架空の質問A',
      '架空の質問B\n2行目',
      DEFAULT_QUESTION_TEMPLATES.afterReferenceOut,
      DEFAULT_QUESTION_TEMPLATES.deposit,
      '事務所内のメモ',
    ]);
    // 2回目は入れるものが無い
    const again = await request(`/cases/${caseId}/memo-drafts`, 'POST', { ids: ids.map(String) });
    expect((await json<{ savedCount: number }>(again)).savedCount).toBe(0);
  });

  it('ほかの案件の取引・対象なしは弾く', async () => {
    const { ids } = await seed();
    const other = await seedCase(db(), 'ZZQ別の案件');
    const res = await request(`/cases/${other.caseId}/memo-drafts`, 'POST', { ids: ids.map(String) });
    expect((await json<{ savedCount: number }>(res)).savedCount).toBe(0);
    expect((await request(`/cases/${other.caseId}/memo-drafts`, 'POST', { ids: [] })).status).toBe(400);
    expect((await memosOf(ids))[2]).toBeNull();
  });
});

describe('文面の設定', () => {
  it('変えた文だけ保存し、下書きに効く。空で送れば既定へ戻り、全部が既定なら行を残さない', async () => {
    const { caseId } = await seed();
    const changed = '{金額}のご入金の内容をお教えください。';
    const saved = await request('/settings/question-templates', 'PUT', { ...DEFAULT_QUESTION_TEMPLATES, deposit: changed });
    expect(saved.status).toBe(200);
    expect((await db().appSetting.findUniqueOrThrow({ where: { key: 'QUESTION_TEMPLATES' } })).value).toEqual({ deposit: changed });
    const settings = await json<{ questionTemplates: Record<string, string> }>(await request('/settings'));
    expect(settings.questionTemplates.deposit).toBe(changed);
    expect(settings.questionTemplates.withdrawal).toBe(DEFAULT_QUESTION_TEMPLATES.withdrawal);

    const body = await json<{ flaggedTxs: { description: string; draft: string }[] }>(await request(`/cases/${caseId}/dashboard?tab=flagged`));
    expect(body.flaggedTxs.find((t) => t.description === 'ZZQ入金D')!.draft).toBe('70,000円のご入金の内容をお教えください。');

    await request('/settings/question-templates', 'PUT', { deposit: '' });
    expect(await db().appSetting.findUnique({ where: { key: 'QUESTION_TEMPLATES' } })).toBeNull();
  });

  it('長すぎる文は 400 で欄ごとに知らせる', async () => {
    const res = await request('/settings/question-templates', 'PUT', { withdrawal: 'あ'.repeat(201) });
    expect(res.status).toBe(400);
    expect((await json<{ errors: Record<string, string> }>(res)).errors.withdrawal).toContain('200文字以内');
  });
});
