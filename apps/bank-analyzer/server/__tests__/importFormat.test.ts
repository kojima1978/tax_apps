// 取込の分類・メモ・要確認の列と、取込できる形式の案内（依頼24）。値はすべて架空。

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_FUZZY_CONFIG, DEFAULT_GIFT_THRESHOLD, DEFAULT_PATTERNS, STANDARD_CATEGORIES } from '../lib/categories.js';
import { buildExistingIndex } from '../lib/dedup.js';
import { IMPORT_COLUMNS, parseFlag, REQUIRED_COLUMNS } from '../lib/import/columns.js';
import { categoryResolver, decideCategories } from '../lib/import/csvCategory.js';
import { FormatError, missingColumnsOf } from '../lib/import/errors.js';
import { aiInstruction, formatGuideMarkdown, templateCsv } from '../lib/import/format.js';
import { loadStatement } from '../lib/import/loadStatement.js';
import { buildPreview } from '../lib/wizard.js';

const bytes = (s: string) => new TextEncoder().encode(s);
const load = (s: string) => loadStatement(bytes(s), { allowMultiple: true });
const classifier = { globalPatterns: DEFAULT_PATTERNS, casePatterns: null, giftThreshold: DEFAULT_GIFT_THRESHOLD, fuzzy: DEFAULT_FUZZY_CONFIG };

describe('足した列は取込を止めない', () => {
  const base = '日付,摘要,払戻額,お預り額,差引残高';

  it('列が無ければ行に何も足さない（既存の CSV の読み方は変わらない）', () => {
    const st = load(`${base}\nR6.4.1,ZZQ架空,1000,,9000\n`);
    expect(st.rows[0]).not.toHaveProperty('category');
    expect(st.rows[0]).not.toHaveProperty('memo');
    expect(st.rows[0]).not.toHaveProperty('flagged');
    expect(st.rows[0]).not.toHaveProperty('flagUnreadable');
  });

  it('列があって全部空欄でも読める', () => {
    const st = load(`${base},分類,メモ,要確認\nR6.4.1,ZZQ架空,1000,,9000,,,\nR6.4.2,ZZQ架空,1000,,8000\n`);
    expect(st.rows).toHaveLength(2);
    expect(st.rows.every((r) => r.category === undefined && r.memo === undefined && r.flagged === undefined)).toBe(true);
  });

  it('一部の行だけ・読めない値・並びの違いでも読み、値は行ごとに持つ', () => {
    const st = load(
      '要確認,メモ,カテゴリー,差引残高,お預り額,払戻額,摘要,日付\n' +
        '○,読めない字あり,生活費,9000,,1000,ZZQ架空,R6.4.1\n' +
        'たぶん,,ZZQ知らない分類,8000,,1000,ZZQ架空,R6.4.2\n' +
        ',,,7000,,1000,ZZQ架空,R6.4.3\n',
    );
    expect(st.rows.map((r) => [r.category, r.memo, r.flagged, r.flagUnreadable])).toEqual([
      ['生活費', '読めない字あり', true, undefined],
      ['ZZQ知らない分類', undefined, undefined, 'たぶん'],
      [undefined, undefined, undefined, undefined],
    ]);
    expect(st.rows.map((r) => r.amountOut)).toEqual([1000, 1000, 1000]);
  });

  it('エラーになるのは必須の列と日付・金額だけ', () => {
    expect(() => load('日付,摘要,払戻額,分類,メモ,要確認\nR6.4.1,ZZQ,1,生活費,,○\n')).toThrow(FormatError);
    expect(() => load(`${base},分類\n2024/13/45,ZZQ,1,,1,生活費\n`)).toThrow('日付の変換に失敗しました');
    expect(() => load(`${base},分類\nR6.4.1,ZZQ,abc,,1,生活費\n`)).toThrow();
  });
});

describe('parseFlag', () => {
  it.each([
    ['○', true],
    ['〇', true],
    ['１', true],
    ['要確認', true],
    ['', false],
    ['×', false],
    ['なし', false],
    ['たぶん', null],
  ])('%s → %s', (raw, expected) => expect(parseFlag(raw)).toBe(expected));
});

