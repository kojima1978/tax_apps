import { describe, expect, it } from 'vitest';
import { TEST_INDUSTRY_DATASET } from './industryFixture';

const viewOf = (era: string, eraYear: string, month: string) =>
  TEST_INDUSTRY_DATASET.forTaxPeriod({ era, eraYear, month });

describe('業種目マスタ', () => {
  it('公表どおり115業種目を持つ', () => {
    const view = viewOf('令和', '8', '4');
    const numbers = TEST_INDUSTRY_DATASET.years[0]!.categories.map(({ number }) => number);

    expect(numbers).toHaveLength(115);
    expect(new Set(numbers).size).toBe(115);
    expect(view.categoryOf('115')?.name).toBe('その他の産業');
    expect(view.categoryOf('999')).toBeUndefined();
  });

  it('帳票の類似業種欄には区分記号付きの業種名を出す', () => {
    const view = viewOf('令和', '8', '4');

    expect(view.displayNameOf('1')).toBe('【大】建設業');
    expect(view.displayNameOf('2')).toBe('【中】総合工事業');
    expect(view.displayNameOf('3')).toBe('【小】建築工事業（木造建築工事業を除く）');
    expect(view.displayNameOf('999')).toBe('');
  });
});

describe('類似業種の選択肢', () => {
  const view = viewOf('令和', '8', '4');

  it('小分類とその中分類（直上区分）を候補にする', () => {
    expect(view.similarIndustryOptions(['3'])).toEqual([
      { value: '', label: '類似業種を選択' },
      { value: '3', label: '3　【小分類】建設業 ＞ 総合工事業 ＞ 建築工事業（木造建築工事業を除く）' },
      { value: '2', label: '2　【中分類】建設業 ＞ 総合工事業' },
    ]);
  });

  it('中分類とその大分類（直上区分）を候補にする', () => {
    expect(view.similarIndustryOptions(['2']).map(({ value }) => value)).toEqual(['', '2', '1']);
  });

  it('複数の業種目を選んでも候補は重複しない', () => {
    expect(view.similarIndustryOptions(['3', '4', '']).map(({ value }) => value)).toEqual(['', '3', '2', '4']);
  });
});

describe('業種目別株価等の転記値', () => {
  it('課税時期の属する月・前月・前々月の株価を引く', () => {
    expect(viewOf('令和', '8', '4').metricValues('1')).toEqual({
      bYen: '14',
      bSen: '30',
      c: '75',
      d: '595',
      currentPrice: '763',
      previousPrice: '785',
      twoMonthsPreviousPrice: '812',
      previousYearAverage: '579',
      twoYearAverage: '579',
    });
  });

  it('前月・前々月が前年にまたがっても引ける', () => {
    expect(viewOf('令和', '8', '1').metricValues('1')).toMatchObject({
      currentPrice: '756',
      previousPrice: '708',
      twoMonthsPreviousPrice: '681',
      twoYearAverage: '540',
    });
  });

  it('未公表の月は空欄のままにする', () => {
    expect(viewOf('令和', '8', '5').metricValues('1')).toMatchObject({
      currentPrice: '',
      previousPrice: '763',
      twoMonthsPreviousPrice: '785',
      twoYearAverage: '',
    });
  });

  it('業種目が未選択・未登録なら全欄が空になる', () => {
    expect(viewOf('令和', '8', '4').metricValues('')).toEqual({
      bYen: '', bSen: '', c: '', d: '',
      currentPrice: '', previousPrice: '', twoMonthsPreviousPrice: '',
      previousYearAverage: '', twoYearAverage: '',
    });
  });

  it('課税時期の年が未入力でも月だけで引ける', () => {
    expect(viewOf('', '', '4').metricValues('1')).toMatchObject({
      currentPrice: '763',
      previousPrice: '785',
      twoMonthsPreviousPrice: '812',
    });
  });

  it('未登録の年分を指したときは最新の年分で代替する', () => {
    expect(viewOf('令和', '9', '4').year?.label).toBe('令和8年分');
  });
});
