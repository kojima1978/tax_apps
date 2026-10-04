import { describe, expect, it } from 'vitest';
import { normalizeDate, parseCSVText, parseOptionalNumber } from './parser';

describe('CSVの行分割', () => {
  it('BOM付きでもヘッダーが壊れない', () => {
    expect(parseCSVText('﻿ID,被相続人氏名\n1,山田')).toEqual([
      ['ID', '被相続人氏名'],
      ['1', '山田'],
    ]);
  });

  it('改行は LF / CRLF / CR のどれでも1行として扱う', () => {
    const expected = [['a', 'b'], ['c', 'd']];
    expect(parseCSVText('a,b\nc,d')).toEqual(expected);
    expect(parseCSVText('a,b\r\nc,d')).toEqual(expected);
    expect(parseCSVText('a,b\rc,d')).toEqual(expected);
  });

  it('引用符の中のカンマ・改行・引用符を取り違えない', () => {
    expect(parseCSVText('"東京都,千代田区",1')).toEqual([['東京都,千代田区', '1']]);
    expect(parseCSVText('"1行目\n2行目",x')).toEqual([['1行目\n2行目', 'x']]);
    expect(parseCSVText('"幅""広""",x')).toEqual([['幅"広"', 'x']]);
  });

  it('空行は捨てる（Excel が末尾に足すカンマだけの行を含む）', () => {
    expect(parseCSVText('a,b\n\n,,\nc,d\n')).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('最後の行に改行が無くても拾う', () => {
    expect(parseCSVText('a,b')).toEqual([['a', 'b']]);
  });

  it('空の入力は0行', () => {
    expect(parseCSVText('')).toEqual([]);
    expect(parseCSVText('\n\n')).toEqual([]);
  });

  it('欠けた列は空文字のまま残す（列数を揃えない）', () => {
    expect(parseCSVText('a,b,c\n1,,3')).toEqual([['a', 'b', 'c'], ['1', '', '3']]);
  });
});

describe('日付の正規化', () => {
  it('すでに YYYY-MM-DD ならそのまま', () => {
    expect(normalizeDate('2026-07-04')).toBe('2026-07-04');
  });

  it('Excel が書く YYYY/M/D と YYYY.M.D を0詰めする', () => {
    expect(normalizeDate('2026/7/4')).toBe('2026-07-04');
    expect(normalizeDate('2026/07/04')).toBe('2026-07-04');
    expect(normalizeDate('2026.7.4')).toBe('2026-07-04');
  });

  it('和暦は元号1文字・略記・正式名のどれでも読む', () => {
    expect(normalizeDate('R4.1.21')).toBe('2022-01-21');
    expect(normalizeDate('令4.1.21')).toBe('2022-01-21');
    expect(normalizeDate('令和4.1.21')).toBe('2022-01-21');
    expect(normalizeDate('H31.4.30')).toBe('2019-04-30');
    expect(normalizeDate('S64.1.7')).toBe('1989-01-07');
    expect(normalizeDate('T15.12.24')).toBe('1926-12-24');
    expect(normalizeDate('M45.7.29')).toBe('1912-07-29');
  });

  it('読めない形はそのまま返す（握り潰して空にしない）', () => {
    // 後段の zod 検証でエラー行として見えるようにするため。
    expect(normalizeDate('令和四年一月')).toBe('令和四年一月');
    expect(normalizeDate('')).toBe('');
    expect(normalizeDate('不明')).toBe('不明');
  });
});

describe('金額・数量の読み取り', () => {
  it('桁区切りのカンマを外す', () => {
    expect(parseOptionalNumber('1,234,567')).toBe(1234567);
  });

  it('未入力は undefined（0 ではない）', () => {
    // 0 にすると「未入力」と「0円」が区別できなくなる。
    expect(parseOptionalNumber('')).toBeUndefined();
    expect(parseOptionalNumber('   ')).toBeUndefined();
  });

  it('数値でなければ undefined', () => {
    expect(parseOptionalNumber('未定')).toBeUndefined();
    expect(parseOptionalNumber('1,2x3')).toBeUndefined();
  });

  it('round を付けたときだけ整数に丸める', () => {
    expect(parseOptionalNumber('1234.6')).toBe(1234.6);
    expect(parseOptionalNumber('1234.6', true)).toBe(1235);
    expect(parseOptionalNumber('1234.4', true)).toBe(1234);
  });

  it('マイナスも読む（値引き等）', () => {
    expect(parseOptionalNumber('-5,000')).toBe(-5000);
  });
});
