// 案件の JSON バックアップ（書き出し・読み込み）。値はすべて架空。

import { describe, expect, it } from 'vitest';
import { BASE_PATH, createApp } from '../app.js';
import { seedCase } from './helpers/fixtures.js';
import { useTestDb } from './helpers/testDb.js';

const db = useTestDb();
const API = `${BASE_PATH}/api/cases`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

async function exportJson(caseId: bigint) {
  const res = await createApp(db()).request(`${API}/${caseId}/export/json`);
  return { res, json: (await res.json()) as Json };
}

async function importJson(data: unknown, options: { restoreSettings?: boolean; name?: string; raw?: string } = {}) {
  const form = new FormData();
  form.append('file', new File([options.raw ?? JSON.stringify(data)], options.name ?? '架空.json', { type: 'application/json' }));
  if (options.restoreSettings) form.append('restoreSettings', 'true');
  const res = await createApp(db()).request(`${BASE_PATH}/api/backups/import`, { method: 'POST', body: form });
  return { status: res.status, json: (await res.json()) as Json };
}

const casesNamed = (name: string) => db().case.findMany({ where: { name } });

async function seedFull() {
  const seeded = await seedCase(db(), 'ZZQ架空商会', [
    { date: '2025-04-02', description: 'ZZQ架空入金', amountIn: 2000, balance: 12000, category: '生活費', memo: '架空メモ' },
    { date: '2025-04-01', description: 'ZZQ架空出金', amountOut: 1000, balance: 10000, isFlagged: true },
    { date: null, description: 'ZZQ日付なし', amountOut: 5 },
  ]);
  const { caseId } = seeded;
  await db().case.update({
    where: { id: caseId },
    data: { referenceDate: new Date('2025-03-31T00:00:00Z'), customPatterns: { 生活費: ['ZZQ架空'] } },
  });
  await db().account.updateMany({
    where: { caseId },
    data: { holder: '架空 太郎', passbookBalance: 12000, hasAccruedInterest: true, passbookYears: { '2024': true }, printOrder: 2 },
  });
  // 取引の無い口座（通帳有無一覧にだけ残っているもの）
  await db().account.create({
    data: { caseId, accountNumber: '9999999', bankName: '架空信金', branchName: '駅前', accountType: '定期', certificateBalance: 300000, inventoryRemarks: '証書のみ', printOrder: 1 },
  });
  return seeded;
}

describe('書き出し', () => {
  it('Django 版と同じ形（version 1.1）に案件固有のパターンを足して書き出す', async () => {
    const { caseId } = await seedFull();
    const { res, json } = await exportJson(caseId);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(decodeURIComponent(res.headers.get('Content-Disposition')!)).toMatch(/_ZZQ架空商会_バックアップ_預貯金分析\.json$/);

    expect(json.version).toBe('1.1');
    expect(json.case).toMatchObject({ name: 'ZZQ架空商会', reference_date: '2025-03-31', custom_patterns: { 生活費: ['ZZQ架空'] } });
    expect(json.transactions.map((t: Json) => t.description)).toEqual(['ZZQ架空出金', 'ZZQ架空入金', 'ZZQ日付なし']);
    expect(json.transactions[1]).toMatchObject({
      date: '2025-04-02', bank_name: '架空銀行', account_number: '1234567', amount_in: 2000, category: '生活費', memo: '架空メモ', holder: '架空 太郎',
    });
    expect(json.accounts.map((a: Json) => a.account_number)).toEqual(['9999999', '1234567']);
    expect(json.statistics).toEqual({ total_transactions: 3, total_in: 2000, total_out: 1005 });
  });

  it('取引が無ければ書き出さない', async () => {
    const { caseId } = await seedCase(db());
    const { res, json } = await exportJson(caseId);
    expect(res.status).toBe(400);
    expect(json.error).toBe('エクスポートするデータがありません。');
  });
});

