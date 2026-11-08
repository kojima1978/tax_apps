import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { calculateAsset } from '@/utils/calculation';
import { CASE_JSON_VERSION, resolveCategory } from './types';
import {
  CaseJsonError,
  caseJsonFileName,
  normalizeAssets,
  normalizeCaseJson,
  parseUsefulLife,
  parseYen,
} from './intake';

const baseCase = (assets: unknown[], extra: Record<string, unknown> = {}) => ({
  version: '1.1',
  caseName: 'ダミー商事',
  taxDate: '2026-03-31',
  assets,
  ...extra,
});

const row = (extra: Record<string, unknown> = {}) => ({
  no: '1',
  name: 'パソコン',
  category: '器具備品',
  method: '定率法',
  acquisitionDate: 'R3.4.1',
  usefulLife: 4,
  acquisitionCost: '300,000',
  bookValue: '50,000',
  ...extra,
});

describe('parseYen', () => {
  it.each([
    [1234567, 1234567],
    ['1,234,567', 1234567],
    ['￥1,234円', 1234],
    ['１，０００', 1000],
    ['△1,000', -1000],
    ['▲1,000', -1000],
    ['(1,000)', -1000],
    ['0', 0],
  ])('%s → %d', (input, expected) => {
    expect(parseYen(input, '取得価額')).toEqual({ value: expected });
  });

  it('円未満は切り捨てて警告', () => {
    const r = parseYen('1000.7', '取得価額');
    expect(r.value).toBe(1000);
    expect(r.warning).toContain('切り捨て');
  });

  it('読めない・無いときは 0 と警告', () => {
    expect(parseYen('不明', '期末簿価')).toEqual({ value: 0, warning: '期末簿価「不明」を金額として読めません' });
    expect(parseYen(undefined, '期末簿価').warning).toBe('期末簿価がありません');
  });
});

describe('parseUsefulLife', () => {
  it('「15年」「１５」も読む', () => {
    expect(parseUsefulLife('15年')).toEqual({ value: 15 });
    expect(parseUsefulLife('１５')).toEqual({ value: 15 });
    expect(parseUsefulLife(6)).toEqual({ value: 6 });
  });
  it('読めない・無い', () => {
    expect(parseUsefulLife('-').value).toBe(0);
    expect(parseUsefulLife('').warning).toBe('耐用年数がありません');
  });
});

describe('resolveCategory', () => {
  it('正式名はそのまま', () => {
    expect(resolveCategory('建物（定額法）')).toEqual({ category: '建物（定額法）', methodAssumed: false });
    expect(resolveCategory('無形固定資産').category).toBe('無形固定資産');
  });
  it('勘定科目の別名と償却方法の欄を合わせる', () => {
    expect(resolveCategory('器具備品', '定率法').category).toBe('工具器具備品（200%定率法）');
    expect(resolveCategory('車両', '２５０％定率法').category).toBe('車両運搬具（250%定率法）');
    expect(resolveCategory('器具備品（旧定率法）').category).toBe('工具器具備品（旧定率法）');
  });
  it('償却方法が無ければ区分の既定（選択肢が複数なら assumed）', () => {
    expect(resolveCategory('建物付属設備')).toEqual({ category: '建物附属設備（200%定率法）', methodAssumed: true });
    expect(resolveCategory('一括償却資産')).toEqual({ category: '一括償却資産（3年均等）', methodAssumed: false });
    expect(resolveCategory('創立費').category).toBe('繰延資産（均等償却）');
  });
  it('その区分で選べない償却方法は既定へ寄せて知らせる', () => {
    const r = resolveCategory('建物', '定率法');
    expect(r.category).toBe('建物（定額法）');
    expect(r.methodRejected).toBe('定率法');
  });
  it('分からない区分は undefined', () => {
    expect(resolveCategory('土地').category).toBeUndefined();
  });
});

