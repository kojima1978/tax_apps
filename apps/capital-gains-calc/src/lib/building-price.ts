/**
 * 建物の取得価額の算出（土地建物を一括で取得した場合の区分）
 *
 * 中古住宅を土地建物まとめて購入していると、契約書に建物の価額が書かれていないことがある。
 * その場合でも譲渡所得の計算では建物だけを減価償却するため、合計額を土地と建物に分ける必要がある。
 *
 * 国税庁が示す優先順位は次のとおりで、上から順に使えるものを使う。
 *   ① 契約書等で土地と建物の価額が区分されている → そのまま使う（直接入力）
 *   ② 建物に係る消費税額が分かる → 税率で割り戻して建物の価額を求める
 *   ③ どちらも不明 → 「建物の標準的な建築価額表」で建物の価額を算定する
 * 固定資産税評価額による按分は法令上の定めではないが、実務で広く使われるので選択肢に入れている。
 */

import { calcNonBusinessDepreciation, elapsedYearsForDepreciation, type BuildingUsage } from './capital-gains';
import { findStructure } from './tax-rates';
import { formatCurrency, formatYen } from './utils';

/** 建物の取得価額の求め方 */
export type BuildingPriceMethod = 'direct' | 'tax' | 'assessed' | 'table';

/** 選択肢は優先順位の高い順に並べる（トグルの並びがそのまま優先順位の説明になる） */
export const BUILDING_PRICE_METHODS: { value: BuildingPriceMethod; label: string; hint: string }[] = [
    {
        value: 'direct',
        label: '直接入力',
        hint: '契約書等で土地と建物の価額が区分されている場合は、その金額をそのまま入力します。',
    },
    {
        value: 'tax',
        label: '消費税から逆算',
        hint: '契約書に建物の消費税額の記載がある場合は、税率で割り戻して建物の価額を求めます（土地は非課税なので消費税は建物の分だけです）。',
    },
    {
        value: 'assessed',
        label: '固定資産税評価額で按分',
        hint: '土地・建物それぞれの固定資産税評価額の比で合計額を按分します。法令上の定めはありませんが、契約書に記載がない場合の区分方法として実務で広く使われます。',
    },
    {
        value: 'table',
        label: '建築価額表から算出',
        hint: '国税庁「建物の標準的な建築価額表」の単価×床面積で新築時の価額を求め、購入時までの償却費を差し引きます。契約書で区分されている場合や消費税額から割り戻せる場合は使いません。',
    },
];

// ============================================================
// 建物の標準的な建築価額表
// ============================================================

/** 建築価額表の構造区分（表の列）。減価償却の構造区分より粗い4区分しかない */
export const CONSTRUCTION_STRUCTURES = [
    { key: 'wood', label: '木造・木骨モルタル造' },
    { key: 'src', label: '鉄骨鉄筋コンクリート造' },
    { key: 'rc', label: '鉄筋コンクリート造' },
    { key: 'steel', label: '鉄骨造' },
] as const;

export type ConstructionStructureKey = (typeof CONSTRUCTION_STRUCTURES)[number]['key'];

/**
 * 建物の標準的な建築価額表（単位: 千円/㎡）
 *
 * 出典: 国税庁「譲渡所得の申告のしかた」付表。
 * 「建築着工統計（国土交通省）」の工事費予定額÷床面積の合計から求めた1㎡当たりの単価。
 * 値の並びは CONSTRUCTION_STRUCTURES と同じ順（木造／鉄骨鉄筋／鉄筋／鉄骨）。
 */
