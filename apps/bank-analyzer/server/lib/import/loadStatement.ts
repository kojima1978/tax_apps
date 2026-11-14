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
//
// 取込ウィザードは lenient で読む（依頼26。AI が OCR した CSV を想定）。ファイル全体を止めるのは
// 必須の列が無い・表として読めないときだけで、ほかは行ごとに知らせる:
//  - 取引でない行（日付が空で、払戻額・お預り額とも空欄）は読み飛ばして skipped に返す（繰越・合計など）
//  - 読めない日付・金額は 空欄／0 として行に残し、ファイルの値を raw に持つ（画面で直すか除く）
//  - 列ずれ・濁点の崩れなどの疑いは issues に理由を書く（値は変えない）
// 既定（lenient なし）は今までどおり最初のエラーで止める。Django 版の正解との突き合わせはこちら。

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
import { headerKey, readTable, type Cell, type TableRow } from './readTable.js';

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

// lenient のときだけ。読めなかった値のファイルの値（date は ''、払戻・お預りは 0、残高は null にしてある）
export type RawValues = Partial<Record<'date' | 'amountOut' | 'amountIn' | 'balance', string>>;

export type StatementRow = {
  line: number;
  date: string; // 'YYYY-MM-DD'（lenient で読めなかったときだけ ''）
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
  raw?: RawValues;
  // lenient のときだけ。壊れた行の疑い（理由の文）。値は変えずに知らせる
  issues?: string[];
};

// 取引でないので読み飛ばした行（繰越・合計・前ページより など）
export type SkippedRow = {
  line: number;
  description: string | null;
  balance: number | null;
  bankName: string | null;
  branchName: string | null;
  accountNumber: string | null;
};

export type Statement = {
  // ファイルにあった標準の列（ファイルの並び順）
  columns: StandardColumn[];
  // 1行目から取った銀行名など（空欄のものは入れない）
  metadata: StatementMetadata;
  hasBalance: boolean;
  rows: StatementRow[];
  // lenient のときだけ中身が入る（既定では空）
  skipped: SkippedRow[];
};

export type LoadOptions = {
  // true なら1ファイルに銀行名・口座番号が複数あってもよい（取込ウィザード）
  allowMultiple?: boolean;
  // true なら行の誤りでファイルを止めない（取込ウィザード。上の説明）
  lenient?: boolean;
};

const META_COLUMNS = [
  ['bank_name', 'bankName'],
  ['branch_name', 'branchName'],
  ['account_number', 'accountNumber'],
  ['account_type', 'accountType'],
] as const;