describe('normalizeCaseJson', () => {
  it('案件として成り立たないものは弾く', () => {
    expect(() => normalizeCaseJson([])).toThrow(CaseJsonError);
    expect(() => normalizeCaseJson(baseCase([], { version: '1.2' }))).toThrow('新しい版（1.2）');
    expect(() => normalizeCaseJson(baseCase([], { version: '2.0' }))).toThrow('新しい版');
    expect(() => normalizeCaseJson(baseCase([], { caseName: '' }))).toThrow('案件名');
    expect(() => normalizeCaseJson(baseCase([], { taxDate: '不明' }))).toThrow('課税時期');
    expect(() => normalizeCaseJson(baseCase([], { assets: undefined }))).toThrow('assets');
  });

  it('台帳の値を寄せる（和暦・金額・NO は文字列・版は最新）', () => {
    const r = normalizeCaseJson(baseCase([row({ no: '0012-1' })], { taxDate: '令和8年3月31日' }));
    expect(r.caseData.version).toBe(CASE_JSON_VERSION);
    expect(r.caseData.taxDate).toBe('2026-03-31');
    const a = r.caseData.assets[0]!;
    expect(a).toMatchObject({
      no: '0012-1',
      category: '工具器具備品（200%定率法）',
      categoryLabel: '工具器具備品（200%定率法）',
      acquisitionDate: '2021-04-01',
      usefulLife: 4,
      acquisitionCost: 300000,
      bookValue: 50000,
      hasFixedAssetTaxRecord: false,
      isRental: false,
    });
    expect(a.id).toBeTruthy();
    expect(r.warnings).toEqual([]);
    expect(r.totals).toEqual({
      count: 1,
      acquisitionCost: 300000,
      bookValue: 50000,
      byCategory: [{ label: '工具器具備品（200%定率法）', count: 1, acquisitionCost: 300000, bookValue: 50000 }],
    });
  });

  it('おかしな行も落とさず、警告を付ける', () => {
    const r = normalizeCaseJson(
      baseCase([
        row({ category: '謎の資産', acquisitionDate: '2023/2/30', acquisitionCost: '不明' }),
        row({ category: '車両', isRental: true, hasFixedAssetTaxRecord: true }),
      ])
    );
    expect(r.caseData.assets).toHaveLength(2);
    const [w0, w1] = r.warnings;
    expect(w0!.index).toBe(0);
    expect(w0!.messages.join('\n')).toMatch(/区分「謎の資産」を判定できない/);
    expect(w0!.messages.join('\n')).toMatch(/実在しない日付/);
    expect(w0!.messages.join('\n')).toMatch(/取得価額「不明」/);
    expect(r.caseData.assets[0]!.acquisitionDate).toBe('2023/2/30'); // 人が直せるよう元の文字を残す
    expect(r.caseData.assets[1]).toMatchObject({ isRental: false, hasFixedAssetTaxRecord: false });
    expect(w1!.messages.join('\n')).toMatch(/賃貸控除の対象外/);
    expect(w1!.messages.join('\n')).toMatch(/固定資産税評価明細の対象外/);
  });

  it('値を見れば分かる注意（簿価＞取得価額など）は報告だけで review には入れない', () => {
    const r = normalizeCaseJson(baseCase([row({ bookValue: 400000, source: { file: '台帳.pdf', page: 2 } })]));
    expect(r.warnings[0]!.messages).toContain('期末簿価が取得価額を超えています');
    expect(r.caseData.assets[0]!.review).toEqual({});
  });

  it('簿価評価の区分は耐用年数が無くても注意しない', () => {
    const r = normalizeCaseJson(baseCase([row({ category: '一括償却資産', method: undefined, usefulLife: undefined })]));
    expect(r.warnings).toEqual([]);
  });

  it('取込の行は source と review を持ち、読み直しても注意が増えない', () => {
    const first = normalizeCaseJson(
      baseCase([
        row({ category: '建物附属設備', method: '', source: { file: '台帳.pdf', page: 3, note: '3頁 12行目', uncertain: true, extra: 1 } }),
        row({ no: '2' }),
      ])
    );
    const a = first.caseData.assets[0]!;
    expect(a.source).toEqual({ file: '台帳.pdf', page: 3, note: '3頁 12行目', uncertain: true });
    expect(a.review?.warnings).toEqual(['償却方法が分からないため建物附属設備（200%定率法）にしました（評価額には影響しません）']);
    // source の無い行（人が入れた行）は確認状態を持たない
    expect(first.caseData.assets[1]!.review).toBeUndefined();

    // 画面で確認済みにして保存 → 読み直し
    const saved = JSON.parse(JSON.stringify(first.caseData));
    saved.assets[0].review.confirmed = true;
    const again = normalizeCaseJson(saved);
    expect(again.caseData.assets[0]!.review).toEqual({ warnings: a.review!.warnings, confirmed: true });
    expect(again.caseData.assets[0]!.id).toBe(a.id);
    expect(again.caseData.assets[0]!.category).toBe('建物附属設備（200%定率法）');
  });

  it('file の無い source は捨てる', () => {
    const r = normalizeCaseJson(baseCase([row({ source: { page: 1 } })]));
    expect(r.caseData.assets[0]!.source).toBeUndefined();
  });

  it('ID の重複は振り直す', () => {
    const { assets } = normalizeAssets([row({ id: 'x' }), row({ id: 'x' }), row({ id: 'y' })]);
    expect(assets[0]!.id).toBe('x');
    expect(assets[1]!.id).not.toBe('x');
    expect(assets[2]!.id).toBe('y');
  });
});

describe('旧版（1.0）の案件JSON', () => {
  const legacy = JSON.parse(
    readFileSync(new URL('../../test-data/asset-valuation-test-case.json', import.meta.url), 'utf8')
  ) as { taxDate: string; assets: Array<Record<string, unknown>> };

  it('読み込めて、保存されていた評価額と同じになる', () => {
    const r = normalizeCaseJson(legacy);
    expect(r.caseData.assets).toHaveLength(legacy.assets.length);
    r.caseData.assets.forEach((a, i) => {
      const old = legacy.assets[i]!;
      expect(a.no).toBe(String(old.no));
      expect(a.id).toBe(old.id);
      expect(a.source).toBeUndefined();
      const calc = calculateAsset(a, r.caseData.taxDate);
      expect({ amount: calc.evaluationAmount, basis: calc.evaluationBasis }).toEqual({
        amount: old.evaluationAmount,
        basis: old.evaluationBasis,
      });
    });
  });
});

describe('caseJsonFileName', () => {
  it('R0xMMDD_案件名_減価償却資産評価.json', () => {
    expect(caseJsonFileName('ダミー商事', new Date(2026, 10, 8))).toBe('R081108_ダミー商事_減価償却資産評価.json');
  });
});
