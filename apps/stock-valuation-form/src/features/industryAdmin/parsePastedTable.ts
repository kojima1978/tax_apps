// 国税庁の公表資料（Excel / PDF）からコピーした業種目の表を、そのまま貼り付けて取り込めるようにする。
//
// 相手は「毎月115行が並ぶ表」なので、手打ちさせずに貼り付け1本で回すのが前提。
// 区切りの判定・セルの正規化・列の割り当てといった「どの表でも同じ」部分は
// features/pastedTable へ移してあり、ここに残すのは業種目に固有の定義
// （どんな列を要求するか・1行をどう解釈するか）だけ。登録の可否はプレビュー側で判断する。

import type { IndustryCategory, IndustryLevel, IndustryYear } from '@/data/industryDataset';
import {
  type ColumnAssignment,
  type ExtractResult,
  type FieldDef,
  type PastedTable,
  type RowIssue,
  cellOf,
  missingRequired,
  parseDecimal,
  parseInteger,
} from '@/features/pastedTable/parseTable';

// 貼り付けの入口はこのモジュールなので、共通部分もここから使えるようにしておく
// （管理画面側の import を1本で済ませるため。実体は features/pastedTable にある）。
export {
  DELIMITER_LABELS,
  detectDelimiter,
  guessAssignment,
  parseInteger,
  splitPastedTable,
} from '@/features/pastedTable/parseTable';
export type {
  ColumnAssignment,
  Delimiter,
  ExtractResult,
  FieldDef,
  PastedTable,
  RowIssue,
} from '@/features/pastedTable/parseTable';

export type MonthlyPriceField = 'number' | 'price' | 'twoYearAveragePrice';

export const MONTHLY_PRICE_FIELDS: ReadonlyArray<FieldDef<MonthlyPriceField>> = [
  { key: 'number', label: '業種目番号', required: true, kind: 'integer', headerPattern: /番号/ },
  {
    key: 'price',
    label: '株価',
    required: true,
    kind: 'integer',
    headerPattern: /株価|価額/,
    headerExclude: /２年|2年|平均/,
  },
  {
    key: 'twoYearAveragePrice',
    label: '2年間の平均株価',
    required: false,
    kind: 'integer',
    headerPattern: /２年|2年/,
  },
];

export type CategoryField =
  | 'number'
  | 'largeName'
  | 'middleName'
  | 'smallName'
  | 'name'
  | 'description'
  | 'dividend'
  | 'profit'
  | 'netAsset'
  | 'previousYearAveragePrice';

export const CATEGORY_FIELDS: ReadonlyArray<FieldDef<CategoryField>> = [
  { key: 'number', label: '業種目番号', required: true, kind: 'integer', headerPattern: /番号/ },
  { key: 'largeName', label: '大分類', required: true, kind: 'text', headerPattern: /大分類/ },
  { key: 'middleName', label: '中分類', required: false, kind: 'text', headerPattern: /中分類/ },
  { key: 'smallName', label: '小分類', required: false, kind: 'text', headerPattern: /小分類/ },
  { key: 'name', label: '業種目名', required: false, kind: 'text', headerPattern: /名前|業種目名/ },
  { key: 'description', label: '内容', required: false, kind: 'text', headerPattern: /内容/ },
  { key: 'dividend', label: 'B 配当金額', required: true, kind: 'decimal', headerPattern: /^B|配当/ },
  { key: 'profit', label: 'C 利益金額', required: true, kind: 'integer', headerPattern: /^C|利益/ },
  { key: 'netAsset', label: 'D 純資産価額', required: true, kind: 'integer', headerPattern: /^D|純資産/ },
  {
    key: 'previousYearAveragePrice',
    label: '前年平均株価',
    required: true,
    kind: 'integer',
    headerPattern: /前年|年平均/,
  },
];

/**
 * 前年分から引き継ぐ業種目の名称。
 *
 * 業種目の分類は年が変わっても基本的に同じで、毎年変わるのは B・C・D と前年平均株価。
 * それでも新規追加のたびに分類名まで貼り直させていたので、前年分を雛形として渡せるようにした。
 * 番号で突き合わせ、貼り付けに列が無い項目だけを補う。
 */
export interface CategoryTemplateEntry {
  largeName: string;
  middleName: string;
  smallName: string;
  name: string;
  description: string;
}

export type CategoryTemplate = ReadonlyMap<number, CategoryTemplateEntry>;

/** 雛形が補える項目。雛形があるときは貼り付け側で必須にしない。 */
const TEMPLATE_SUPPLIED: ReadonlyArray<CategoryField> = ['largeName'];

