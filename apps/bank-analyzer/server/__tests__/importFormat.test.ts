// 取込の分類・メモ・要確認の列と、取込できる形式の案内（依頼24）。値はすべて架空。

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_FUZZY_CONFIG, DEFAULT_GIFT_THRESHOLD, DEFAULT_PATTERNS, STANDARD_CATEGORIES } from '../lib/categories.js';
import { buildExistingIndex } from '../lib/dedup.js';
import { IMPORT_COLUMNS, parseFlag, REQUIRED_COLUMNS } from '../lib/import/columns.js';
import { categoryResolver, decideCategories } from '../lib/import/csvCategory.js';
import { FormatError, missingColumnsOf } from '../lib/import/errors.js';
import { aiInstruction, classificationImprovementRequest, classificationInstruction, extractGeminiResponse, extractImprovementResponse, formatGuideMarkdown, promptImprovementRequest, templateCsv } from '../lib/import/format.js';
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

  it('平成30年と指定したCSVの日付を平成30年として取り込む', () => {
    const st = load(`${base}\nH30.3.21,ZZQ架空,1000,,9000\n`);
    expect(st.rows[0]?.date).toBe('2018-03-21');
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
    expect(text).toContain('読めない字は「■」にして、メモに読めなかった箇所を書き、要確認を「○」にする');
    expect(text).toContain('分類に迷ったら空欄にする（アプリでは未分類で取り込む）');
    // 依頼26: Gemini で崩れた所
    expect(text).toContain(`どの行も項目は必ず${IMPORT_COLUMNS.length}個`);
    expect(text).toContain('金額・残高は数字だけ。カンマを入れない');
    expect(text).toContain('「繰越」「合計」「前ページより」');
    expect(text).toContain('ｾﾞｲｷﾝ → ゼイキン');
    // 依頼27: 元号は推測させない・濁点のあとに空白を入れない・大きい字は大きいまま
    expect(text).toContain('通帳の数字のまま書く（6-08-12・30-03-21）。年の数字を落とさず、推測で元号や西暦を付けない');
    expect(text).not.toContain('分かっていること');
    expect(text).toContain('濁点・半濁点のあとに空白や「\"」を入れない');
    expect(text).toContain('ｼﾖｳｹﾝ → シヨウケン');
    expect(text).toContain('返すのは CSV だけ');
    // 贈与のキーワード（振込）は例に出さず、出金・閾値以上・入金には付けない、を決まりで書く
    expect(text).toMatch(/^- 贈与・教育費（出金）$/m);
    expect(text).not.toContain('摘要の例: 振込');
    expect(text).toContain('出金が1,500,000円以上の振込だけに付ける。入金には付けない');
    expect(text).toContain('- 年金（入金。摘要の例: 年金・厚生年金）');
    // 長さは Gemini にそのまま貼れる範囲
    expect(text.length).toBeLessThan(4000);
    for (const c of IMPORT_COLUMNS) expect(text).toContain(`- ${c.name}（${c.required ? '必須' : '任意'}）`);
  });

  it('元号・通帳の期間が分かっていれば指示文に入れる（依頼27）', () => {
    const format = { categories: [], giftThreshold: 1_000_000 };
    const reiwa = aiInstruction(format, { era: 'R', period: '令和6年8月〜令和7年1月' });
    expect(reiwa).toContain('## 分かっていること');
    expect(reiwa).toContain('この通帳の日付の元号は 令和 です。日付は R6.8.12 の形で書く');
    expect(reiwa).toContain('この通帳の期間: 令和6年8月〜令和7年1月');
    expect(reiwa).toContain('上の「分かっていること」の元号を付ける');
    expect(reiwa).not.toContain('推測で元号を付けない');
    expect(aiInstruction(format, { era: 'H' })).toContain('元号は 平成 です。日付は H6.8.12 の形で書く');
    expect(aiInstruction(format, { era: 'H' })).toContain('30－03－21 → H30.3.21');
    expect(aiInstruction(format, { era: 'H' })).toContain('年の数字を変えたり落としたりしない');
    expect(aiInstruction(format, { era: 'AD' })).toContain('西暦です。日付は 2024-08-12 の形');
    // 期間だけ（空白だけは入れない）
    expect(aiInstruction(format, { period: '  ' })).not.toContain('分かっていること');
    expect(aiInstruction(format, { period: '2024年' })).toContain('推測で元号や西暦を付けない');
  });

  it('Gemini向けExcelでは検査結果・次回依頼文案・改善ルールを指示する', () => {
    const text = aiInstruction(
      { categories: [{ name: '年金', keywords: ['年金'] }], giftThreshold: 1_000_000 },
      { era: 'R', period: '令和2年〜令和3年' },
      { output: 'xlsx', extraRules: '- 年の02は令和2年として前後ページでも確認する' },
    );
    expect(text).toContain('Excel ファイル（.xlsx）だけ');
    expect(text).toContain('1枚目のシート名は「取引データ」');
    expect(text).toContain('2枚目の「検査結果」シート');
    expect(text).toContain('3枚目の「次回依頼文案」シート');
    expect(text).toContain('Excel「取引データ」シートの1行');
    expect(text).toContain('分類の列は空欄にする');
    expect(text).not.toContain('摘要の例: 年金');
    expect(text).toContain('## これまでの誤りから追加したルール');
    expect(text).toContain('年の02は令和2年');
    expect(text).not.toContain('文字コードは UTF-8');
  });

  it('人の指摘とGemini案を含む改善依頼を作る', () => {
    const text = promptImprovementRequest('現在の依頼文ZZQ', '入出金が逆ZZQ', '列見出しを再確認ZZQ');
    expect(text).toContain('入出金が逆ZZQ');
    expect(text).toContain('列見出しを再確認ZZQ');
    expect(text).toContain('現在の依頼文ZZQ');
    expect(text).toContain('今回の改善を統合したルール全文');
    expect(text).toContain('# 今回の変更点');
  });

  it('Geminiの回答全体から取引CSVと次回依頼文案を分ける', () => {
    const parts = extractGeminiResponse(
      '# 取引CSV\n```csv\n日付,摘要,払戻額,お預り額\nR2.1.1,テスト,100,,\n```\n# 次回依頼文案\n- 元号は表紙と照合する\n',
    );
    expect(parts.csv).toBe('日付,摘要,払戻額,お預り額\nR2.1.1,テスト,100,,');
    expect(parts.improvementDraft).toBe('- 元号は表紙と照合する');
  });

  it('分類専用の依頼文は分類基準を示し、元データの変更を禁止する', () => {
    const text = classificationInstruction({
      categories: [{ name: '生活費', keywords: ['ZZQアプリ専用キーワード'] }, { name: '贈与・教育費', keywords: ['振込'] }],
      giftThreshold: 1_000_000,
    }, '- 同一人物への反復送金は要確認');
    expect(text).toContain('変更してよいのは「分類」列だけ');
    expect(text).toContain('生活費（出金。日常生活の買物、公共料金、通信費、医療費、交通費など）');
    expect(text).not.toContain('ZZQアプリ専用キーワード');
    expect(text).toContain('1,000,000円以上');
    expect(text).toContain('同一人物への反復送金は要確認');
    expect(text).toContain('# 分類済みCSV');
    expect(text).toContain('最初の回答は「分類済みCSV」だけ');
    expect(text).toContain('同じ会話でユーザーから分類間違いを指摘されたら');
    expect(text).toContain('# 改善後のルール全文');
  });

  it('文字認識の初回はCSVだけを求め、修正時に統合済み改善ルールも求める', () => {
    const text = aiInstruction({ categories: [], giftThreshold: 1_000_000 }, {}, { output: 'csv', ocrOnly: true, includeImprovement: true });
    expect(text).toContain('最初の回答は「取引CSV」だけ');
    expect(text).toContain('同じ会話でユーザーから読み取り間違いを指摘されたら');
    expect(text).toContain('「# 改善後のルール全文」');
    expect(text).toContain('「# 今回の変更点」');
    expect(text).toContain('30－03－21');
    expect(text).not.toContain('# 次回依頼文案');
  });

  it('分類依頼文の改善は個別事例を一般化させる', () => {
    const text = classificationImprovementRequest('現在の分類依頼ZZQ', '生活費と誤分類ZZQ', '高額送金を確認ZZQ');
    expect(text).toContain('現在の分類依頼ZZQ');
    expect(text).toContain('生活費と誤分類ZZQ');
    expect(text).toContain('個別の人名・金額だけに通用するルールではなく');
    expect(text).toContain('# 改善後のルール全文');
  });

  it('改善AIの回答から統合後の全文と変更点を分ける', () => {
    expect(extractImprovementResponse('# 改善後のルール全文\n- 旧ルール\n- 新ルール\n\n# 今回の変更点\n- 新ルールを追加')).toEqual({
      rules: '- 旧ルール\n- 新ルール', changes: '- 新ルールを追加',
    });
    expect(extractImprovementResponse('- 見出しなしの全文')).toEqual({ rules: '- 見出しなしの全文', changes: '' });
  });

  it('CSVだけを貼り付けてもそのまま取り出す', () => {
    expect(extractGeminiResponse('日付,摘要,払戻額,お預り額\nR2.1.1,テスト,,100\n').csv).toContain('R2.1.1');
    expect(extractGeminiResponse('説明だけです').csv).toBe('');
  });

  it('Excelでコピーしたタブ区切りの表をCSVへ変換する', () => {
    const parts = extractGeminiResponse(
      '日付\t摘要\t払戻額\tお預り額\nR2.1.1\t振込,ヤマダ\t1000\t\nR2.1.2\t利息\t\t20\n',
    );
    expect(parts.csv).toBe('日付,摘要,払戻額,お預り額\nR2.1.1,"振込,ヤマダ",1000,\nR2.1.2,利息,,20');
    expect(parts.improvementDraft).toBe('');
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
