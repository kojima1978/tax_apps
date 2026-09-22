// 貼り付けた表を読むための共通部分。
//
// 「Excelやウェブの表をそのままコピーして貼る」入口は業種目データの管理画面と第5表の
// 資産・負債にあり、どちらも同じ問題を抱える: 区切りがタブ・カンマ・空白のいずれにもなり、
// 数字は全角だったり桁区切りが入っていたり、見出し行が付いていたりいなかったりする。
// ここでは「区切りの判定 → 行の分解 → 列の割り当て」までを担う。
// 何を1行とみなすか・取り込んでよいかは、項目ごとの呼び出し側が決める。

export type Delimiter = 'tab' | 'comma' | 'whitespace';

export const DELIMITER_LABELS: Readonly<Record<Delimiter, string>> = {
  tab: 'タブ区切り（Excelからのコピー）',
  comma: 'カンマ区切り（CSV）',
  whitespace: '空白区切り（PDFからのコピー）',
};

/** 取り込む項目の種類。数値欄だけ桁区切り・全角・負号の正規化を行う。 */
export type FieldKind = 'integer' | 'decimal' | 'text';

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

/** 全角英数字・全角空白を半角に倒す。公表資料や会計ソフトの見出し・数字は全角のことがある。 */
export function toHalfWidth(value: string): string {
  return value
    .replace(/[０-９Ａ-Ｚａ-ｚ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ');
}

/** 桁区切り・通貨記号・単位を落として数値の文字列にする。負号は △ ▲ − も受ける。 */
export function toNumericText(cell: string): string {
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

export function parseDecimal(cell: string): number | null {
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
 * 見出し行があればそれを最優先（公表資料も会計ソフトの出力も見出し付きでコピーされることが多い）。
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
  /** 鍵となる欄は読めたが他の欄が不正だった行。 */
  errors: RowIssue[];
}

/** 割り当てられた列のセルを取り出す。未割当なら空文字。 */
export function cellOf<K extends string>(
  cells: readonly string[],
  assignment: ColumnAssignment<K>,
  key: K,
): string {
  const column = assignment[key];
  return column === undefined ? '' : (cells[column] ?? '').trim();
}

/** 必須なのに列が割り当てられていない項目。 */
export function missingRequired<K extends string>(
  fields: ReadonlyArray<FieldDef<K>>,
  assignment: ColumnAssignment<K>,
): FieldDef<K>[] {
  return fields.filter((field) => field.required && assignment[field.key] === undefined);
}