describe('分類の列の当て方', () => {
  const resolve = categoryResolver([...STANDARD_CATEGORIES, 'ZZQ追加分類']);

  it('設定にある名前・古い名前・全角半角の違いは当てる。空欄と未分類は自動、知らない名前は残す', () => {
    expect(resolve('年金')).toEqual({ kind: 'known', category: '年金' });
    expect(resolve('贈与')).toEqual({ kind: 'known', category: STANDARD_CATEGORIES.find((c) => c.startsWith('贈与'))! });
    expect(resolve(' ZZQ追加分類 ')).toEqual({ kind: 'known', category: 'ZZQ追加分類' });
    expect(resolve('')).toEqual({ kind: 'none' });
    expect(resolve('未分類')).toEqual({ kind: 'none' });
    expect(resolve('ZZQ謎')).toEqual({ kind: 'unknown', name: 'ZZQ謎' });
  });

  it('CSV の分類はそのまま、無い行と知らない行は自動分類（贈与の金額判定は分類の無い行だけ）', () => {
    const rows = [
      { description: '振込 ZZQ', amountOut: 2_000_000, category: '生活費' },
      { description: '振込 ZZQ', amountOut: 2_000_000 },
      { description: '年金 ZZQ', amountOut: 0, category: 'ZZQ謎' },
    ];
    const decided = decideCategories(rows, STANDARD_CATEGORIES, classifier);
    expect(decided[0]).toEqual({ category: '生活費', source: 'csv' });
    expect(decided[1]!.source).toBe('auto');
    expect(decided[1]!.category).toMatch(/^贈与/);
    expect(decided[2]).toEqual({ category: '年金', source: 'auto', unknown: 'ZZQ謎' });
  });
});

describe('取込できる形式の案内', () => {
  it('ひな形はそのまま読め、エラーも残高の誤差も無い', () => {
    const [file, ...rest] = buildPreview('ひな形.csv', bytes(templateCsv()), buildExistingIndex([]));
    expect(rest).toHaveLength(0);
    expect(file!.detectedAccount).toMatchObject({ bankName: 'さくら銀行', accountNumber: '0012345' });
    expect(file!.rows).toHaveLength(3);
    expect(file!.rows.some((r) => r.isBalanceError)).toBe(false);
    expect(file!.rows.map((r) => r.date)).toEqual(['2024-04-15', '2024-04-20', '2024-04-25']);
    expect(file!.rows[2]).toMatchObject({ flagged: true, memo: '振込先の名前が一部読めない' });
  });

  it('ひな形の見出しは表の並びのまま（必須の列を全部含む）', () => {
    const header = templateCsv().split('\r\n')[0]!.split(',');
    expect(header).toEqual(IMPORT_COLUMNS.map((c) => c.name));
    expect(REQUIRED_COLUMNS).toEqual(['date', 'description', 'amount_out', 'amount_in']);
  });

  it('指示文は設定の分類・キーワード・贈与の金額から作り、守ることを含む', () => {
    const text = aiInstruction({
      categories: [
        { name: '年金', keywords: ['年金', '厚生年金'] },
        { name: STANDARD_CATEGORIES.find((c) => c.startsWith('贈与'))!, keywords: ['振込'] },
        { name: 'ZZQ追加分類', keywords: ['ZZQキーワード'] },
        { name: '未分類', keywords: [] },
      ],
      giftThreshold: 1_500_000,
    });
    expect(text).toContain('- ZZQ追加分類（摘要の例: ZZQキーワード）');
    expect(text).toContain('1,500,000円以上');
    expect(text).not.toMatch(/^- 未分類/m);
    expect(text).toContain('金額・残高は通帳のとおりに書く。計算で作らない');
    expect(text).toContain('読めない字は推測で埋めない。メモに読めなかった箇所を書き、要確認を「○」にする');
    expect(text).toContain('分類に迷ったら空欄にする（アプリが自動で分類する）');
    for (const c of IMPORT_COLUMNS) expect(text).toContain(`- ${c.name}（${c.required ? '必須' : '任意'}）`);
  });

  // README はイメージに入れない（.dockerignore）ので、コンテナの中では飛ばし、CI（チェックアウトの中）で確かめる
  it.skipIf(!fs.existsSync('README.md'))('README の表は画面と同じ表から作ったものと一致する', () => {
    expect(fs.readFileSync('README.md', 'utf8')).toContain(formatGuideMarkdown());
  });

  it('列が足りないエラーから足りない列とあった列を読み戻す', () => {
    let dict;
    try {
      load('日付,摘要,ZZQ列\nR6.4.1,ZZQ,1\n');
    } catch (e) {
      dict = (e as FormatError).toDict();
    }
    expect(missingColumnsOf(dict!)).toEqual({ missing: ['払戻額', 'お預り額'], found: ['日付', '摘要', 'ZZQ列'] });
    expect(missingColumnsOf({ type: 'data', expected_value: null, actual_value: null })).toBeNull();
  });
});