/**
 * 貼り付けに要求する列。雛形があれば大分類は省ける（番号とB・C・D・前年平均だけで足りる）。
 * 参照が毎回変わると usePastedTable の推測が走り直すので、呼び出し側で useMemo すること。
 */
export function categoryFieldsFor(hasTemplate: boolean): ReadonlyArray<FieldDef<CategoryField>> {
  if (!hasTemplate) return CATEGORY_FIELDS;
  return CATEGORY_FIELDS.map((field) =>
    (TEMPLATE_SUPPLIED.includes(field.key) ? { ...field, required: false } : field));
}

export interface MonthlyPriceRow {
  line: number;
  number: number;
  price: number;
  twoYearAveragePrice: number | null;
}

export interface CategoryRow {
  line: number;
  number: number;
  largeName: string;
  middleName: string;
  smallName: string;
  name: string;
  level: IndustryLevel;
  description: string;
  dividend: number;
  profit: number;
  netAsset: number;
  previousYearAveragePrice: number;
}

/** 大／中／小のうち最も下位の非空の区分がその業種目の階層になる（seed と同じ規則）。 */
function levelOf(middleName: string, smallName: string): IndustryLevel {
  if (smallName !== '') return 'SMALL';
  if (middleName !== '') return 'MIDDLE';
  return 'LARGE';
}

/**
 * 行を解釈する共通部分。
 *
 * 業種目番号が読めない行は見出し・注記とみなして読み飛ばす（データ行には必ず番号があるため、
 * 黙って落ちるのは表以外の行だけになる）。番号は読めたのに他が不正な行はエラーとして残し、
 * プレビューで理由ごと見せる。
 */
function extractRows<K extends string, T>(
  table: PastedTable,
  assignment: ColumnAssignment<K>,
  fields: ReadonlyArray<FieldDef<K>>,
  numberKey: K,
  build: (cells: readonly string[], line: number) => T | string,
): ExtractResult<T> {
  const lacking = missingRequired(fields, assignment);
  if (lacking.length > 0) {
    return {
      rows: [],
      skipped: [],
      errors: [{ line: 0, reason: `列が未割当です: ${lacking.map((f) => f.label).join('・')}` }],
    };
  }

  const rows: T[] = [];
  const skipped: RowIssue[] = [];
  const errors: RowIssue[] = [];
  const seen = new Map<number, number>();

  for (const { line, cells } of table.rows) {
    const number = parseInteger(cellOf(cells, assignment, numberKey));
    if (number === null) {
      skipped.push({ line, reason: '業種目番号が読めないため見出し・注記とみなしました' });
      continue;
    }
    if (number < 1) {
      errors.push({ line, reason: `業種目番号が不正です（${number}）` });
      continue;
    }

    const firstLine = seen.get(number);
    if (firstLine !== undefined) {
      errors.push({ line, reason: `業種目番号 ${number} が${firstLine}行目と重複しています` });
      continue;
    }

    const built = build(cells, line);
    if (typeof built === 'string') {
      errors.push({ line, reason: built });
      continue;
    }

    seen.set(number, line);
    rows.push(built);
  }

  return { rows, skipped, errors };
}

export function extractMonthlyPriceRows(
  table: PastedTable,
  assignment: ColumnAssignment<MonthlyPriceField>,
): ExtractResult<MonthlyPriceRow> {
  return extractRows(table, assignment, MONTHLY_PRICE_FIELDS, 'number', (cells, line) => {
    const number = parseInteger(cellOf(cells, assignment, 'number'))!;

    const price = parseInteger(cellOf(cells, assignment, 'price'));
    if (price === null) return `株価が数値として読めません（"${cellOf(cells, assignment, 'price')}"）`;
    if (price < 0) return `株価が負の値です（${price}）`;

    // 2年平均は課税時期になり得ない月には付かないため、空欄を未公表として通す。
    const twoYearRaw = cellOf(cells, assignment, 'twoYearAveragePrice');
    let twoYearAveragePrice: number | null = null;
    if (assignment.twoYearAveragePrice !== undefined && twoYearRaw !== '' && twoYearRaw !== '-') {
      twoYearAveragePrice = parseInteger(twoYearRaw);
      if (twoYearAveragePrice === null) {
        return `2年間の平均株価が数値として読めません（"${twoYearRaw}"）`;
      }
    }

    return { line, number, price, twoYearAveragePrice };
  });
}

