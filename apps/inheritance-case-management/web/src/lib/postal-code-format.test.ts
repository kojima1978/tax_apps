import { describe, expect, it } from 'vitest';
import {
  formatPostalCodeForDisplay,
  formatPostalCodeForInput,
  isValidPostalCode,
  normalizePostalCodeDigits,
} from './postal-code-format';

describe('郵便番号の正規化', () => {
  it('全角数字を半角にし、数字以外を落とす', () => {
    expect(normalizePostalCodeDigits('１２３－４５６７')).toBe('1234567');
    expect(normalizePostalCodeDigits('〒123-4567')).toBe('1234567');
    expect(normalizePostalCodeDigits(' 123 4567 ')).toBe('1234567');
  });

  it('7桁を超えたぶんは捨てる', () => {
    expect(normalizePostalCodeDigits('12345678901')).toBe('1234567');
  });

  it('未入力は空文字', () => {
    expect(normalizePostalCodeDigits(null)).toBe('');
    expect(normalizePostalCodeDigits(undefined)).toBe('');
    expect(normalizePostalCodeDigits('abc')).toBe('');
  });
});

describe('郵便番号の表示', () => {
  it('入力中は4桁目からハイフンを入れる', () => {
    expect(formatPostalCodeForInput('123')).toBe('123');
    expect(formatPostalCodeForInput('1234')).toBe('123-4');
    expect(formatPostalCodeForInput('1234567')).toBe('123-4567');
  });

  it('表示は〒付き。途中まででも〒を出す', () => {
    expect(formatPostalCodeForDisplay('1234567')).toBe('〒123-4567');
    expect(formatPostalCodeForDisplay('1234')).toBe('〒123-4');
    expect(formatPostalCodeForDisplay('')).toBe('');
  });
});

describe('保存時の検証', () => {
  it('7桁ちょうどだけ通す', () => {
    expect(isValidPostalCode('1234567')).toBe(true);
    expect(isValidPostalCode('123456')).toBe(false);
    expect(isValidPostalCode('123-4567')).toBe(false);
  });

  it('未入力は通す（郵便番号は必須ではない）', () => {
    expect(isValidPostalCode('')).toBe(true);
    expect(isValidPostalCode(null)).toBe(true);
    expect(isValidPostalCode(undefined)).toBe(true);
  });
});