const CONSTRUCTION_UNIT_PRICES: Record<number, readonly [number, number, number, number]> = {
    1959: [8.7, 34.1, 20.2, 13.7],
    1960: [9.1, 30.9, 21.4, 13.4],
    1961: [10.3, 39.5, 23.9, 14.9],
    1962: [12.2, 40.9, 27.2, 15.9],
    1963: [13.5, 41.3, 27.1, 14.6],
    1964: [15.1, 49.1, 29.5, 16.6],
    1965: [16.8, 45.0, 30.3, 17.9],
    1966: [18.2, 42.4, 30.6, 17.8],
    1967: [19.9, 43.6, 33.7, 19.6],
    1968: [22.2, 48.6, 36.2, 21.7],
    1969: [24.9, 50.9, 39.0, 23.6],
    1970: [28.0, 54.3, 42.9, 26.1],
    1971: [31.2, 61.2, 47.2, 30.3],
    1972: [34.2, 61.6, 50.2, 32.4],
    1973: [45.3, 77.6, 64.3, 42.2],
    1974: [61.8, 113.0, 90.1, 55.7],
    1975: [67.7, 126.4, 97.4, 60.5],
    1976: [70.3, 114.6, 98.2, 62.1],
    1977: [74.1, 121.8, 102.0, 65.3],
    1978: [77.9, 122.4, 105.9, 70.1],
    1979: [82.5, 128.9, 114.3, 75.4],
    1980: [92.5, 149.4, 129.7, 84.1],
    1981: [98.3, 161.8, 138.7, 91.7],
    1982: [101.3, 170.9, 143.0, 93.9],
    1983: [102.2, 168.0, 143.8, 94.3],
    1984: [102.8, 161.2, 141.7, 95.3],
    1985: [104.2, 172.2, 144.5, 96.9],
    1986: [106.2, 181.9, 149.5, 102.6],
    1987: [110.0, 191.8, 156.6, 108.4],
    1988: [116.5, 203.6, 175.0, 117.3],
    1989: [123.1, 237.3, 193.3, 128.4],
    1990: [131.7, 286.7, 222.9, 147.4],
    1991: [137.6, 329.8, 246.8, 158.7],
    1992: [143.5, 333.7, 245.6, 162.4],
    1993: [150.9, 300.3, 227.5, 159.2],
    1994: [156.6, 262.9, 212.8, 148.4],
    1995: [158.3, 228.8, 199.0, 143.2],
    1996: [161.0, 229.7, 198.0, 143.6],
    1997: [160.5, 223.0, 201.0, 141.0],
    1998: [158.6, 225.6, 203.8, 138.7],
    1999: [159.3, 220.9, 197.9, 139.4],
    2000: [159.0, 204.3, 182.6, 132.3],
    2001: [157.2, 186.1, 177.8, 136.4],
    2002: [153.6, 195.2, 180.5, 135.0],
    2003: [152.7, 187.3, 179.5, 131.4],
    2004: [152.1, 190.1, 176.1, 130.6],
    2005: [151.9, 185.7, 171.5, 132.8],
    2006: [152.9, 170.5, 178.6, 133.7],
    2007: [153.6, 182.5, 185.8, 135.6],
    2008: [156.0, 229.1, 206.1, 158.3],
    2009: [156.6, 265.2, 219.0, 169.5],
    2010: [156.5, 226.4, 205.9, 163.0],
    2011: [156.8, 238.4, 197.0, 158.9],
    2012: [157.6, 223.3, 193.9, 155.6],
    2013: [159.9, 258.5, 203.8, 164.3],
    2014: [163.0, 276.2, 228.0, 176.4],
    2015: [165.4, 262.2, 240.2, 197.3],
    2016: [165.9, 308.3, 254.2, 204.1],
    2017: [166.7, 350.4, 265.5, 214.6],
    2018: [168.5, 304.2, 263.1, 214.1],
    2019: [170.1, 363.3, 285.6, 228.8],
    2020: [172.0, 279.2, 276.9, 230.2],
    2021: [172.2, 338.4, 288.2, 227.3],
    2022: [176.2, 434.4, 277.5, 241.5],
    2023: [204.1, 366.7, 314.3, 281.1],
};

const CONSTRUCTION_YEARS = Object.keys(CONSTRUCTION_UNIT_PRICES).map(Number);

/** 表に載っている建築年の範囲 */
export const CONSTRUCTION_YEAR_MIN = Math.min(...CONSTRUCTION_YEARS);
export const CONSTRUCTION_YEAR_MAX = Math.max(...CONSTRUCTION_YEARS);

/**
 * 西暦を和暦の年表記にする。
 * 改元の年は表の見出しに合わせ、1989年は「平成元年」、2019年は「令和元年」とする。
 */
export const eraLabel = (year: number): string => {
    if (year >= 2019) return year === 2019 ? '令和元年' : `令和${year - 2018}年`;
    if (year >= 1989) return year === 1989 ? '平成元年' : `平成${year - 1988}年`;
    return `昭和${year - 1925}年`;
};

