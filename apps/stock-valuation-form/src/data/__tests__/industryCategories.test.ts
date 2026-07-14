import { describe, expect, it } from 'vitest';
import { similarIndustryDisplayNameOf, similarIndustryOptions } from '../industryCategories';

describe('similarIndustryOptions', () => {
  it('offers a small category and its middle-category parent', () => {
    expect(similarIndustryOptions(['3'])).toEqual([
      { value: '', label: '類似業種を選択' },
      { value: '3', label: '3　【小分類】建設業 ＞ 総合工事業 ＞ 建築工事業（木造建築工事業を除く）' },
      { value: '2', label: '2　【中分類】建設業 ＞ 総合工事業' },
    ]);
  });

  it('offers a middle category and its large-category parent', () => {
    expect(similarIndustryOptions(['2']).map(({ value }) => value)).toEqual(['', '2', '1']);
  });

  it('combines candidates without duplicates for multiple selected businesses', () => {
    expect(similarIndustryOptions(['3', '4', '']).map(({ value }) => value)).toEqual(['', '3', '2', '4']);
  });

  it('adds a compact classification marker to the on-form industry name', () => {
    expect(similarIndustryDisplayNameOf('1')).toBe('【大】建設業');
    expect(similarIndustryDisplayNameOf('2')).toBe('【中】総合工事業');
    expect(similarIndustryDisplayNameOf('3')).toBe('【小】建築工事業（木造建築工事業を除く）');
  });
});
