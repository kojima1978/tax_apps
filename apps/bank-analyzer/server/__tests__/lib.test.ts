// 取込の部品（日付・文字の正規化・金額・残高）の単体テスト。
// ファイル単位の突き合わせは importer.test.ts。

import { describe, expect, it } from 'vitest';
import { chainBalance, validateBalance } from '../lib/balance.js';
import { parseStatementDate, toIsoDate } from '../lib/dates.js';
import { buildDuplicateWarning, buildExistingIndex, markDuplicates } from '../lib/dedup.js';
import { parseAmount } from '../lib/import/loadStatement.js';
import { pyRound } from '../lib/pyRound.js';
import { matchesAllKeywords, normalizeText, splitKeywords } from '../lib/text.js';

describe('parseStatementDate', () => {
  it.each([
    ['R3.4.1', '2021-04-01'],
    ['R03.04.01', '2021-04-01'],
    ['R3/4/2', '2021-04-02'],
    ['H31.4.30', '2019-04-30'],
    ['S64.1.7', '1989-01-07'],
    [' 2021-04-03 ', '2021-04-03'],
    ['2021/4/4', '2021-04-04'],
    ['2021.4.5', '2021-04-05'],
    ['2021-04-03 00:00:00', '2021-04-03'],
    ['2021-04-03T12:34', '2021-04-03'],
    // #10 漢字の年月日・全角
    ['令和3年4月1日', '2021-04-01'],
    ['令和元年5月1日', '2019-05-01'],
    ['平成31年4月30日', '2019-04-30'],
    ['R3年4月1日', '2021-04-01'],
    ['2021年4月1日', '2021-04-01'],
    ['2021年4月1日(木)', '2021-04-01'],
    ['Ｒ３．４．１', '2021-04-01'],
    ['２０２１／４／１', '2021-04-01'],
  ])('%s → %s', (input, expected) => {
    expect(parseStatementDate(input)).toBe(expected);
  });

  it.each(['', '04/03/2021', '2021-02-30', 'R3.13.1', '令和3年13月1日', '21/4/1', 'abc'])('%s は読まない', (input) => {
    expect(parseStatementDate(input)).toBeNull();
  });

  it('うるう年', () => {
    expect(toIsoDate(2024, 2, 29)).toBe('2024-02-29');
    expect(toIsoDate(2023, 2, 29)).toBeNull();
    expect(toIsoDate(1900, 2, 29)).toBeNull();
  });
});

describe('normalizeText', () => {
  it('半角カナ・全角英数・大文字・カタカナをそろえる', () => {
    expect(normalizeText('ｶﾌﾞｼｷｶﾞｲｼｬ ＡＢＣ')).toBe('かぶしきがいしゃ abc');
    expect(normalizeText('ミズホ')).toBe('みずほ');
  });

  it('表に無い文字は残す（Django 版と同じ）', () => {
    expect(normalizeText('ヶー')).toBe('ヶー');
  });

  it('キーワードは全角スペースでも分ける', () => {
    expect(splitKeywords('ｱｲ　ウ  ')).toEqual(['あい', 'う']);
    expect(matchesAllKeywords('アイウエオ', splitKeywords('あい お'))).toBe(true);
    expect(matchesAllKeywords(null, ['あ'])).toBe(false);
  });
});

describe('parseAmount', () => {
  it.each([
    ['1,234', 1234],
    [' 100 ', 100],
    ['-100', -100],
    ['+5', 5],
    ['100.0', 100],
    ['-0', 0],
    // #10 全角数字・△▲の負号・円・¥
    ['１２３', 123],
    ['１，２３４', 1234],
    ['△100', -100],
    ['▲1,000', -1000],
    ['1,000円', 1000],
    ['¥1,000', 1000],
    ['-¥500', -500],
  ])('%s → %d', (input, expected) => {
    expect(parseAmount(input)).toEqual({ ok: true, value: expected });
  });

  it('空欄は値なし', () => {
    expect(parseAmount('')).toEqual({ ok: true, value: null });
    expect(parseAmount(null)).toEqual({ ok: true, value: null });
  });

  it.each(['abc', '1e3', '△', '円', '1-2'])('%s は読まない', (input) => {
    expect(parseAmount(input)).toMatchObject({ ok: false, decimal: false });
  });

  it('小数はエラー（数値セルも）', () => {
    expect(parseAmount('100.7')).toMatchObject({ ok: false, decimal: true });
    expect(parseAmount(100.7)).toMatchObject({ ok: false, decimal: true });
    expect(parseAmount(100)).toEqual({ ok: true, value: 100 });
  });
});

describe('validateBalance', () => {
  const row = (date: string, amountOut: number, amountIn: number, balance: number | null) => ({
    date,
    amountOut,
    amountIn,
    balance,
  });

  it('日付順に並べ、同じ日はファイルの順のまま', () => {
    const result = validateBalance(
      [row('2021-04-02', 0, 100, 1100), row('2021-04-01', 0, 0, 1000), row('2021-04-02', 50, 0, 1050)],
      true,
    );
    expect(result.map((r) => r.balance)).toEqual([1000, 1100, 1050]);
    expect(result.every((r) => !r.isBalanceError)).toBe(true);
  });

  it('合わない行の次は、書かれた残高から計算し直す', () => {
    const result = validateBalance(
      [row('2021-04-01', 0, 0, 1000), row('2021-04-02', 100, 0, 500), row('2021-04-03', 100, 0, 400)],
      true,
    );
    expect(result.map((r) => [r.calcBalance, r.isBalanceError])).toEqual([
      [1000, false],
      [900, true],
      [400, false],
    ]);
  });

  it('残高の空欄は突き合わせず、計算上の残高を引き継ぐ', () => {
    const result = validateBalance(
      [row('2021-04-02', 0, 0, 1000), row('2021-04-03', 100, 0, null), row('2021-04-04', 100, 0, 800)],
      true,
    );
    expect(result.map((r) => [r.calcBalance, r.isBalanceError])).toEqual([
      [1000, false],
      [900, false],
      [800, false],
    ]);
  });

  it('先頭が空欄なら、最初に残高のある行が起点', () => {
    const result = validateBalance([row('2021-04-01', 100, 0, null), row('2021-04-02', 0, 0, 1000)], true);
    expect(result.map((r) => [r.calcBalance, r.isBalanceError])).toEqual([
      [null, false],
      [1000, false],
    ]);
  });

  it('残高の列が無ければ並べ替えない', () => {
    const result = validateBalance([row('2021-04-02', 1, 0, null), row('2021-04-01', 1, 0, null)], false);
    expect(result.map((r) => [r.date, r.calcBalance])).toEqual([
      ['2021-04-02', null],
      ['2021-04-01', null],
    ]);
  });
});

