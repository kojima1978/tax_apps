// 通帳の CSV / xlsx を取引の行にする（Django 版 analyzer/lib/importer.py の load_csv）。
//
// 調べる順は Django 版と同じで、最初に見つかった種類のエラーで止まる:
//   列名（FormatError）→ 銀行名・口座番号が1つか（Multiple*Error）→ 日付（DateParseError）
//   → 金額を 払戻額・お預り額・残高 の順に（AmountParseError）
//
// Django 版との違い（計画書 §3 で「直す」と決めたもの。test-data/golden/README.md にも表がある）:
//  #1 口座番号などは文字列のまま（`0012345` の 0 を落とさない）
//  #2 残高の空欄は「残高なし」（null）。0 にすると残高チェックが誤って不整合を出す
//  #3 日付は行ごとに判定する。何も書かれていない行は読み飛ばす
//  #4 小数の金額はエラーにする（黙って切り捨てない）
//  #5 `04/03/2021` は読まない（dates.ts）
//
// 切替後に読めるようにしたもの（§3 の #10。Django 版はどれもファイルごと失敗していた）:
//  - 列名 `年月日` / `払戻` / `お預り` / `残高`、全角や空白の混じった列名（readTable.ts の headerKey）
//  - 全角数字の金額（`１２３`）、`△` / `▲` の負号、`円` / `¥` の付いた金額
//  - `令和3年4月1日` / `2021年4月1日` の日付（dates.ts）

import { parseStatementDate } from '../dates.js';
import {
  AmountParseError,
  DateParseError,
  FormatError,
  MultipleAccountError,
  MultipleBankError,
  type AmountColumn,
} from './errors.js';
import { columnLabel, IMPORT_COLUMNS, parseFlag, REQUIRED_COLUMNS, type StandardColumn } from './columns.js';
import { headerKey, readTable, type Cell } from './readTable.js';

// 列名の表記ゆれ（columns.ts の表から作る）。比べるのは headerKey を通した形（全角・空白の違いは無視）。
const COLUMN_RENAME_MAP: Record<string, StandardColumn> = Object.fromEntries(
  IMPORT_COLUMNS.flatMap((c) => [c.name, ...c.aliases].map((name) => [headerKey(name), c.key] as const)),
);

export type { StandardColumn };

export type StatementMetadata = Partial<{
  bankName: string;
  branchName: string;
  accountNumber: string;
  accountType: string;
}>;

export type StatementRow = {
  line: number;
  date: string; // 'YYYY-MM-DD'
  description: string | null;
  amountOut: number;
  amountIn: number;
  balance: number | null;
  bankName: string | null;
  branchName: string | null;
  accountNumber: string | null;
  accountType: string | null;
  // 依頼24 の任意の列。列が無い・空欄なら undefined（golden の期待値と同じ形のままにするため）
  category?: string; // ファイルに書かれた分類名（前後の空白だけ落とす。読み替えは取込の画面で）
  memo?: string;
  flagged?: true; // 要確認が「○」など
  flagUnreadable?: string; // 要確認の読めない値（付箋なしとして扱い、件数だけ知らせる）
};

export type Statement = {
  // ファイルにあった標準の列（ファイルの並び順）
  columns: StandardColumn[];
  // 1行目から取った銀行名など（空欄のものは入れない）
  metadata: StatementMetadata;
  hasBalance: boolean;
  rows: StatementRow[];
};

export type LoadOptions = {
  // true なら1ファイルに銀行名・口座番号が複数あってもよい（取込ウィザード）
  allowMultiple?: boolean;
};

const META_COLUMNS = [
  ['bank_name', 'bankName'],
  ['branch_name', 'branchName'],
  ['account_number', 'accountNumber'],
  ['account_type', 'accountType'],
] as const;

