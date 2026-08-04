// 国税庁の公表資料（Excel / PDF）からコピーした表を、そのまま貼り付けて取り込めるようにする。
//
// 相手は「毎月115行が並ぶ表」なので、手打ちさせずに貼り付け1本で回すのが前提。
// ただし出所によって区切りがタブ・カンマ・空白のいずれにもなるうえ、数字は全角だったり
// 桁区切りが入っていたりする。ここでは「区切りの判定 → セルの正規化 → 列の割り当て →
// 行の解釈」までを担い、DBに投げる直前の形に整える。登録の可否はプレビュー側で判断する。

import type { IndustryCategory, IndustryLevel, IndustryYear } from '@/data/industryDataset';

export type Delimiter = 'tab' | 'comma' | 'whitespace';

export const DELIMITER_LABELS: Readonly<Record<Delimiter, string>> = {
  tab: 'タブ区切り（Excelからのコピー）',
  comma: 'カンマ区切り（CSV）',
  whitespace: '空白区切り（PDFからのコピー）',
};

/** 取り込む項目の種類。数値欄だけ桁区切り・全角・負号の正規化を行う。 */
type FieldKind = 'integer' | 'decimal' | 'text';

export interface FieldDef<K extends string> {
  key: K;
  label: string;
  required: boolean;
  kind: FieldKind;
  /** 見出し行から列を推測するための手掛かり。 */
  headerPattern: RegExp;
  /**
   * headerPattern に当たっても、この語を含む見出しは別項目とみなす。
   * 「課税時期の属する月以前２年間の平均株価」が「株価」に吸われるのを防ぐ。
   */
  headerExclude?: RegExp;
}

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

