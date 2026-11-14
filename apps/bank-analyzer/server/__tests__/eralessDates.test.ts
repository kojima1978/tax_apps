import { describe, expect, it } from 'vitest';
import { eraSegments, eraWarnings, eralessToIso, parseEralessDate, rankEras, type EraContext } from '../lib/import/eralessDates.js';
import { parseStatementDate } from '../lib/dates.js';

const d = (raw: string) => parseEralessDate(raw)!;
const ctx = (over: Partial<EraContext> = {}): EraContext => ({ existing: null, referenceDate: null, today: '2026-11-15', ...over });

describe('元号の無い日付（依頼27）', () => {
  it('年が1〜2桁の形だけを読む（区切りは - . / 年月日・全角も）', () => {
    expect(parseEralessDate('6-08-12')).toEqual({ year: 6, month: 8, day: 12 });
    expect(parseEralessDate('6.8.12')).toEqual({ year: 6, month: 8, day: 12 });
    expect(parseEralessDate('06/08/12')).toEqual({ year: 6, month: 8, day: 12 });
    expect(parseEralessDate('６年８月１２日')).toEqual({ year: 6, month: 8, day: 12 });
    for (const raw of ['R6.8.12', '2024-08-12', '6-08', '', null, '123-1-1']) expect(parseEralessDate(raw)).toBeNull();
  });

  it('既存の読める日付の読み方は変わらない（元号つき・西暦はここを通らない）', () => {
    expect(parseStatementDate('R6.8.12')).toBe('2024-08-12');
    expect(parseStatementDate('2024-08-12')).toBe('2024-08-12');
  });

  it('元号ごとの西暦。西暦は 2000 年代。実在しない日は null', () => {
    expect(eralessToIso(d('6-08-12'), 'R')).toBe('2024-08-12');
    expect(eralessToIso(d('6-08-12'), 'H')).toBe('1994-08-12');
    expect(eralessToIso(d('6-08-12'), 'S')).toBe('1931-08-12');
    expect(eralessToIso(d('24-08-12'), 'AD')).toBe('2024-08-12');
    expect(eralessToIso(d('7-02-29'), 'R')).toBeNull();
    expect(eralessToIso(d('0-01-01'), 'R')).toBeNull();
  });

  it('年が戻る所だけで区切る（年またぎは区切らない・元号またぎは区切る）', () => {
    const rows = ['30-12-25', '31-01-05', '31-04-26', '1-05-07', '1-12-30', '2-01-06'].map((raw) => ({ raw, date: d(raw) }));
    expect(eraSegments(rows).map((s) => s.map((r) => r.raw))).toEqual([
      ['30-12-25', '31-01-05', '31-04-26'],
      ['1-05-07', '1-12-30', '2-01-06'],
    ]);
  });

  it('候補は取込済みの期間 → 相続開始日 → 今日 に近い順。未来・実在しない日は後ろ', () => {
    const dates = ['6-08-12', '7-01-05'].map(d);
    // 目印なし（今日）: 令和が先頭、西暦（2006年）がその次
    expect(rankEras(dates, ctx()).map((o) => o.era)).toEqual(['R', 'AD', 'H', 'S']);
    // 相続開始日が平成なら平成が先頭
    expect(rankEras(dates, ctx({ referenceDate: '1995-03-01' }))[0]!.era).toBe('H');
    // 取込済みの期間は相続開始日より優先
    const withExisting = rankEras(dates, ctx({ referenceDate: '1995-03-01', existing: { from: '2006-01-01', to: '2006-12-31' } }));
    expect(withExisting[0]).toMatchObject({ era: 'AD', from: '2006-08-12', to: '2007-01-05', distance: 0 });
    // 未来になる元号は近くても後ろ
    const future = rankEras(['8-12-01'].map(d), ctx({ today: '2026-11-15' }));
    expect(future.find((o) => o.era === 'R')).toMatchObject({ future: 1 });
    expect(future[0]!.era).not.toBe('R');
    // 2月29日が無い年になる元号は選べず、いちばん後ろ（令和2年はうるう年、平成2年は違う）
    const leap = rankEras([d('2-02-29')], ctx());
    expect(leap.find((o) => o.era === 'R')!.impossible).toBe(0);
    expect(leap.find((o) => o.era === 'H')!.impossible).toBe(1);
    expect(leap[leap.length - 1]!.impossible).toBe(1);
  });

  it('当てたあとの注意: 未来・相続開始日より後・前の行より古い・元号の期間の外', () => {
    const rows = [
      { key: 1, date: '2024-08-12', eraFilled: null },
      { key: 2, date: '2024-08-01', eraFilled: 'R' as const },
      { key: 3, date: '2027-01-01', eraFilled: 'R' as const },
      { key: 4, date: '2019-04-26', eraFilled: 'R' as const },
      { key: 5, date: '', eraFilled: null },
    ];
    expect(eraWarnings(rows, { referenceDate: '2024-12-31', today: '2026-11-15' })).toEqual([
      { key: 2, text: '前の行（R6.8.12）より古い' },
      { key: 3, text: '未来の日付' },
      { key: 3, text: '相続開始日（R6.12.31）より後' },
      { key: 4, text: '前の行（R9.1.1）より古い' },
      { key: 4, text: '令和の期間の外' },
    ]);
  });
});