describe('読み込み', () => {
  it('書き出したものを読み戻すと、同じ名前があれば「_復元1」で作り、取引の無い口座と通帳有無も戻る', async () => {
    const { caseId } = await seedFull();
    const exported = (await exportJson(caseId)).json;

    const res = await importJson(exported);
    expect(res.json).toMatchObject({ success: true, name: 'ZZQ架空商会_復元1', count: 3, message: '「ZZQ架空商会_復元1」として3件の取引を復元しました。' });

    const restored = (await casesNamed('ZZQ架空商会_復元1'))[0]!;
    expect(restored.customPatterns).toEqual({ 生活費: ['ZZQ架空'] });
    const again = (await exportJson(restored.id)).json;
    expect(again.transactions).toEqual(exported.transactions);
    expect(again.accounts).toEqual(exported.accounts);
    expect(again.case.reference_date).toBe('2025-03-31');

    const second = await importJson(exported);
    expect(second.json.name).toBe('ZZQ架空商会_復元2');
  });

  it('Django 版の 1.0（口座一覧・設定なし）も読む。名前が無ければ「インポート案件」', async () => {
    const res = await importJson({
      version: '1.0',
      case: {},
      transactions: [{ date: '2025-05-01T00:00:00', description: 'ZZQ架空', amount_out: '1,500', account_number: '' }],
    });
    expect(res.json).toMatchObject({ name: 'インポート案件', count: 1 });
    const rows = await db().transaction.findMany({ include: { account: true } });
    expect(rows.map((r) => [r.account?.accountNumber, r.amountOut, r.category, r.descriptionSearch])).toEqual([
      ['unknown', 1500, '未分類', 'zzq架空'],
    ]);
  });

  it('読めない行は何件目かを示して弾き、案件も作らない（Django 版は空の案件が残った）', async () => {
    const res = await importJson({
      case: { name: 'ZZQ架空壊れ' },
      transactions: [{ date: '2025-05-01', amount_out: 1 }, { date: '2025-02-30', amount_out: 1 }],
    });
    expect(res.status).toBe(400);
    expect(res.json.error).toBe('取引2件目: 日付の形式が正しくありません（YYYY-MM-DD）');
    const badAmount = await importJson({ case: { name: 'ZZQ架空壊れ' }, transactions: [{ amount_in: 'x' }] });
    expect(badAmount.json.error).toBe('取引1件目: 入金額が不正な値です');
    expect(await casesNamed('ZZQ架空壊れ')).toHaveLength(0);
  });

  it('取引の無いファイルは弾く（Django 版はエラー応答の JSON まで空の「インポート案件」にした）', async () => {
    const before = await db().case.count();
    expect((await importJson({ success: false, error: 'エクスポートするデータがありません。' })).json.error).toBe(
      '取引データが含まれていません。書き出したバックアップファイルを選んでください',
    );
    expect((await importJson({ case: { name: 'ZZQ架空空' }, transactions: [] })).json.error).toBe('取引データが0件です');
    expect(await db().case.count()).toBe(before);
  });

  it('未対応のバージョン・JSON でないファイル・拡張子違いは弾く', async () => {
    expect((await importJson({ version: '2.0' })).json.error).toBe('未対応のバージョン: 2.0');
    expect((await importJson(null, { raw: '{壊れ' })).json.error).toBe('JSONファイルを読めませんでした');
    expect((await importJson({}, { name: '架空.csv' })).json.error).toBe('JSONファイル（.json）を選択してください');
    const none = await createApp(db()).request(`${BASE_PATH}/api/backups/import`, { method: 'POST', body: new FormData() });
    expect(none.status).toBe(400);
  });

  it('設定の復元は指定したときだけ。分類パターンの形が違えば案件ごと戻す', async () => {
    const settings = { LARGE_AMOUNT_THRESHOLD: 700000, CLASSIFICATION_PATTERNS: { 生活費: ['ZZQ架空'] } };
    await db().appSetting.create({ data: { key: 'GIFT_THRESHOLD', value: 1 } });
    const data = { case: { name: 'ZZQ架空設定' }, transactions: [{ date: '2025-05-01', amount_in: 1 }], settings };

    await importJson(data);
    expect(await db().appSetting.count({ where: { key: 'LARGE_AMOUNT_THRESHOLD' } })).toBe(0);

    await importJson(data, { restoreSettings: true });
    const stored = Object.fromEntries((await db().appSetting.findMany()).map((r) => [r.key, r.value]));
    expect(stored).toEqual(settings);

    const bad = await importJson({ ...data, case: { name: 'ZZQ架空設定違い' }, settings: { CLASSIFICATION_PATTERNS: { 生活費: 'x' } } }, { restoreSettings: true });
    expect(bad.json.error).toBe('設定データの分類パターンが正しくありません');
    expect(await casesNamed('ZZQ架空設定違い')).toHaveLength(0);
  });
});
