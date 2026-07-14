import { describe, expect, it } from 'vitest';
import { similarIndustryOptions } from '../industryCategories';

describe('similarIndustryOptions', () => {
  it('offers a small category and its middle-category parent', () => {
    expect(similarIndustryOptions(['3'])).toEqual([
      { value: '', label: '類似業種を選択' },
      { value: '3', label: '3　建設業 ＞ 総合工事業 ＞ 建築工事業（木造建築工事業を除く）' },
      { value: '2', label: '2　建設業 ＞ 総合工事業' },
    ]);
  });

  it('offers a middle category and its large-category parent', () => {
    expect(similarIndustryOptions(['2']).map(({ value }) => value)).toEqual(['', '2', '1']);
  });

  it('combines candidates without duplicates for multiple selected businesses', () => {
    expect(similarIndustryOptions(['3', '4', '']).map(({ value }) => value)).toEqual(['', '3', '2', '4']);
  });
});