/** 建築年・構造から1㎡当たりの建築単価（円）を引く。表にない年は null */
export const constructionUnitPrice = (year: number, structure: ConstructionStructureKey): number | null => {
    const row = CONSTRUCTION_UNIT_PRICES[year];
    if (!row) return null;
    const index = CONSTRUCTION_STRUCTURES.findIndex((s) => s.key === structure);
    // 表は千円単位。0.1千円の桁があるので掛けた後に丸めて円にする
    return Math.round(row[index < 0 ? 0 : index] * 1000);
};

const constructionStructureLabel = (key: ConstructionStructureKey): string =>
    CONSTRUCTION_STRUCTURES.find((s) => s.key === key)?.label ?? CONSTRUCTION_STRUCTURES[0].label;

// ============================================================
// 消費税率
// ============================================================

/** 消費税率の推移。建物の価額を割り戻す・按分するときに使う */
export const CONSUMPTION_TAX_OPTIONS = [
    { value: '0.1', rate: 0.1, label: '10%（令和元年10月1日以後）', from: '2019-10-01' },
    { value: '0.08', rate: 0.08, label: '8%（平成26年4月1日〜令和元年9月30日）', from: '2014-04-01' },
    { value: '0.05', rate: 0.05, label: '5%（平成9年4月1日〜平成26年3月31日）', from: '1997-04-01' },
    { value: '0.03', rate: 0.03, label: '3%（平成元年4月1日〜平成9年3月31日）', from: '1989-04-01' },
    { value: '0', rate: 0, label: '消費税なし（個人間の売買など）', from: '' },
] as const;

/**
 * 取得日から適用税率の既定値を選ぶ。
 * 税率の引上げ時には旧税率が使える経過措置（指定日までの契約）があるので、
 * あくまで既定値であり、契約内容によっては手で選び直す。
 */
export const guessConsumptionTaxRate = (date: string): string => {
    if (!date) return '0.1';
    const found = CONSUMPTION_TAX_OPTIONS.find((o) => o.from && date >= o.from);
    return found?.value ?? '0';
};

const ratePercentLabel = (rate: number): string => `${Math.round(rate * 1000) / 10}%`;

// ============================================================
// 面積の入力
// ============================================================