export function loadStatement(bytes: Uint8Array, options: LoadOptions = {}): Statement {
  const table = readTable(bytes);

  // 列名 → 位置。同じ列が2回出てきたら最初のものを使う。
  const index = new Map<StandardColumn, number>();
  const columns: StandardColumn[] = [];
  table.header.forEach((name, i) => {
    const std = COLUMN_RENAME_MAP[headerKey(name)];
    if (std && !index.has(std)) {
      index.set(std, i);
      columns.push(std);
    }
  });

  const missing = REQUIRED_COLUMNS.filter((c) => !index.has(c));
  if (missing.length > 0) {
    throw new FormatError('CSVに必要なカラムがありません。', {
      missingColumns: missing.map(columnLabel),
      foundColumns: table.header,
    });
  }

  // 何も書かれていない行は読み飛ばす（#3。Django 版は日付のエラーでファイルごと止まっていた）。
  const rows = table.rows.filter((r) => r.cells.some((c) => !isBlank(c)));
  const text = (cells: Cell[], col: StandardColumn): string | null => {
    const i = index.get(col);
    const v = i === undefined ? null : cells[i];
    return v === null || v === undefined ? null : String(v);
  };
  const trimmed = (cells: Cell[], col: StandardColumn): string | null => {
    const v = text(cells, col)?.trim();
    return v ? v : null;
  };

  const metadata: StatementMetadata = {};
  const first = rows[0];
  if (first) {
    for (const [col, key] of META_COLUMNS) {
      const v = trimmed(first.cells, col);
      if (v !== null) metadata[key] = v;
    }
  }

  if (!options.allowMultiple) {
    checkSingleValue(rows.map((r) => trimmed(r.cells, 'bank_name')), MultipleBankError);
    checkSingleValue(rows.map((r) => trimmed(r.cells, 'account_number')), MultipleAccountError);
  }

  // 日付
  const dates: string[] = [];
  const badDateLines: number[] = [];
  const badDateValues: string[] = [];
  for (const r of rows) {
    const raw = text(r.cells, 'date') ?? '';
    const parsed = parseStatementDate(raw);
    if (parsed === null) {
      badDateLines.push(r.line);
      badDateValues.push(raw.trim() === '' ? '（空欄）' : raw);
    }
    dates.push(parsed ?? '');
  }
  if (badDateLines.length > 0) throw new DateParseError(badDateLines, badDateValues);

  // 金額
  const hasBalance = index.has('balance');
  const amountColumns: AmountColumn[] = hasBalance
    ? ['amount_out', 'amount_in', 'balance']
    : ['amount_out', 'amount_in'];
  const amounts: Record<AmountColumn, (number | null)[]> = { amount_out: [], amount_in: [], balance: [] };
  for (const col of amountColumns) {
    const bad: { line: number; value: string }[] = [];
    let hasDecimal = false;
    for (const r of rows) {
      const result = parseAmount(r.cells[index.get(col)!] ?? null);
      if (result.ok) {
        // 空欄は 0。残高だけは「残高なし」（#2）。
        amounts[col].push(result.value ?? (col === 'balance' ? null : 0));
      } else {
        bad.push({ line: r.line, value: result.raw });
        hasDecimal ||= result.decimal;
        amounts[col].push(null);
      }
    }
    if (bad.length > 0) {
      throw new AmountParseError(
        col,
        bad.map((b) => b.line),
        bad.map((b) => b.value),
        hasDecimal,
      );
    }
  }

  // 足した列（分類・メモ・要確認）はここで読むだけ。値がおかしくてもエラーにしない（依頼24 の追記）
  const optionalFields = (cells: Cell[]): Pick<StatementRow, 'category' | 'memo' | 'flagged' | 'flagUnreadable'> => {
    const out: Pick<StatementRow, 'category' | 'memo' | 'flagged' | 'flagUnreadable'> = {};
    const category = trimmed(cells, 'category');
    if (category !== null) out.category = category;
    const memo = trimmed(cells, 'memo');
    if (memo !== null) out.memo = memo;
    const flagRaw = trimmed(cells, 'flag');
    const flag = parseFlag(flagRaw);
    if (flag === true) out.flagged = true;
    else if (flag === null && flagRaw !== null) out.flagUnreadable = flagRaw;
    return out;
  };

  return {
    columns,
    metadata,
    hasBalance,
    rows: rows.map((r, i) => ({
      line: r.line,
      date: dates[i]!,
      description: text(r.cells, 'description') || null,
      amountOut: amounts.amount_out[i]!,
      amountIn: amounts.amount_in[i]!,
      balance: hasBalance ? amounts.balance[i]! : null,
      bankName: trimmed(r.cells, 'bank_name'),
      branchName: trimmed(r.cells, 'branch_name'),
      accountNumber: trimmed(r.cells, 'account_number'),
      accountType: trimmed(r.cells, 'account_type'),
      ...optionalFields(r.cells),
    })),
  };
}

function isBlank(c: Cell): boolean {
  return c === null || (typeof c === 'string' && c.trim() === '');
}

function checkSingleValue(
  values: (string | null)[],
  ErrorClass: typeof MultipleBankError | typeof MultipleAccountError,
): void {
  const counts = new Map<string, number>();
  for (const v of values) if (v !== null) counts.set(v, (counts.get(v) ?? 0) + 1);
  if (counts.size > 1) throw new ErrorClass([...counts.keys()], counts);
}

// 金額。全角は半角へ（NFKC）、カンマ・空白・`円`・`¥` を除き、`△` / `▲` / `−` は負号として読む。
// 値なしは value: null。エラーに出す raw はファイルに書かれていたままの値。
type AmountResult = { ok: true; value: number | null } | { ok: false; raw: string; decimal: boolean };

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

export function parseAmount(cell: Cell): AmountResult {
  if (cell === null) return { ok: true, value: null };
  if (typeof cell === 'number') {
    return Number.isInteger(cell)
      ? { ok: true, value: cell }
      : { ok: false, raw: String(cell), decimal: true };
  }
  const stripped = cell.normalize('NFKC').replace(/[,\s]/g, '');
  if (stripped === '') return { ok: true, value: null };
  // 記号だけ（`円` や `¥` だけの欄）は空欄ではなく読めない値
  const cleaned = stripped
    .replace(/^([+-]?)[¥\\]/, '$1')
    .replace(/円$/, '')
    .replace(/^[△▲−]/, '-');
  if (!NUMBER.test(cleaned)) return { ok: false, raw: cell, decimal: false };
  const n = Number(cleaned);
  // `100.0` のように小数部が 0 なら値は変わらないので受ける。
  if (!Number.isInteger(n)) return { ok: false, raw: cell, decimal: true };
  // -0 を 0 に
  return { ok: true, value: n + 0 };
}