describe('chainBalance', () => {
  it('並べ替えずに渡された順で突き合わせる（取込ウィザードで行を動かした後の数え直し）', () => {
    const rows = [
      { amountOut: 0, amountIn: 0, balance: 1000 },
      { amountOut: 0, amountIn: 100, balance: 1100 },
      { amountOut: 50, amountIn: 0, balance: 1050 },
    ];
    expect(chainBalance(rows).map((r) => r.isBalanceError)).toEqual([false, false, false]);
    expect(chainBalance([rows[0]!, rows[2]!, rows[1]!]).map((r) => [r.calcBalance, r.isBalanceError])).toEqual([
      [1000, false],
      [950, true],
      [1150, true],
    ]);
  });
});

describe('pyRound', () => {
  it.each([
    [0.125, 2, 0.12],
    [0.375, 2, 0.38],
    [2.675, 2, 2.67], // 2.675 は実際には 2.67499… なので切り捨て
    [12.5, 0, 12],
    [13.5, 0, 14],
    [0.5, 0, 0],
    [-2.5, 0, -2],
    [1 / 3, 2, 0.33],
    [2 / 3, 2, 0.67],
    [100, 0, 100],
  ])('round(%d, %d) = %d', (x, n, expected) => {
    expect(pyRound(x, n)).toBe(expected);
  });
});

describe('markDuplicates', () => {
  const tx = (date: string, amountOut: number, balance: number | null, description = 'ATM') => ({
    accountNumber: '1111111',
    date,
    amountOut,
    amountIn: 0,
    description,
    balance,
  });

  it('DB にある件数までを重複にし、残高まで一致する行を先に選ぶ', () => {
    const index = buildExistingIndex([tx('2024-04-01', 1000, 9000)]);
    const { rows, duplicateCount } = markDuplicates(
      [tx('2024-04-01', 1000, 8000), tx('2024-04-01', 1000, 9000)],
      index,
      '',
    );
    expect(duplicateCount).toBe(1);
    expect(rows.map((r) => [r.isDuplicate, r.dupConfidence])).toEqual([
      [false, null],
      [true, 'high'],
    ]);
  });

  it('残高が合わなければ low。索引は消費されるので2回目は重複にならない', () => {
    const index = buildExistingIndex([tx('2024-04-01', 1000, 9000)]);
    const first = markDuplicates([tx('2024-04-01', 1000, null)], index, '');
    expect(first.rows[0]).toMatchObject({ isDuplicate: true, dupConfidence: 'low' });
    const second = markDuplicates([tx('2024-04-01', 1000, 9000)], index, '');
    expect(second.duplicateCount).toBe(0);
  });

  it('摘要の前後の空白は無視し、口座番号が無い行は既定の番号で比べる', () => {
    const index = buildExistingIndex([tx('2024-04-01', 1000, 9000)]);
    const { duplicateCount } = markDuplicates(
      [{ ...tx('2024-04-01', 1000, 9000, ' ATM '), accountNumber: null }],
      index,
      '1111111',
    );
    expect(duplicateCount).toBe(1);
  });

  it('口座番号の先頭の 0 は別の番号として扱う', () => {
    const index = buildExistingIndex([{ ...tx('2024-04-01', 1000, 9000), accountNumber: '12345' }]);
    const { duplicateCount } = markDuplicates([{ ...tx('2024-04-01', 1000, 9000), accountNumber: '0012345' }], index, '');
    expect(duplicateCount).toBe(0);
  });
});

describe('buildDuplicateWarning', () => {
  const rows = (pattern: string) => [...pattern].map((c) => ({ isDuplicate: c === 'x' }));

  it('3行続けば連続の注意', () => {
    expect(buildDuplicateWarning(rows('.xxx.'), 3, 5)?.message).toBe(
      '既存データと 3 行連続で一致しています。重複インポートの可能性が高いです。',
    );
  });

  it('続かなくても3割以上なら割合の注意（Python と同じ丸め）', () => {
    const w = buildDuplicateWarning(rows('x.x.x...'), 3, 8);
    expect(w).toEqual({
      maxRun: 1,
      ratio: 0.38,
      duplicateCount: 3,
      message: '8 件中 3 件（38%）が既存データと一致しています。',
    });
  });

  it('少なければ出さない', () => {
    expect(buildDuplicateWarning(rows('x.x.......'), 2, 10)).toBeNull();
    expect(buildDuplicateWarning(rows('x.x.x.....'), 3, 10)).toEqual(expect.objectContaining({ ratio: 0.3 }));
    expect(buildDuplicateWarning(rows('x.x.x......'), 3, 11)).toBeNull();
  });
});