/** 面積の入力値を半角の数字と小数点だけにする（入力途中の「12.」も壊さない） */
export const formatAreaInput = (value: string): string =>
    value
        .replace(/[０-９．]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
        .replace(/[^0-9.]/g, '');

/** 面積の入力値を数値にする */
export const parseArea = (value: string): number => {
    const num = Number.parseFloat(formatAreaInput(value));
    return Number.isNaN(num) ? 0 : num;
};

// ============================================================
// 算出
// ============================================================

export type BuildingPriceInput = {
    method: BuildingPriceMethod;
    /** 土地建物の合計取得価額（消費税込み） */
    totalCost: number;
    /** 適用消費税率（消費税から逆算・固定資産税評価額で按分で使う） */
    taxRate: number;
    /** 建物に係る消費税額 */
    consumptionTax: number;
    /** 固定資産税評価額 */
    landAssessedValue: number;
    buildingAssessedValue: number;
    /** 新築年月日（建築価額表の年と、購入時までの経過年数の両方に使う） */
    builtDate: string;
    /** 購入日 */
    acquisitionDate: string;
    /** 建築価額表の構造区分 */
    constructionStructure: ConstructionStructureKey;
    /** 延べ床面積（㎡） */
    floorArea: number;
    /** 減価償却の構造区分（償却率を引くのに使う） */
    structureKey: string;
    buildingUsage: BuildingUsage;
};

/** 算出過程の1行。UI にそのまま並べる */
export type BuildingPriceStep = { label: string; value: string };

export type BuildingPriceResult = {
    /** 必要な入力がそろって算出できたか */
    resolved: boolean;
    /** 建物の取得価額（購入時・消費税込み） */
    buildingCost: number;
    /** 土地の取得価額 */
    landCost: number;
    steps: BuildingPriceStep[];
    /** 入力不足・注意点 */
    warnings: string[];
    /** 計算上の補足へ回す1行サマリ */
    basis: string;
};

const EMPTY_RESULT: BuildingPriceResult = {
    resolved: false,
    buildingCost: 0,
    landCost: 0,
    steps: [],
    warnings: [],
    basis: '',
};

const unresolved = (...warnings: string[]): BuildingPriceResult => ({ ...EMPTY_RESULT, warnings });

/**
 * 土地は合計から建物を引いた残り。建物が合計を超えたら0で止めて注意を出す。
 * 合計が未入力のうちは「超えている」ではなく入力待ちなので、注意は出さない。
 */
const splitLand = (totalCost: number, buildingCost: number, warnings: string[]): number => {
    if (totalCost <= 0) return 0;
    if (buildingCost > totalCost) {
        warnings.push(
            `算出した建物の取得価額（${formatYen(buildingCost)}）が合計取得価額を超えています。入力内容を確認してください。`,
        );
        return 0;
    }
    return totalCost - buildingCost;
};

/** 消費税から逆算する（土地は非課税なので、消費税額はすべて建物に対応する） */
const fromConsumptionTax = (input: BuildingPriceInput): BuildingPriceResult => {
    if (input.consumptionTax <= 0 || input.taxRate <= 0) {
        return unresolved('建物に係る消費税額と、契約時の消費税率を入力してください。');
    }

    const netCost = Math.floor(input.consumptionTax / input.taxRate);
    const buildingCost = netCost + input.consumptionTax;
    const warnings: string[] = [];
    const landCost = splitLand(input.totalCost, buildingCost, warnings);

    return {
        resolved: true,
        buildingCost,
        landCost,
        steps: [
            { label: '① 建物に係る消費税額', value: formatYen(input.consumptionTax) },
            { label: '② 適用消費税率', value: ratePercentLabel(input.taxRate) },
            { label: '③ 建物の価額（税抜 ①÷②）', value: formatYen(netCost) },
            { label: '④ 建物の取得価額（③＋①）', value: formatYen(buildingCost) },
            { label: '⑤ 土地の取得価額（合計−④）', value: formatYen(landCost) },
        ],
        warnings,
        basis: `建物の取得価額は、契約書に記載された建物の消費税額 ${formatYen(input.consumptionTax)} を税率 ${ratePercentLabel(input.taxRate)} で割り戻して算出しています。`,
    };
};

/** 固定資産税評価額の比で按分する（合計取得価額は消費税込みとして扱う） */
const fromAssessedValue = (input: BuildingPriceInput): BuildingPriceResult => {
    if (input.totalCost <= 0 || input.landAssessedValue <= 0 || input.buildingAssessedValue <= 0) {
        return unresolved('合計取得価額と、土地・建物それぞれの固定資産税評価額を入力してください。');
    }

    const assessedTotal = input.landAssessedValue + input.buildingAssessedValue;
    const buildingRatio = input.buildingAssessedValue / assessedTotal;
    // 合計取得価額に建物の消費税が含まれている前提で、税抜の建物価額を先に求める
    // 合計 ＝ 土地 ＋ 建物税抜 ＋ 建物税抜×税率 ＝ 建物税抜 ×（土地建物比 ＋ 1 ＋ 税率）
    const assessedRatio = input.landAssessedValue / input.buildingAssessedValue;
    const netCost = Math.floor(input.totalCost / (assessedRatio + 1 + input.taxRate));
    const consumptionTax = Math.floor(netCost * input.taxRate);
    const buildingCost = netCost + consumptionTax;
    const warnings: string[] = [];
    const landCost = splitLand(input.totalCost, buildingCost, warnings);

    const steps: BuildingPriceStep[] = [
        {
            label: '① 固定資産税評価額（土地／建物）',
            value: `${formatYen(input.landAssessedValue)} ／ ${formatYen(input.buildingAssessedValue)}`,
        },
        { label: '② 建物の割合（建物÷合計）', value: `${(Math.round(buildingRatio * 10000) / 100).toFixed(2)}%` },
        { label: '③ 建物の価額（税抜）', value: formatYen(netCost) },
    ];
    if (input.taxRate > 0) {
        steps.push({ label: `④ 建物の消費税（③×${ratePercentLabel(input.taxRate)}）`, value: formatYen(consumptionTax) });
    }
    steps.push(
        { label: '⑤ 建物の取得価額（③＋④）', value: formatYen(buildingCost) },
        { label: '⑥ 土地の取得価額（合計−⑤）', value: formatYen(landCost) },
    );

    return {
        resolved: true,
        buildingCost,
        landCost,
        steps,
        warnings,
        basis: `建物の取得価額は、固定資産税評価額の比（土地 ${formatCurrency(input.landAssessedValue)}円・建物 ${formatCurrency(input.buildingAssessedValue)}円）により合計取得価額を按分して算出しています。`,
    };
};

/** 建物の標準的な建築価額表から算出する（新築時の価額 − 購入時までの償却費） */
const fromConstructionTable = (input: BuildingPriceInput): BuildingPriceResult => {
    const year = Number(input.builtDate.slice(0, 4));
    if (!input.builtDate || !year) {
        return unresolved('建物の新築年月日を入力してください。');
    }
    if (input.floorArea <= 0) {
        return unresolved('建物の延べ床面積を入力してください。');
    }

    const unitPrice = constructionUnitPrice(year, input.constructionStructure);
    if (unitPrice === null) {
        return unresolved(
            `建築価額表は${eraLabel(CONSTRUCTION_YEAR_MIN)}（${CONSTRUCTION_YEAR_MIN}年）から${eraLabel(CONSTRUCTION_YEAR_MAX)}（${CONSTRUCTION_YEAR_MAX}年）までの建築分が対象です。`,
        );
    }

    const newBuildingCost = Math.floor(unitPrice * input.floorArea);
    // 新築から購入までの償却費。購入日以後の償却は通常どおり譲渡所得の計算側で行う
    const elapsedYears = elapsedYearsForDepreciation(input.builtDate, input.acquisitionDate) ?? 0;
    const depreciation = calcNonBusinessDepreciation(newBuildingCost, input.structureKey, elapsedYears);
    const buildingCost = newBuildingCost - depreciation;
    const structure = findStructure(input.structureKey);

    const warnings: string[] = [];
    if (!input.acquisitionDate) {
        warnings.push('取得日が未入力のため、新築から購入までの償却費を控除していません（新築で取得した場合はこのままで構いません）。');
    }
    if (input.buildingUsage === 'business') {
        warnings.push('事業用の建物は、新築から購入までの償却費も実際の償却方法によります。ここでは非業務用の償却率で計算しています。');
    }
    const landCost = splitLand(input.totalCost, buildingCost, warnings);

    return {
        resolved: true,
        buildingCost,
        landCost,
        steps: [
            {
                label: `① 建築単価（${eraLabel(year)}・${constructionStructureLabel(input.constructionStructure)}）`,
                value: `${formatCurrency(unitPrice)}円/㎡`,
            },
            { label: '② 延べ床面積', value: `${input.floorArea}㎡` },
            { label: '③ 新築時の建築価額（①×②）', value: formatYen(newBuildingCost) },
            { label: '④ 新築から購入までの経過年数', value: `${elapsedYears}年` },
            {
                label: `⑤ 償却費相当額（③×0.9×${structure.rate}×④）`,
                value: formatYen(depreciation),
            },
            { label: '⑥ 建物の取得価額（③−⑤）', value: formatYen(buildingCost) },
            { label: '⑦ 土地の取得価額（合計−⑥）', value: formatYen(landCost) },
        ],
        warnings,
        basis: `建物の取得価額は「建物の標準的な建築価額表」により算出しています（${eraLabel(year)}・${constructionStructureLabel(input.constructionStructure)} ${formatCurrency(unitPrice)}円/㎡ × ${input.floorArea}㎡ ＝ ${formatYen(newBuildingCost)}、新築から購入までの償却費 ${formatYen(depreciation)}を控除）。`,
    };
};

const CALCULATORS: Record<
    Exclude<BuildingPriceMethod, 'direct'>,
    (input: BuildingPriceInput) => BuildingPriceResult
> = {
    tax: fromConsumptionTax,
    assessed: fromAssessedValue,
    table: fromConstructionTable,
};

export const calcBuildingPrice = (input: BuildingPriceInput): BuildingPriceResult => {
    if (input.method === 'direct') return EMPTY_RESULT;

    const result = CALCULATORS[input.method](input);
    if (result.resolved && input.totalCost <= 0) {
        return {
            ...result,
            warnings: ['土地建物の合計取得価額を入力すると、土地の取得価額も求められます。', ...result.warnings],
        };
    }
    return result;
};
