import { describe, expect, it } from 'vitest';
import { INDUSTRY_CATEGORIES } from '../industryCategories';
import {
  INDUSTRY_VALUATION_METRICS,
  industryValuationMetricsOf,
  similarIndustryMetricValues,
} from '../industryValuationMetrics';

describe('industryValuationMetrics', () => {
  it('contains one unique metrics row for every basic industry row', () => {
    const categoryNumbers = INDUSTRY_CATEGORIES.map(({ 番号 }) => 番号);
    const metricsNumbers = INDUSTRY_VALUATION_METRICS.map(({ 番号 }) => 番号);

    expect(metricsNumbers).toHaveLength(115);
    expect(new Set(metricsNumbers).size).toBe(115);
    expect(metricsNumbers).toEqual(categoryNumbers);
  });

  it('keeps B, C, D and monthly prices keyed by industry number', () => {
    expect(industryValuationMetricsOf('1')).toEqual({
      番号: 1,
      B: 14.3,
      C: 75,
      D: 595,
      令和７年平均: 579,
      令和７年１１月分: 681,
      令和７年１２月分: 708,
      令和８年１月分: 756,
      令和８年２月分: 812,
      令和８年３月分: 785,
      令和８年４月分: 763,
      課税時期の属する月以前２年間の平均株価: {
        令和８年１月分: 540,
        令和８年２月分: 554,
        令和８年３月分: 567,
        令和８年４月分: 579,
      },
    });
    expect(industryValuationMetricsOf('59')?.令和８年４月分).toBe(540);
    expect(industryValuationMetricsOf('115')?.令和８年４月分).toBe(655);
  });

  it('returns undefined for an unknown industry number', () => {
    expect(industryValuationMetricsOf('999')).toBeUndefined();
  });

  it('maps the tax month and preceding months to the published prices', () => {
    expect(similarIndustryMetricValues('1', '4')).toEqual({
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
    expect(similarIndustryMetricValues('1', '1')).toMatchObject({
      currentPrice: '756',
      previousPrice: '708',
      twoMonthsPreviousPrice: '681',
      twoYearAverage: '540',
    });
  });

  it('leaves an unpublished monthly price blank', () => {
    expect(similarIndustryMetricValues('1', '5')).toMatchObject({
      currentPrice: '',
      previousPrice: '763',
      twoMonthsPreviousPrice: '785',
      twoYearAverage: '',
    });
  });
});
