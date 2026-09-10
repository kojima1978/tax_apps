// 類似業種比準価額に使う業種目マスタ・業種目別株価等（APIから取得したもの）を引くための層。
//
// 帳票の入力は同期的に組み立てられる（業種目を選ぶと第4表のB/C/D・株価が即座に埋まる）ため、
// 起動時に全年分をまとめて取得し、以降の参照はすべてこの層でメモリ上から行う。

import { DEFAULT_ERA } from '@/lib/wareki';

export type IndustryLevel = 'LARGE' | 'MIDDLE' | 'SMALL';

export interface IndustryMonthlyPrice {
  year: number;
  month: number;
  price: number;
  /** 課税時期の属する月以前2年間の平均株価。課税時期になり得ない月には付かない。 */
  twoYearAveragePrice: number | null;
}

export interface IndustryCategory {
  number: number;
  largeName: string;
  middleName: string;
  smallName: string;
  name: string;
  level: IndustryLevel;
  /** B（配当金額）。10銭単位で公表される。 */
  dividend: number | null;
  /** C（利益金額） */
  profit: number | null;
  /** D（簿価純資産価額） */
  netAsset: number | null;
  /** 前年平均株価（令和8年分なら「令和7年平均」） */
  previousYearAveragePrice: number | null;
  monthlyPrices: IndustryMonthlyPrice[];
}

export interface IndustryYear {
  label: string;
  era: string;
  eraYear: number;
  gregorianYear: number;
  categories: IndustryCategory[];
}

export interface IndustryDatasetPayload {
  years: IndustryYear[];
}

