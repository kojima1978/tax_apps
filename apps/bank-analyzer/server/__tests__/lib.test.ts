// 取込の部品（日付・文字の正規化・金額・残高）の単体テスト。
// ファイル単位の突き合わせは importer.test.ts。

import { describe, expect, it } from 'vitest';
import { validateBalance } from '../lib/balance.js';
import { parseStatementDate, toIsoDate } from '../lib/dates.js';
import { parseAmount } from '../lib/import/loadStatement.js';
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
  ])('%s → %s', (input, expected) => {
    expect(parseStatementDate(input)).toBe(expected);
  });

  it.each(['', '04/03/2021', '2021-02-30', 'R3.13.1', '令和3年4月1日', '21/4/1', 'abc'])('%s は読まない', (input) => {
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
  ])('%s → %d', (input, expected) => {
    expect(parseAmount(input)).toEqual({ ok: true, value: expected });
  });

  it('空欄は値なし', () => {
    expect(parseAmount('')).toEqual({ ok: true, value: null });
    expect(parseAmount(null)).toEqual({ ok: true, value: null });
  });

  it.each(['abc', '△100', '１２３', '1e3'])('%s は読まない', (input) => {
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