export function loadStatement(bytes: Uint8Array, options: LoadOptions = {}): Statement {
  const table = readTable(bytes);
  const lenient = options.lenient === true;

  if (!lenient) {
    // 見出しより後ろに値がある行。列がずれている恐れがあるので止める（pandas は1行目なら先頭の列を
    // 索引に回して列をずらし、2行目以降ならファイルごと失敗していた）
    const over = table.rows.find((r) => r.overflow);
    if (over) {
      throw new FormatError('見出しより列の多い行があります。', {
        lineNumber: over.line,
        suggestion: `行${over.line} の列の数が見出し（${table.header.length}列）と合いません。摘要などにカンマが含まれていないか、引用符（"）で囲まれているかを確認してください。`,
      });
    }
  }

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

  const cell = (cells: Cell[], col: StandardColumn): Cell => {
    const i = index.get(col);
    return i === undefined ? null : (cells[i] ?? null);
  };
  const text = (cells: Cell[], col: StandardColumn): string | null => {
    const v = cell(cells, col);
    return v === null ? null : String(v);
  };
  const trimmed = (cells: Cell[], col: StandardColumn): string | null => {
    const v = text(cells, col)?.trim();
    return v ? v : null;
  };
  const hasBalance = index.has('balance');

  // 何も書かれていない行は読み飛ばす（#3。Django 版は日付のエラーでファイルごと止まっていた）。
  const filled = table.rows.filter((r) => r.cells.some((c) => !isBlank(c)));
  // 取引でない行（lenient のときだけ）: 日付が空で、払戻額・お預り額とも空欄
  const isNonTransaction = (r: TableRow) =>
    isBlank(cell(r.cells, 'date')) && isBlank(cell(r.cells, 'amount_out')) && isBlank(cell(r.cells, 'amount_in'));
  const rows = lenient ? filled.filter((r) => !isNonTransaction(r)) : filled;
  const skipped: SkippedRow[] = lenient
    ? filled.filter(isNonTransaction).map((r) => {
        const b = hasBalance ? parseAmount(cell(r.cells, 'balance')) : null;
        return {
          line: r.line,
          description: trimmed(r.cells, 'description'),
          balance: b?.ok ? b.value : null,
          bankName: trimmed(r.cells, 'bank_name'),
          branchName: trimmed(r.cells, 'branch_name'),
          accountNumber: trimmed(r.cells, 'account_number'),
        };
      })
    : [];

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
  const rawDates: (string | null)[] = [];
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
    rawDates.push(parsed === null ? raw : null);
  }
  if (badDateLines.length > 0 && !lenient) throw new DateParseError(badDateLines, badDateValues);

  // 金額
  const amountColumns: AmountColumn[] = hasBalance
    ? ['amount_out', 'amount_in', 'balance']
    : ['amount_out', 'amount_in'];
  const amounts: Record<AmountColumn, (number | null)[]> = { amount_out: [], amount_in: [], balance: [] };
  const rawAmounts: Record<AmountColumn, (string | null)[]> = { amount_out: [], amount_in: [], balance: [] };
  for (const col of amountColumns) {
    const bad: { line: number; value: string }[] = [];
    let hasDecimal = false;
    for (const r of rows) {
      const result = parseAmount(cell(r.cells, col));
      if (result.ok) {
        // 空欄は 0。残高だけは「残高なし」（#2）。
        amounts[col].push(result.value ?? (col === 'balance' ? null : 0));
        rawAmounts[col].push(null);
      } else {
        bad.push({ line: r.line, value: result.raw });
        hasDecimal ||= result.decimal;
        // lenient は空欄として行に残し、ファイルの値を raw に持つ
        amounts[col].push(col === 'balance' ? null : 0);
        rawAmounts[col].push(result.raw);
      }
    }
    if (bad.length > 0 && !lenient) {
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
    // lenient では金額のような値を分類名として扱わない（列ずれの疑いとして issues に値を出す）
    if (category !== null && !(lenient && looksLikeAmount(category))) out.category = category;
    const memo = trimmed(cells, 'memo');
    if (memo !== null) out.memo = memo;
    const flagRaw = trimmed(cells, 'flag');
    const flag = parseFlag(flagRaw);
    if (flag === true) out.flagged = true;
    else if (flag === null && flagRaw !== null) out.flagUnreadable = flagRaw;
    return out;
  };

  // 列の数: 見出しと違い、ほかの行で一番多い数とも違う行を疑う（全行の末尾にカンマがあるファイルは疑わない）
  const usualFieldCount = mode(rows.flatMap((r) => (r.fieldCount === undefined ? [] : [r.fieldCount])));
  const issuesOf = (r: TableRow, i: number): string[] => {
    const out: string[] = [];
    if (r.overflow) {
      const values = r.overflow.filter((f) => f.trim() !== '').join('、');
      out.push(
        `列の数が見出し（${table.header.length}列）より多い${r.fieldCount}列です。はみ出した「${values}」は読んでいません（列ずれの疑い）`,
      );
    } else if (r.fieldCount !== undefined && r.fieldCount !== table.header.length && r.fieldCount !== usualFieldCount) {
      out.push(`列の数が見出し（${table.header.length}列）と違う${r.fieldCount}列です（列ずれの疑い）`);
    }
    if (
      rawAmounts.amount_out[i] === null &&
      rawAmounts.amount_in[i] === null &&
      amounts.amount_out[i] === 0 &&
      amounts.amount_in[i] === 0
    ) {
      out.push('払戻額もお預り額も空欄（0）です（読み落とし・列ずれの疑い）');
    }
    const category = trimmed(r.cells, 'category');
    if (category !== null && looksLikeAmount(category)) {
      out.push(`分類の列に金額のような値「${category}」があります（列ずれの疑い）`);
    }
    if (text(r.cells, 'description')?.includes('"')) {
      out.push('摘要に「"」があります（半角カナの濁点・半濁点の崩れの疑い）');
    }
    return out;
  };
  const lenientFields = (r: TableRow, i: number): Pick<StatementRow, 'raw' | 'issues'> => {
    const raw: RawValues = {};
    const d = rawDates[i];
    if (d !== null && d !== undefined) raw.date = d;
    const keys = [
      ['amount_out', 'amountOut'],
      ['amount_in', 'amountIn'],
      ['balance', 'balance'],
    ] as const;
    for (const [col, key] of keys) {
      const v = rawAmounts[col][i];
      if (v !== null && v !== undefined) raw[key] = v;
    }
    const issues = issuesOf(r, i);
    return { ...(Object.keys(raw).length > 0 ? { raw } : {}), ...(issues.length > 0 ? { issues } : {}) };
  };

  return {
    columns,
    metadata,
    hasBalance,
    skipped,
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
      ...(lenient ? lenientFields(r, i) : {}),
    })),
  };
}

// 分類の列に入った金額・数字（列ずれで差引残高が入ったときなど）
export function looksLikeAmount(value: string): boolean {
  return /^[+\-△▲−]?[¥\\]?[\d,.]+円?$/.test(value.normalize('NFKC').replace(/\s/g, ''));
}

// 一番多い値（同数なら先に出たもの）。空なら undefined
function mode(values: number[]): number | undefined {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: number | undefined;
  for (const [v, n] of counts) if (best === undefined || n > counts.get(best)!) best = v;
  return best;
}

function isBlank(c: Cell | undefined): boolean {
  return c === null || c === undefined || (typeof c === 'string' && c.trim() === '');
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