export function extractCategoryRows(
  table: PastedTable,
  assignment: ColumnAssignment<CategoryField>,
  template?: CategoryTemplate,
): ExtractResult<CategoryRow> {
  return extractRows(table, assignment, categoryFieldsFor(template !== undefined), 'number', (cells, line) => {
    const number = parseInteger(cellOf(cells, assignment, 'number'))!;
    const inherited = template?.get(number);

    /*
     * 雛形で補うのは「列そのものが無い」項目だけにする。列があって空欄なのは
     * 大分類だけの行（中分類・小分類が無い）という意味なので、そこへ雛形を混ぜてはいけない。
     */
    const textOf = (key: CategoryField, fallback: string): string =>
      (assignment[key] === undefined ? fallback : cellOf(cells, assignment, key));

    const largeName = textOf('largeName', inherited?.largeName ?? '');
    if (largeName === '') {
      return template && !inherited
        ? `大分類が空欄です（雛形にも業種目番号 ${number} がありません）`
        : '大分類が空欄です';
    }
    const middleName = textOf('middleName', inherited?.middleName ?? '');
    const smallName = textOf('smallName', inherited?.smallName ?? '');

    const dividend = parseDecimal(cellOf(cells, assignment, 'dividend'));
    if (dividend === null) return `B 配当金額が数値として読めません（"${cellOf(cells, assignment, 'dividend')}"）`;
    const profit = parseInteger(cellOf(cells, assignment, 'profit'));
    if (profit === null) return `C 利益金額が数値として読めません（"${cellOf(cells, assignment, 'profit')}"）`;
    const netAsset = parseInteger(cellOf(cells, assignment, 'netAsset'));
    if (netAsset === null) return `D 純資産価額が数値として読めません（"${cellOf(cells, assignment, 'netAsset')}"）`;
    const previousYearAveragePrice = parseInteger(
      cellOf(cells, assignment, 'previousYearAveragePrice'),
    );
    if (previousYearAveragePrice === null) {
      return `前年平均株価が数値として読めません（"${cellOf(cells, assignment, 'previousYearAveragePrice')}"）`;
    }

    // 業種目名の列が無い表もある。その場合は雛形、無ければ最も下位の区分名を名前として使う。
    const name = cellOf(cells, assignment, 'name')
      || inherited?.name
      || smallName || middleName || largeName;

    return {
      line,
      number,
      largeName,
      middleName,
      smallName,
      name,
      level: levelOf(middleName, smallName),
      description: textOf('description', inherited?.description ?? ''),
      dividend,
      profit,
      netAsset,
      previousYearAveragePrice,
    };
  });
}

export type DiffStatus = 'new' | 'changed' | 'same';

export interface MonthlyPriceDiff {
  number: number;
  /** 登録済みマスタから引いた業種目名。突き合わせ確認用。 */
  name: string;
  status: DiffStatus;
  before: { price: number; twoYearAveragePrice: number | null } | null;
  after: { price: number; twoYearAveragePrice: number | null };
}

export interface MonthlyPricePreview {
  diffs: MonthlyPriceDiff[];
  /** 貼り付けに含まれるが、その年分に存在しない業種目番号。 */
  unknownNumbers: number[];
  /** その年分にあるのに貼り付けに無い業種目番号。 */
  missingNumbers: number[];
}

/** 取り込む前に、登録済みの値と突き合わせて新規／変更／据置を出す。 */
export function previewMonthlyPrices(
  rows: readonly MonthlyPriceRow[],
  year: IndustryYear | undefined,
  priceYear: number,
  priceMonth: number,
): MonthlyPricePreview {
  const categories = new Map<number, IndustryCategory>(
    (year?.categories ?? []).map((category) => [category.number, category]),
  );

  const diffs: MonthlyPriceDiff[] = [];
  const unknownNumbers: number[] = [];

  for (const row of rows) {
    const category = categories.get(row.number);
    if (!category) {
      unknownNumbers.push(row.number);
      continue;
    }

    const existing = category.monthlyPrices.find(
      (price) => price.year === priceYear && price.month === priceMonth,
    );
    const after = { price: row.price, twoYearAveragePrice: row.twoYearAveragePrice };
    const before = existing
      ? { price: existing.price, twoYearAveragePrice: existing.twoYearAveragePrice }
      : null;

    const status: DiffStatus = before === null
      ? 'new'
      : before.price === after.price && before.twoYearAveragePrice === after.twoYearAveragePrice
        ? 'same'
        : 'changed';

    diffs.push({ number: row.number, name: category.name, status, before, after });
  }

  const pasted = new Set(rows.map(({ number }) => number));
  const missingNumbers = (year?.categories ?? [])
    .map(({ number }) => number)
    .filter((number) => !pasted.has(number));

  return { diffs, unknownNumbers, missingNumbers };
}
