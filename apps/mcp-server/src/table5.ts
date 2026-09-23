/**
 * 第5表（1株当たりの純資産価額の計算明細書）の明細行。
 *
 * 行の持ち方（接頭辞・列番号・行数の上限・備考の選択肢）はすべて辞書から取る。
 * ここが決め打ちしているのは「name / evaluated / book / note」という呼び名を
 * 辞書の列1〜4へ順に当てることだけで、その前提は applyBalanceSheet が毎回検査する
 * （列が増減したら黙って別の欄へ書くのではなく、そこで落ちる）。
 */
import type { CaseData, CatalogRowTable, FieldCatalog } from './catalog.js';
import { normalizeValue } from './catalog.js';
import { InputError } from './errors.js';

/** 入力で使う呼び名と、辞書の列番号の対応。 */
const COLUMN_KEYS = ['name', 'evaluated', 'book', 'note'] as const;
export type ColumnKey = (typeof COLUMN_KEYS)[number];

export type BalanceRowInput = Partial<Record<ColumnKey, unknown>>;

export interface BalanceRow {
  row: number;
  name: string;
  evaluated: string;
  book: string;
  note: string;
}

export interface SideChange {
  key: string;
  label: string;
  before: BalanceRow[];
  after: BalanceRow[];
}

export interface ApplyBalanceResult {
  data: CaseData;
  sides: SideChange[];
}

export function findRowTable(catalog: FieldCatalog, table: string): CatalogRowTable {
  const found = catalog.rowTables.find((t) => t.table === table);
  if (found === undefined) throw new InputError(`${table} は辞書にありません`);
  return found;
}

function fieldName(prefix: string, row: number, column: number): string {
  return `${prefix}_${row}_${column}`;
}

/** 案件データから、その側の入力済みの行を読み出す（空行は飛ばさず、末尾の空行だけ落とす）。 */
export function readBalanceRows(
  rowTable: CatalogRowTable,
  data: CaseData,
  prefix: string,
): BalanceRow[] {
  const table = data[rowTable.table] ?? {};
  const rows: BalanceRow[] = [];
  for (let row = 1; row <= rowTable.maxRows; row += 1) {
    const cells = COLUMN_KEYS.map((_, i) => table[fieldName(prefix, row, i + 1)] ?? '');
    if (cells.every((v) => v.trim() === '')) continue;
    rows.push({
      row,
      name: cells[0] ?? '',
      evaluated: cells[1] ?? '',
      book: cells[2] ?? '',
      note: cells[3] ?? '',
    });
  }
  return rows;
}

/**
 * 決算書から読み取った明細を第5表へ入れる。
 *
 * 指定した側は**まるごと入れ替える**（1行目から詰め直す）。部分的に重ねると、
 * 前の取込で入っていた行が下に残ったまま合計だけ合わなくなり、画面を見ても
 * どこが古いのか分からない。消える行は呼び出し側へ返して、確定前に見せる。
 */
export function applyBalanceSheet(
  catalog: FieldCatalog,
  data: CaseData,
  input: Partial<Record<string, readonly BalanceRowInput[]>>,
  tableId = 'table5',
): ApplyBalanceResult {
  const rowTable = findRowTable(catalog, tableId);

  if (rowTable.columns.length !== COLUMN_KEYS.length) {
    throw new InputError(
      `${rowTable.form}の列が${rowTable.columns.length}列に変わっています`
      + `（このサーバは${COLUMN_KEYS.length}列を前提にしています）。辞書に合わせて直してください`,
    );
  }

  const targets = rowTable.sides.filter((side) => input[side.key] !== undefined);
  if (targets.length === 0) {
    const keys = rowTable.sides.map((s) => `${s.key}（${s.label}）`).join(' / ');
    throw new InputError(`取り込む側が指定されていません。指定できるのは ${keys}`);
  }

  const table = { ...(data[rowTable.table] ?? {}) };
  const sides: SideChange[] = [];

  for (const side of targets) {
    const rowsInput = input[side.key] ?? [];
    if (rowsInput.length > rowTable.maxRows) {
      throw new InputError(
        `${side.label}の行数が上限を超えています（${rowsInput.length}行 / 上限 ${rowTable.maxRows}行）`,
      );
    }

    const before = readBalanceRows(rowTable, data, side.prefix);

    const after: BalanceRow[] = rowsInput.map((raw, i) => {
      const row = i + 1;
      const where = `${side.label}${row}行目`;
      const cells = COLUMN_KEYS.map((key, ci) => {
        const column = rowTable.columns[ci];
        if (column === undefined) throw new InputError(`${where}: 辞書の列${ci + 1}がありません`);
        return normalizeValue(
          catalog,
          column.kind,
          raw[key],
          `${where}の${column.label}`,
          column.kind === 'enum' ? side.noteOptions : [],
        );
      });

      if ((cells[0] ?? '') === '') {
        throw new InputError(
          `${where}: ${rowTable.columns[0]?.label ?? '1列目'}が空です。`
          + '空行を挟むと以降の行がずれるので、行は詰めて渡してください',
        );
      }

      return {
        row,
        name: cells[0] ?? '',
        evaluated: cells[1] ?? '',
        book: cells[2] ?? '',
        note: cells[3] ?? '',
      };
    });

    // 入れ替えなので、まずその側の行をすべて消す。
    for (let row = 1; row <= rowTable.maxRows; row += 1) {
      for (let ci = 1; ci <= COLUMN_KEYS.length; ci += 1) {
        delete table[fieldName(side.prefix, row, ci)];
      }
    }
    for (const row of after) {
      const values = [row.name, row.evaluated, row.book, row.note];
      values.forEach((value, ci) => {
        if (value !== '') table[fieldName(side.prefix, row.row, ci + 1)] = value;
      });
    }

    sides.push({ key: side.key, label: side.label, before, after });
  }

  return { data: { ...data, [rowTable.table]: table }, sides };
}