/** 第1表の1の課税時期（f14_g / f14_y / f14_m）をそのまま渡す。 */
export interface TaxPeriod {
  era: string;
  eraYear: string;
  month: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

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

/** 西暦の年月。 */
export interface YearMonth {
  year: number;
  month: number;
}

/**
 * 月別株価の登録状況。
 *
 * 年分が登録されていても月別株価は毎月あとから追加されるので、課税時期が先の月だと
 * 株価欄だけが黙って空になる。それを画面で説明するために持つ。
 */
export interface IndustryPriceCoverage {
  /** 登録されている最終月。1件も無ければ undefined。 */
  readonly latest: YearMonth | undefined;
  /** 課税時期の月・前月・前々月のうち、株価が登録されていない月。月が未入力なら空。 */
  readonly missing: readonly YearMonth[];
}

/** ある年分に対する参照ビュー。課税時期の月まで込みで束ねてある。 */
export interface IndustryYearView {
  /** 参照している年分。データが1件も無ければ undefined。 */
  readonly year: IndustryYear | undefined;
  readonly options: SelectOption[];
  categoryOf(number: string): IndustryCategory | undefined;
  /** 帳票の類似業種欄に表示する、区分記号付きの業種名。 */
  displayNameOf(number: string): string;
  /** 評価通達181に基づく原則区分と、選択できる直上区分を返す。 */
  similarIndustryOptions(numbers: readonly string[]): SelectOption[];
  /** 第4表の2に転記する公表値。未公表の月は空文字を返す。 */
  metricValues(number: string): SimilarIndustryMetricValues;
  /** 課税時期の月の株価が引けるか。第4表の2のA欄が空になる理由を出すために使う。 */
  priceCoverage(): IndustryPriceCoverage;
}

export interface IndustryDataset {
  readonly years: readonly IndustryYear[];
  /** 課税時期に対応する年分のビュー。年分が登録されていなければ空のビューを返す。 */
  forTaxPeriod(period: TaxPeriod): IndustryYearView;
}

function optionLabel(category: IndustryCategory): string {
  const level = category.level === 'SMALL'
    ? '小分類'
    : category.level === 'MIDDLE'
      ? '中分類'
      : '大分類';
  const hierarchy = [category.largeName, category.middleName, category.smallName]
    .filter((name, index, names) => name !== '' && name !== names[index - 1])
    .join(' ＞ ');

  return `${category.number}　【${level}】${hierarchy || category.name}`;
}

/** 中分類は大分類が違えば同名がありうるので、大分類との組でキーにする。 */
function middlePathKey(largeName: string, middleName: string): string {
  return JSON.stringify([largeName, middleName]);
}

interface YearIndex {
  year: IndustryYear;
  byNumber: Map<string, IndustryCategory>;
  largeByName: Map<string, IndustryCategory>;
  middleByPath: Map<string, IndustryCategory>;
  options: SelectOption[];
}

function indexYear(year: IndustryYear): YearIndex {
  return {
    year,
    byNumber: new Map(year.categories.map((category) => [String(category.number), category])),
    largeByName: new Map(
      year.categories
        .filter((category) => category.level === 'LARGE')
        .map((category) => [category.largeName, category]),
    ),
    middleByPath: new Map(
      year.categories
        .filter((category) => category.level === 'MIDDLE')
        .map((category) => [middlePathKey(category.largeName, category.middleName), category]),
    ),
    options: [
      { value: '', label: '業種目を選択' },
      ...year.categories.map((category) => ({
        value: String(category.number),
        label: optionLabel(category),
      })),
    ],
  };
}

/** 課税時期の n か月前（年跨ぎを正しく扱う）。 */
function monthsBefore(year: number, month: number, back: number) {
  const shifted = new Date(Date.UTC(year, month - 1 - back, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

const EMPTY_VIEW: IndustryYearView = {
  year: undefined,
  options: [{ value: '', label: '業種目を選択' }],
  categoryOf: () => undefined,
  displayNameOf: () => '',
  similarIndustryOptions: () => [{ value: '', label: '類似業種を選択' }],
  metricValues: () => EMPTY_SIMILAR_INDUSTRY_METRICS,
  priceCoverage: () => ({ latest: undefined, missing: [] }),
};

/**
 * @param exactYear 課税時期の西暦年。元号・年が年分と一致したときだけ確定する。
 */
function createYearView(index: YearIndex, monthRaw: string, exactYear: number | null): IndustryYearView {
  const { year, byNumber, largeByName, middleByPath, options } = index;

  const taxMonth = Number(monthRaw.replace(/,/g, '').trim());
  const validMonth = Number.isInteger(taxMonth) && taxMonth >= 1 && taxMonth <= 12;

  /**
   * 課税時期の n か月前の株価行。
   *
   * 年が確定していれば西暦の年月でそのまま引く。未入力などで確定できないときは月だけで引き、
   * 同じ月が複数年に載っている場合はその年分自身の年を優先する
   * （令和8年分には前月・前々月用に令和7年11月分・12月分が併載されるため）。
   */
  const priceRow = (
    prices: readonly IndustryMonthlyPrice[],
    back: number,
  ): IndustryMonthlyPrice | undefined => {
    if (!validMonth) return undefined;

    if (exactYear !== null) {
      const at = monthsBefore(exactYear, taxMonth, back);
      return prices.find((price) => price.year === at.year && price.month === at.month);
    }

    const month = ((taxMonth - 1 - back + 12) % 12) + 1;
    const matches = prices.filter((price) => price.month === month);
    return matches.find((price) => price.year === year.gregorianYear) ?? matches[0];
  };

  /**
   * その年分に登録されている月（年月の昇順）。
   * 月別株価は業種目をまたいで同じ月がそろって入るので、全業種目をまとめて1本の暦として見る。
   * 全業種目を舐めるので、登録状況を聞かれたときだけ作って使い回す。
   */
  let monthsCache: IndustryMonthlyPrice[] | undefined;
  const registeredMonths = (): IndustryMonthlyPrice[] => {
    if (monthsCache !== undefined) return monthsCache;

    const byYearMonth = new Map<string, IndustryMonthlyPrice>();
    for (const category of year.categories) {
      for (const price of category.monthlyPrices) {
        const key = `${price.year}-${price.month}`;
        if (!byYearMonth.has(key)) byYearMonth.set(key, price);
      }
    }
    monthsCache = Array.from(byYearMonth.values())
      .sort((a, b) => a.year - b.year || a.month - b.month);
    return monthsCache;
  };

  return {
    year,
    options,

    categoryOf: (number) => byNumber.get(number),

    displayNameOf: (number) => {
      const category = byNumber.get(number);
      if (!category) return '';

      const level = category.level === 'SMALL' ? '小' : category.level === 'MIDDLE' ? '中' : '大';
      return `【${level}】${category.name}`;
    },

    similarIndustryOptions: (numbers) => {
      const candidates = new Map<number, IndustryCategory>();

      for (const number of numbers) {
        const category = byNumber.get(number);
        if (!category) continue;

        candidates.set(category.number, category);

        const parent = category.level === 'SMALL'
          ? middleByPath.get(middlePathKey(category.largeName, category.middleName))
          : category.level === 'MIDDLE'
            ? largeByName.get(category.largeName)
            : undefined;
        if (parent) candidates.set(parent.number, parent);
      }

      return [
        { value: '', label: '類似業種を選択' },
        ...Array.from(candidates.values(), (category) => ({
          value: String(category.number),
          label: optionLabel(category),
        })),
      ];
    },

    metricValues: (number) => {
      const category = byNumber.get(number);
      if (!category) return EMPTY_SIMILAR_INDUSTRY_METRICS;

      // B は「○円○銭」の2欄に分かれている。
      const dividend = category.dividend ?? 0;
      const bYen = Math.floor(dividend);
      const bSen = Math.round((dividend - bYen) * 100);

      const priceAt = (back: number) => {
        const row = priceRow(category.monthlyPrices, back);
        return row === undefined ? '' : String(row.price);
      };

      return {
        bYen: category.dividend === null ? '' : String(bYen),
        bSen: category.dividend === null ? '' : String(bSen).padStart(2, '0'),
        c: category.profit === null ? '' : String(category.profit),
        d: category.netAsset === null ? '' : String(category.netAsset),
        currentPrice: priceAt(0),
        previousPrice: priceAt(1),
        twoMonthsPreviousPrice: priceAt(2),
        previousYearAverage: category.previousYearAveragePrice === null
          ? ''
          : String(category.previousYearAveragePrice),
        twoYearAverage: String(priceRow(category.monthlyPrices, 0)?.twoYearAveragePrice ?? ''),
      };
    },

    priceCoverage: () => {
      const months = registeredMonths();
      const latest = months[months.length - 1];
      if (!validMonth) return { latest, missing: [] };

      // 引き方は株価欄と同じ priceRow に任せる。空になる欄と説明がずれないようにするため。
      const missing = [0, 1, 2]
        .filter((back) => priceRow(months, back) === undefined)
        .map((back) => (exactYear !== null
          ? monthsBefore(exactYear, taxMonth, back)
          : { year: year.gregorianYear, month: ((taxMonth - 1 - back + 12) % 12) + 1 }));

      return { latest, missing };
    },
  };
}

export function createIndustryDataset(payload: IndustryDatasetPayload): IndustryDataset {
  const indexes = payload.years
    .slice()
    .sort((a, b) => b.gregorianYear - a.gregorianYear)
    .map(indexYear);

  return {
    years: indexes.map(({ year }) => year),

    forTaxPeriod: ({ era, eraYear, month }) => {
      const wantedEraYear = Number(eraYear.trim());

      // 年が未入力のうちは年分を絞れない。業種目だけ先に選べるよう最新の年分で代替する
      // （年が確定していないので、株価は月だけで引く）。
      if (!Number.isInteger(wantedEraYear) || wantedEraYear <= 0) {
        const latest = indexes[0];
        return latest === undefined ? EMPTY_VIEW : createYearView(latest, month, null);
      }

      /*
        課税時期の年分が登録されていなければ何も返さない。

        以前は最新の年分で代替していたが、株価はその年分の標本会社を基に計算されるので、
        標本会社が入れ替わった業種目では同じ月でも年分によって金額が違う（公表資料の(注)のとおり）。
        実際、令和7年11月分は令和7年分の表と令和8年分の表で別の金額が載っている。
        業種目番号も年分ごとに振り直されるため、別の年分から借りた値は月と番号が合っていても中身が別物になる。

        しかも代替したことは画面に出ないので、気づかないまま誤った金額が転記される。
        それより空欄のほうが安全なので、株価だけでなく業種目の選択肢ごと出さない。
      */
      const matched = indexes.find(({ year }) => (
        year.era === (era.trim() || DEFAULT_ERA) && year.eraYear === wantedEraYear
      ));

      return matched === undefined
        ? EMPTY_VIEW
        : createYearView(matched, month, matched.year.gregorianYear);
    },
  };
}

/** データ取得前・取得失敗時に使う空のデータセット。 */
export const EMPTY_INDUSTRY_DATASET: IndustryDataset = createIndustryDataset({ years: [] });
