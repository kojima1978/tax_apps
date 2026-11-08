import { describe, expect, it } from 'vitest';
import { normalizeDate, parseDate } from './date';

describe('parseDate', () => {
  it.each([
    ['2020-04-01', '2020-04-01'],
    ['2020/4/1', '2020-04-01'],
    ['2020.4.1', '2020-04-01'],
    ['20200401', '2020-04-01'],
    ['2020年4月1日', '2020-04-01'],
    ['２０２０／４／１', '2020-04-01'],
    ['2020-04-01T00:00:00.000Z', '2020-04-01'],
  ])('西暦 %s', (input, expected) => {
    expect(parseDate(input)).toEqual({ value: expected });
  });

  it.each([
    ['H27.4.1', '2015-04-01'],
    ['h27/4/1', '2015-04-01'],
    ['平成27年4月1日', '2015-04-01'],
    ['平27.4.1', '2015-04-01'],
    ['R3.10.15', '2021-10-15'],
    ['令和元年5月1日', '2019-05-01'],
    ['S63.12.31', '1988-12-31'],
    ['昭和64年1月7日', '1989-01-07'],
    ['平成元年1月8日', '1989-01-08'],
  ])('和暦 %s', (input, expected) => {
    expect(parseDate(input)).toEqual({ value: expected });
  });

  it('Excel のシリアル値（数値・文字列）', () => {
    expect(parseDate(43922)).toEqual({ value: '2020-04-01' });
    expect(parseDate('43922')).toEqual({ value: '2020-04-01' });
  });

  it('年月だけのときは1日として警告する', () => {
    const r = parseDate('令和3年4月');
    expect(r.value).toBe('2021-04-01');
    expect(r.warning).toContain('1日としました');
    expect(parseDate('2020/4').value).toBe('2020-04-01');
  });

  it('実在しない日付は黙って翌月へ送らない', () => {
    const r = parseDate('2023/2/30');
    expect(r.value).toBe('');
    expect(r.warning).toContain('実在しない');
    expect(parseDate('R5.2.29').value).toBe('');
  });

  it('元号の期間外は読みつつ警告する（平成31年5月1日は令和元年）', () => {
    const r = parseDate('平成31年5月1日');
    expect(r.value).toBe('2019-05-01');
    expect(r.warning).toContain('平成の期間外');
    expect(parseDate('令和1年4月30日').warning).toContain('令和の期間外');
  });

  it('読めないもの・空', () => {
    expect(parseDate('不明').value).toBe('');
    expect(parseDate('').warning).toBe('取得日がありません');
    expect(parseDate(undefined).value).toBe('');
    expect(parseDate(12).value).toBe('');
  });
});

describe('normalizeDate（CSV 取込）', () => {
  it('読めれば YYYY-MM-DD、読めなければ元の文字列を残す', () => {
    expect(normalizeDate('H27.4.1')).toBe('2015-04-01');
    expect(normalizeDate(' 不明 ')).toBe('不明');
    expect(normalizeDate('')).toBe('');
  });
});
