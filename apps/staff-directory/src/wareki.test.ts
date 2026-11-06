import { describe, expect, it } from 'vitest';
import { EMPTY_PARTS, birthDateError, partsToValue, seirekiYearOf, valueToParts } from './wareki';

const parts = (era: string, year: string, month: string, day: string) => ({ era, year, month, day });

describe('西暦 → 欄', () => {
  it('保存されている西暦を和暦の欄に分ける', () => {
    expect(valueToParts('1970-03-02')).toEqual(parts('昭和', '45', '3', '2'));
    expect(valueToParts('2019-05-01')).toEqual(parts('令和', '1', '5', '1'));
    expect(valueToParts('1989-01-07')).toEqual(parts('昭和', '64', '1', '7'));
    expect(valueToParts('1989-01-08')).toEqual(parts('平成', '1', '1', '8'));
  });

  it('空は空の欄', () => {
    expect(valueToParts('')).toEqual(EMPTY_PARTS);
  });
});

describe('欄 → 保存する値', () => {
  it('揃って正しければ西暦（元号の切り替わり前後も）', () => {
    expect(partsToValue(parts('昭和', '45', '3', '2'))).toBe('1970-03-02');
    expect(partsToValue(parts('昭和', '64', '1', '7'))).toBe('1989-01-07');
    expect(partsToValue(parts('平成', '1', '1', '8'))).toBe('1989-01-08');
    expect(partsToValue(parts('令和', '1', '5', '1'))).toBe('2019-05-01');
  });

  it('先頭の0は付けても付けなくてもよい', () => {
    expect(partsToValue(parts('昭和', '045', '03', '02'))).toBe('1970-03-02');
  });

  it('全部空なら空（生年月日なし）', () => {
    expect(partsToValue(EMPTY_PARTS)).toBe('');
    expect(birthDateError('')).toBeNull();
  });

  it('途中までのものは下書きのまま。欄へ戻すと入れたとおりに出る', () => {
    const v = partsToValue(parts('昭和', '45', '', ''));
    expect(v).not.toMatch(/^\d{4}-/);
    expect(valueToParts(v)).toEqual(parts('昭和', '45', '', ''));
    expect(birthDateError(v)).toMatch(/すべて入れてください/);
  });

  it('元号だけ選んだものも保存させない', () => {
    expect(birthDateError(partsToValue(parts('平成', '', '', '')))).toMatch(/すべて入れてください/);
  });

  it('存在しない日は別の日に直さず止める', () => {
    const v = partsToValue(parts('平成', '3', '2', '30'));
    expect(v).not.toMatch(/^\d{4}-/);
    expect(birthDateError(v)).toBe('生年月日が存在しない日付です');
    expect(birthDateError(partsToValue(parts('平成', '0', '1', '1')))).toBe('生年月日が存在しない日付です');
  });

  it('元号の違う日付は、本当の和暦を添えて止める', () => {
    expect(birthDateError(partsToValue(parts('平成', '31', '5', '1')))).toBe('平成31年5月1日は令和元年5月1日です');
    expect(birthDateError(partsToValue(parts('昭和', '64', '1', '8')))).toBe('昭和64年1月8日は平成元年1月8日です');
  });

  it('うるう日は実在する年だけ通す', () => {
    expect(partsToValue(parts('平成', '8', '2', '29'))).toBe('1996-02-29');
    expect(birthDateError(partsToValue(parts('平成', '9', '2', '29')))).toBe('生年月日が存在しない日付です');
  });
});

describe('西暦年の添え書き', () => {
  it('年まで入れば出し、元号か年が無ければ出さない', () => {
    expect(seirekiYearOf(parts('昭和', '45', '', ''))).toBe(1970);
    expect(seirekiYearOf(parts('', '45', '', ''))).toBeNull();
    expect(seirekiYearOf(parts('昭和', '', '', ''))).toBeNull();
  });
});
