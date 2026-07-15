import rawIndustryValuationMetrics from './industryValuationMetrics.json';

export interface IndustryValuationMetrics {
  番号: number;
  B: number;
  C: number;
  D: number;
  令和７年平均: number;
  令和７年１１月分: number;
  令和７年１２月分: number;
  令和８年１月分: number;
  令和８年２月分: number;
  令和８年３月分: number;
  令和８年４月分: number;
  課税時期の属する月以前２年間の平均株価: Partial<Record<MonthlyPriceKey, number>>;
}

export const INDUSTRY_VALUATION_METRICS =
  rawIndustryValuationMetrics as IndustryValuationMetrics[];

const METRICS_BY_NUMBER = new Map(
  INDUSTRY_VALUATION_METRICS.map((metrics) => [String(metrics.番号), metrics]),
);

export function industryValuationMetricsOf(
  number: string,
): IndustryValuationMetrics | undefined {
  return METRICS_BY_NUMBER.get(number);
}

type MonthlyPriceKey =
  | '令和７年１１月分'
  | '令和７年１２月分'
  | '令和８年１月分'
  | '令和８年２月分'
  | '令和８年３月分'
  | '令和８年４月分';

const MONTHLY_PRICE_KEYS: Readonly<Partial<Record<number, MonthlyPriceKey>>> = {
  1: '令和８年１月分',
  2: '令和８年２月分',
  3: '令和８年３月分',
  4: '令和８年４月分',
  11: '令和７年１１月分',
  12: '令和７年１２月分',
};

export interface SimilarIndustryMetricValues {
  bYen: string;
  bSen: string;
  c: string;
  d: string;
  currentPrice: string;
  previousPrice: string;
  twoMonthsPreviousPrice: string;
  previousYearAverage: string;
  twoYearAverage: string;
}

const EMPTY_SIMILAR_INDUSTRY_METRICS: SimilarIndustryMetricValues = {
  bYen: '',
  bSen: '',
  c: '',
  d: '',
  currentPrice: '',
  previousPrice: '',
  twoMonthsPreviousPrice: '',
  previousYearAverage: '',
  twoYearAverage: '',
};

function priceForMonth(
  metrics: IndustryValuationMetrics,
  month: number,
): string {
  const key = MONTHLY_PRICE_KEYS[month];
  return key ? String(metrics[key]) : '';
}

/** 第4表の2に表示する公表値。月別株価は令和8年分PDFに掲載済みの月だけを返す。 */
export function similarIndustryMetricValues(
  number: string,
  taxMonthRaw: string,
): SimilarIndustryMetricValues {
  const metrics = industryValuationMetricsOf(number);
  if (!metrics) return EMPTY_SIMILAR_INDUSTRY_METRICS;

  const taxMonth = Number(taxMonthRaw.replace(/,/g, '').trim());
  const validMonth = Number.isInteger(taxMonth) && taxMonth >= 1 && taxMonth <= 12;
  const monthBefore = (back: number) => ((taxMonth - 1 - back + 12) % 12) + 1;
  const bYen = Math.floor(metrics.B);
  const bSen = Math.round((metrics.B - bYen) * 100);

  return {
    bYen: String(bYen),
    bSen: String(bSen).padStart(2, '0'),
    c: String(metrics.C),
    d: String(metrics.D),
    currentPrice: validMonth ? priceForMonth(metrics, monthBefore(0)) : '',
    previousPrice: validMonth ? priceForMonth(metrics, monthBefore(1)) : '',
    twoMonthsPreviousPrice: validMonth ? priceForMonth(metrics, monthBefore(2)) : '',
    previousYearAverage: String(metrics.令和７年平均),
    twoYearAverage: validMonth
      ? String(metrics.課税時期の属する月以前２年間の平均株価[MONTHLY_PRICE_KEYS[taxMonth]!] ?? '')
      : '',
  };
}
