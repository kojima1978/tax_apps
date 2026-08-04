// テスト用の業種目データセット。
//
// 本番は API（DB）から取得するが、テストでは国税庁の公表値をそのまま持つ
// src/data/*.json（サーバのseedと同じ原本）から組み立てて、期待値を実データに合わせる。

import rawCategories from '../industryCategories.json';
import rawMetrics from '../industryValuationMetrics.json';
import {
  createIndustryDataset,
  type IndustryCategory,
  type IndustryDataset,
  type IndustryLevel,
  type IndustryMonthlyPrice,
} from '../industryDataset';

interface RawCategory {
  大分類: string;
  中分類: string;
  小分類: string;
  名前: string;
  番号: number;
  内容: string;
}

interface RawMetrics {
  番号: number;
  B: number;
  C: number;
  D: number;
  課税時期の属する月以前２年間の平均株価: Record<string, number>;
  [key: string]: number | Record<string, number>;
}

const ERA_BASE_YEAR: Readonly<Record<string, number>> = { 令和: 2018, 平成: 1988, 昭和: 1925 };
const FULLWIDTH_DIGITS = '０１２３４５６７８９';

const toHalfWidth = (value: string) =>
  value.replace(/[０-９]/g, (digit) => String(FULLWIDTH_DIGITS.indexOf(digit)));

/** 「令和８年１月分」→ { year: 2026, month: 1 }。月分以外のキーは undefined。 */
function parseMonthKey(key: string): { year: number; month: number } | undefined {
  const matched = /^(令和|平成|昭和)([０-９]+)年([０-９]+)月分$/.exec(key);
  if (!matched) return undefined;

  const base = ERA_BASE_YEAR[matched[1]!];
  if (base === undefined) return undefined;

  return {
    year: base + Number(toHalfWidth(matched[2]!)),
    month: Number(toHalfWidth(matched[3]!)),
  };
}

/** 「令和７年平均」→ 前年平均株価。 */
function isPreviousYearAverageKey(key: string) {
  return /^(令和|平成|昭和)[０-９]+年平均$/.test(key);
}

function monthlyPricesOf(metrics: RawMetrics): IndustryMonthlyPrice[] {
  const twoYearAverages = metrics.課税時期の属する月以前２年間の平均株価;

  return Object.entries(metrics).flatMap(([key, value]) => {
    const at = parseMonthKey(key);
    if (!at || typeof value !== 'number') return [];

    return [{
      ...at,
      price: value,
      twoYearAveragePrice: twoYearAverages[key] ?? null,
    }];
  });
}

function levelOf(category: RawCategory): IndustryLevel {
  if (category.小分類 !== '') return 'SMALL';
  if (category.中分類 !== '') return 'MIDDLE';
  return 'LARGE';
}

const METRICS_BY_NUMBER = new Map(
  (rawMetrics as RawMetrics[]).map((metrics) => [metrics.番号, metrics]),
);

const categories: IndustryCategory[] = (rawCategories as RawCategory[]).map((category) => {
  const metrics = METRICS_BY_NUMBER.get(category.番号);
  const previousYearAverageKey = metrics === undefined
    ? undefined
    : Object.keys(metrics).find(isPreviousYearAverageKey);

  return {
    number: category.番号,
    largeName: category.大分類,
    middleName: category.中分類,
    smallName: category.小分類,
    name: category.名前,
    level: levelOf(category),
    dividend: metrics?.B ?? null,
    profit: metrics?.C ?? null,
    netAsset: metrics?.D ?? null,
    previousYearAveragePrice: previousYearAverageKey === undefined
      ? null
      : (metrics![previousYearAverageKey] as number),
    monthlyPrices: metrics === undefined ? [] : monthlyPricesOf(metrics),
  };
});

/** 令和8年分（`src/data/*.json` の内容）だけを持つデータセット。 */
export const TEST_INDUSTRY_DATASET: IndustryDataset = createIndustryDataset({
  years: [{
    label: '令和8年分',
    era: '令和',
    eraYear: 8,
    gregorianYear: 2026,
    categories,
  }],
});