/** 全角英数字・全角空白を半角に倒す。公表資料の見出しや数字は全角で書かれていることがある。 */
function toHalfWidth(value: string): string {
  return value
    .replace(/[０-９Ａ-Ｚａ-ｚ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ');
}

/** 桁区切り・通貨記号・単位を落として数値の文字列にする。負号は △ ▲ − も受ける。 */
function toNumericText(cell: string): string {
  return toHalfWidth(cell)
    .replace(/[,，\s¥￥円銭]/g, '')
    .replace(/[△▲−–—]/g, '-');
}

/** 全角・桁区切り・△▲を吸収してから整数にする。直接入力欄も同じ規則で読む。 */
export function parseInteger(cell: string): number | null {
  const text = toNumericText(cell);
  if (!/^-?\d+$/.test(text)) return null;
  return Number(text);
}

function parseDecimal(cell: string): number | null {
  const text = toNumericText(cell);
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  return Number(text);
}

/** カンマ区切りの1行を、`"` の引用を考慮して分解する。 */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;

    if (quoted) {
      if (char === '"') {
        // "" は引用符そのもの。
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ',') {
      cells.push(current);
      current = '';
    } else current += char;
  }

  cells.push(current);
  return cells;
}

function splitLine(line: string, delimiter: Delimiter): string[] {
  if (delimiter === 'tab') return line.split('\t');
  if (delimiter === 'comma') return splitCsvLine(line);
  return line.trim().split(/[ \t　]+/);
}

/**
 * 区切りを推測する。
 *
 * タブがあれば迷わずタブ。カンマは桁区切り（`1,234`）と紛らわしいので、
 * カンマで割ったときに大半の行で列数が揃う場合だけ CSV とみなす。
 */
export function detectDelimiter(text: string): Delimiter {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return 'whitespace';
  if (lines.some((line) => line.includes('\t'))) return 'tab';
  if (!lines.some((line) => line.includes(','))) return 'whitespace';

  const counts = new Map<number, number>();
  for (const line of lines) {
    const count = splitCsvLine(line).length;
    counts.set(count, (counts.get(count) ?? 0) + 1);
  }

  for (const [count, appeared] of counts) {
    if (count >= 2 && appeared >= lines.length * 0.8) return 'comma';
  }
  return 'whitespace';
}

export interface PastedTable {
  delimiter: Delimiter;
  /** 元テキストの行番号（1始まり）付きのセル配列。空行は除いてある。 */
  rows: { line: number; cells: string[] }[];
  columnCount: number;
}

export function splitPastedTable(text: string, delimiter: Delimiter): PastedTable {
  const rows = text
    .split(/\r?\n/)
    .map((line, index) => ({ line: index + 1, cells: splitLine(line, delimiter) }))
    .filter(({ cells }) => cells.some((cell) => cell.trim() !== ''));

  return {
    delimiter,
    rows,
    columnCount: rows.reduce((max, { cells }) => Math.max(max, cells.length), 0),
  };
}

export type ColumnAssignment<K extends string> = Partial<Record<K, number>>;

/**
 * 列の割り当てを推測する。
 *
 * 見出し行があればそれを最優先（公表資料は見出し付きでコピーされることが多い）。
 * 無ければ数値欄を左から順に埋める。番号・株価だけの2列表はこれで当たる。
 */
export function guessAssignment<K extends string>(
  table: PastedTable,
  fields: ReadonlyArray<FieldDef<K>>,
): ColumnAssignment<K> {
  const assignment: ColumnAssignment<K> = {};
  const used = new Set<number>();

  const matches = (field: FieldDef<K>, cell: string) => {
    const text = toHalfWidth(cell).trim();
    return field.headerPattern.test(text) && !(field.headerExclude?.test(text) ?? false);
  };

  const headerRow = table.rows.find(({ cells }) =>
    fields.some((field) => cells.some((cell) => matches(field, cell))),
  );

  if (headerRow) {
    for (const field of fields) {
      const column = headerRow.cells.findIndex(
        (cell, index) => !used.has(index) && matches(field, cell),
      );
      if (column >= 0) {
        assignment[field.key] = column;
        used.add(column);
      }
    }
    if (Object.keys(assignment).length > 0) return assignment;
  }

  // 見出しが無いときは「全行で整数として読める列」を数値欄の候補にする。
  const dataRows = table.rows.filter(({ cells }) => cells.some((cell) => parseInteger(cell) !== null));
  const numericColumns: number[] = [];
  for (let column = 0; column < table.columnCount; column += 1) {
    const values = dataRows.map(({ cells }) => cells[column] ?? '');
    if (values.length > 0 && values.every((cell) => parseDecimal(cell) !== null)) {
      numericColumns.push(column);
    }
  }

  let next = 0;
  for (const field of fields) {
    if (field.kind === 'text') continue;
    const column = numericColumns[next];
    if (column === undefined) break;
    assignment[field.key] = column;
    next += 1;
  }

  return assignment;
}

export interface RowIssue {
  line: number;
  reason: string;
}

export interface ExtractResult<T> {
  rows: T[];
  /** 見出し・注記とみなして読み飛ばした行。 */
  skipped: RowIssue[];
  /** 業種目番号は読めたが他の欄が不正だった行。 */
  errors: RowIssue[];
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

function cellOf<K extends string>(
  cells: readonly string[],
  assignment: ColumnAssignment<K>,
  key: K,
): string {
  const column = assignment[key];
  return column === undefined ? '' : (cells[column] ?? '').trim();
}

function missingRequired<K extends string>(
  fields: ReadonlyArray<FieldDef<K>>,
  assignment: ColumnAssignment<K>,
): FieldDef<K>[] {
  return fields.filter((field) => field.required && assignment[field.key] === undefined);
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
): ExtractResult<CategoryRow> {
  return extractRows(table, assignment, CATEGORY_FIELDS, 'number', (cells, line) => {
    const number = parseInteger(cellOf(cells, assignment, 'number'))!;

    const largeName = cellOf(cells, assignment, 'largeName');
    if (largeName === '') return '大分類が空欄です';
    const middleName = cellOf(cells, assignment, 'middleName');
    const smallName = cellOf(cells, assignment, 'smallName');

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

    // 業種目名の列が無い表もある。その場合は最も下位の区分名を名前として使う。
    const name = cellOf(cells, assignment, 'name') || smallName || middleName || largeName;

    return {
      line,
      number,
      largeName,
      middleName,
      smallName,
      name,
      level: levelOf(middleName, smallName),
      description: cellOf(cells, assignment, 'description'),
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
