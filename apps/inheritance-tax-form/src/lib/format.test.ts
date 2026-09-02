import { describe, expect, it } from 'vitest';
import { cleanNumeric, displayNumeric, formatSignedCommaInteger } from './format';

describe('金額の3桁区切り', () => {
  it('入力中の金額を3桁ごとに区切る', () => {
    expect(cleanNumeric({ commaInteger: true }, '123456789')).toBe('123,456,789');
    expect(cleanNumeric({ commaInteger: true }, '12,345,678')).toBe('12,345,678');
  });

  it('過去データのカンマなし金額も表示時に整形する', () => {
    expect(displayNumeric({ commaInteger: true }, '30000000')).toBe('30,000,000');
  });

  it('還付額の△を維持したまま区切る', () => {
    expect(formatSignedCommaInteger('-1234567')).toBe('△1,234,567');
    expect(formatSignedCommaInteger('△1,234,567')).toBe('△1,234,567');
  });
});
