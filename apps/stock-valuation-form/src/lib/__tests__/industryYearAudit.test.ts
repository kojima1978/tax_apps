import { describe, expect, it } from 'vitest';
import {
  createIndustryDataset,
  type IndustryCategory,
  type IndustryLevel,
} from '@/data/industryDataset';
import { industryYearDiffs, syncIndustryStamps } from '@/lib/industryYearAudit';
import type { TableId } from '@/types/form';

/*
  国税庁が業種目番号を振り直した年分を模した2年分。
  令和9年分では番号47の中身が「化学工業」から「石油製品・石炭製品製造業」へ入れ替わり、
  「化学工業」は番号48へ移り、番号99は廃止されている。
*/
const category = (
  number: number,
  largeName: string,
  middleName: string,
  level: IndustryLevel,
): IndustryCategory => ({
  number,
  largeName,
  middleName,
  smallName: '',
  name: middleName || largeName,
  level,
  dividend: 5,
  profit: 50,
  netAsset: 500,
  previousYearAveragePrice: 400,
  monthlyPrices: [],
});

const dataset = createIndustryDataset({
  years: [
    {
      label: '令和8年分',
      era: '令和',
      eraYear: 8,
      gregorianYear: 2026,
      categories: [
        category(1, '建設業', '', 'LARGE'),
        category(47, '製造業', '化学工業', 'MIDDLE'),
        category(52, '製造業', '石油製品・石炭製品製造業', 'MIDDLE'),
        category(99, '製造業', '廃止予定業', 'MIDDLE'),
      ],
    },
    {
      label: '令和9年分',
      era: '令和',
      eraYear: 9,
      gregorianYear: 2027,
      categories: [
        category(1, '建設業', '', 'LARGE'),
        category(47, '製造業', '石油製品・石炭製品製造業', 'MIDDLE'),
        category(48, '製造業', '化学工業', 'MIDDLE'),
      ],
    },
  ],
});

const makeGetField = (data: Partial<Record<TableId, Record<string, string>>>) =>
  (table: TableId, field: string) => data[table]?.[field] ?? '';

/** 課税時期を令和9年4月に置いた帳票。 */
const inR9 = (table1_1: Record<string, string>, table4: Record<string, string> = {}) =>
  makeGetField({
    table1_1: { f14_g: '令和', f14_y: '9', f14_m: '4', ...table1_1 },
    table4,
  });

describe('industryYearDiffs', () => {
  it('控えが課税時期の年分と同じなら何も出さない', () => {
    expect(industryYearDiffs(inR9({ f23: '47', f23_year: '2027' }), dataset)).toEqual([]);
  });

  it('番号は同じでも業種目が入れ替わっていれば拾い、付け替え先を示す', () => {
    const diffs = industryYearDiffs(inR9({ f23: '47', f23_year: '2026' }), dataset);

    expect(diffs).toHaveLength(1);
    expect(diffs[0]?.from.year.label).toBe('令和8年分');
    expect(diffs[0]?.from.category.name).toBe('化学工業');
    expect(diffs[0]?.toYear.label).toBe('令和9年分');
    expect(diffs[0]?.to?.name).toBe('石油製品・石炭製品製造業');
    // 同じ分類は令和9年分では番号48になっている
    expect(diffs[0]?.replacement?.number).toBe(48);
  });

  it('業種目が変わっていない番号は拾わない', () => {
    expect(industryYearDiffs(inR9({ f23: '1', f23_year: '2026' }), dataset)).toEqual([]);
  });

  it('番号ごと廃止されていれば、当年分の業種目なしとして拾う', () => {
    const diffs = industryYearDiffs(inR9({ f23: '99', f23_year: '2026' }), dataset);

    expect(diffs).toHaveLength(1);
    expect(diffs[0]?.to).toBeUndefined();
    expect(diffs[0]?.replacement).toBeUndefined();
  });

  it('控えが無い欄は拾わない（どの年分から選んだか分からないため）', () => {
    expect(industryYearDiffs(inR9({ f23: '47' }), dataset)).toEqual([]);
  });

  it('第4表の2の類似業種も同じように拾う', () => {
    const diffs = industryYearDiffs(
      inR9({}, { r1gyonum: '47', r1gyonum_year: '2026' }),
      dataset,
    );

    expect(diffs).toHaveLength(1);
    expect(diffs[0]?.target.field).toBe('r1gyonum');
    expect(diffs[0]?.target.tab).toBe('table4_2');
  });

  it('課税時期の年分が未登録なら照合しない（欄がすべて空になるため）', () => {
    const getField = makeGetField({
      table1_1: { f14_g: '令和', f14_y: '10', f14_m: '4', f23: '47', f23_year: '2026' },
    });

    expect(industryYearDiffs(getField, dataset)).toEqual([]);
  });

  it('控えの年分がもう登録されていなければ照合しない', () => {
    expect(industryYearDiffs(inR9({ f23: '47', f23_year: '2020' }), dataset)).toEqual([]);
  });
});

describe('syncIndustryStamps', () => {
  it('控えが無い欄には課税時期の年分を控える（古い保存データの救済）', () => {
    expect(syncIndustryStamps(inR9({ f23: '47' }), dataset))
      .toEqual([expect.objectContaining({ stamp: '2027' })]);
  });

  it('業種目が変わっていなければ控えを当年分へ進める', () => {
    expect(syncIndustryStamps(inR9({ f23: '1', f23_year: '2026' }), dataset))
      .toEqual([expect.objectContaining({ stamp: '2027' })]);
  });

  it('業種目が入れ替わっている欄の控えは進めない（確認の対象として残す）', () => {
    expect(syncIndustryStamps(inR9({ f23: '47', f23_year: '2026' }), dataset)).toEqual([]);
  });

  it('番号が当年分に無ければ控えは触らない', () => {
    expect(syncIndustryStamps(inR9({ f23: '99', f23_year: '2026' }), dataset)).toEqual([]);
  });

  it('番号を消したら控えも消す', () => {
    expect(syncIndustryStamps(inR9({ f23: '', f23_year: '2026' }), dataset))
      .toEqual([expect.objectContaining({ stamp: '' })]);
  });

  it('年分が未登録のうちは控えを触らない', () => {
    const getField = makeGetField({
      table1_1: { f14_g: '令和', f14_y: '10', f14_m: '4', f23: '47', f23_year: '2026' },
    });

    expect(syncIndustryStamps(getField, dataset)).toEqual([]);
  });
});
