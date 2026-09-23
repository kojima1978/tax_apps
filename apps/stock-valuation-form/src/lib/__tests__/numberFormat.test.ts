import { describe, expect, it } from 'vitest';
import {
  formatAmount,
  formatDecimal,
  formatSenPart,
  formatSignedCommaInteger,
  formatYenPart,
  parseAmount,
  stripAmountFormatting,
} from '@/lib/numberFormat';

describe('負数の表記（明細書の「△」）', () => {
  it('金額の負数は△を冠して3桁区切りで書く', () => {
    expect(formatAmount(20000)).toBe('20,000');
    expect(formatAmount(-20000)).toBe('△20,000');
    expect(formatAmount(0)).toBe('0');
    expect(formatAmount(null)).toBe('');
    expect(formatAmount(null, '－')).toBe('－');
  });

  it('分数等の小数は桁を落とさず、負数なら△を付ける', () => {
    expect(formatAmount(0.0005)).toBe('0.0005');
    expect(formatAmount(-0.0005)).toBe('△0.0005');
  });

  it('割合など小数を丸めて書く欄も△で書く', () => {
    expect(formatDecimal(12.34, 1)).toBe('12.3');
    expect(formatDecimal(-12.34, 1)).toBe('△12.3');
  });

  it('円銭で書く欄は符号を円側だけに付ける（銭に△を重ねない）', () => {
    expect(formatYenPart(42.5)).toBe('42');
    expect(formatSenPart(42.5)).toBe('50');
    expect(formatYenPart(-42.5)).toBe('△42');
    expect(formatSenPart(-42.5)).toBe('50');
  });

  it('入力欄は打鍵のたびに整形し、「-」と打てば△になる', () => {
    expect(formatSignedCommaInteger('1234567')).toBe('1,234,567');
    expect(formatSignedCommaInteger('-2000')).toBe('△2,000');
    expect(formatSignedCommaInteger('△2,000')).toBe('△2,000');
    // 数字を打つ前の符号だけの状態も残す（欠損を入れている途中）
    expect(formatSignedCommaInteger('-')).toBe('△');
    expect(formatSignedCommaInteger('')).toBe('');
  });
});

describe('読み取り（stripAmountFormatting）', () => {
  it('△に切り替える前に保存された「-」もそのまま読める', () => {
    expect(parseAmount('△20,000')).toBe(-20000);
    expect(parseAmount('-20,000')).toBe(-20000);
  });

  it('貼り付けで入りうる▲・全角マイナスも負号として受ける', () => {
    expect(stripAmountFormatting('▲1,500')).toBe('-1500');
    expect(stripAmountFormatting('−1,500')).toBe('-1500');
    expect(stripAmountFormatting(' 1,500 ')).toBe('1500');
  });

  it('空欄・数値でないものは0として扱う', () => {
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('－')).toBe(0);
  });
});
