/**
 * 明細行の表（第5表の資産・負債、第1表の1 の株主）への取り込み。
 *
 * どの表があるか・側の接頭辞・列の呼び名と保存キー・行数の上限・続紙の枚数欄は
 * すべて辞書から取る。ここに様式ごとの分岐は無く、辞書に表が1つ増えれば
 * そのまま取り込めるようにしてある（第5表だけを前提にしていた頃は、株主の表を
 * 足すだけでこのファイルを書き直す必要があった）。
 *
 * **続紙の枚数欄を必ず書く**のが要点。行だけ書いて枚数を増やし忘れると、
 * 入れた行は保存されているのに画面に出ず、印刷にも出ない ── 誰にも見えない入り方になる。
 */
import type { CaseData, CatalogRowTable, FieldCatalog } from './catalog.js';
import { normalizeValue, storageKey } from './catalog.js';
import { InputError } from './errors.js';
import type { IntakeTarget } from './intake.js';

/** 1行ぶんの入力。キーは辞書の列の `name`。 */
export type RowInput = Record<string, unknown>;

export interface DetailRow {
  row: number;
  /** 列の name → 値（辞書の列の順） */
  values: Record<string, string>;
}

export interface SideChange {
  key: string;
  label: string;
  before: DetailRow[];
  after: DetailRow[];
}

/** 続紙の枚数欄の変化。増えたことを文面に出すために持つ。 */
export interface PagesChange {
  field: string;
  before: number;
  after: number;
}

export interface ApplyRowsResult {
  data: CaseData;
  rowTable: CatalogRowTable;
  sides: SideChange[];
  pages: PagesChange;
  /**
   * 取込の控えを置く／落とす先。行ごとに**先頭列のセル1つ**だけを指す ── 行の全列に
   * 控えを付けると画面の確認一覧が列数ぶん膨れるし、見たいのは「この行がどの資料から
   * 入ったか」なので、科目名（氏名）の欄に1つあれば足りる。
   */
  intakeTargets: IntakeTarget[];
}

export function findRowTable(catalog: FieldCatalog, id: string): CatalogRowTable {
  const key = String(id).trim();
  const found = catalog.rowTables.find((t) => t.id === key);
  if (found === undefined) {
    const ids = catalog.rowTables.map((t) => `${t.id}（${t.form}）`).join(' / ');
    throw new InputError(
      `${id} という明細の表は辞書にありません。指定できるのは ${ids}`,
    );
  }
  return found;
}

function cellName(prefix: string, row: number, column: string): string {
  return `${prefix}_${row}_${column}`;
}

/** その側の入力済みの行を読み出す（行番号は保ったまま、空行だけ飛ばす）。 */
export function readRows(
  rowTable: CatalogRowTable,
  data: CaseData,
  prefix: string,
): DetailRow[] {
  const table = data[rowTable.table] ?? {};
  const rows: DetailRow[] = [];
  for (let row = 1; row <= rowTable.maxRows; row += 1) {
    const values: Record<string, string> = {};
    let filled = false;
    for (const column of rowTable.columns) {
      const value = table[cellName(prefix, row, column.key)] ?? '';
      values[column.name] = value;
      if (value.trim() !== '') filled = true;
    }
    if (filled) rows.push({ row, values });
  }
  return rows;
}

/** 入力済みの行番号の最大値（側をまたいで見る。続紙の枚数は表に1つだけなので）。 */
function lastUsedRow(rowTable: CatalogRowTable, table: Record<string, string>): number {
  let last = 0;
  for (const side of rowTable.sides) {
    for (let row = rowTable.maxRows; row > last; row -= 1) {
      const filled = rowTable.columns.some(
        (column) => (table[cellName(side.prefix, row, column.key)] ?? '').trim() !== '',
      );
      if (filled) {
        last = row;
        break;
      }
    }
  }
  return last;
}

/** 欄に入っている枚数（画面と同じ読み方。空・壊れた値は本表だけとみなす）。 */
function currentPages(rowTable: CatalogRowTable, table: Record<string, string>): number {
  const raw = Number(table[rowTable.pages.field]);
  return Number.isFinite(raw) && raw >= rowTable.pages.base ? raw : rowTable.pages.base;
}

function pagesFor(rowTable: CatalogRowTable, lastRow: number): number {
  const { base, max } = rowTable.pages;
  if (lastRow <= rowTable.mainRows) return base;
  return Math.min(max, base + Math.ceil((lastRow - rowTable.mainRows) / rowTable.contRows));
}

/**
 * 読み取った明細を表へ入れる。
 *
 * 指定した側は**まるごと入れ替える**（1行目から詰め直す）。部分的に重ねると、
 * 前の取込で入っていた行が下に残ったまま合計だけ合わなくなり、画面を見ても
 * どこが古いのか分からない。消える行は呼び出し側へ返して、確定前に見せる。
 *
 * 続紙の枚数は**減らさない**。人が続紙を1枚足して手で書き始めているかもしれないので、
 * 入れた行に足りる枚数まで増やすだけにする。
 */
export function applyRows(
  catalog: FieldCatalog,
  data: CaseData,
  rowTableId: string,
  input: Partial<Record<string, readonly RowInput[]>>,
): ApplyRowsResult {
  const rowTable = findRowTable(catalog, rowTableId);
  const names = rowTable.columns.map((c) => c.name);

  const targets = rowTable.sides.filter((side) => input[side.key] !== undefined);
  if (targets.length === 0) {
    const keys = rowTable.sides.map((s) => `${s.key}（${s.label}）`).join(' / ');
    throw new InputError(`取り込む側が指定されていません。指定できるのは ${keys}`);
  }

  const table = { ...(data[rowTable.table] ?? {}) };
  const sides: SideChange[] = [];
  const intakeTargets: IntakeTarget[] = [];

  for (const side of targets) {
    const rowsInput = input[side.key] ?? [];
    if (rowsInput.length > rowTable.maxRows) {
      throw new InputError(
        `${side.label}の行数が上限を超えています（${rowsInput.length}行 / 上限 ${rowTable.maxRows}行）`,
      );
    }

    const before = readRows(rowTable, data, side.prefix);

    const after: DetailRow[] = rowsInput.map((raw, i) => {
      const row = i + 1;
      const where = `${side.label}${row}行目`;

      // 列名の打ち間違いは黙って落とすと「入れたのに入っていない」になるので弾く。
      for (const key of Object.keys(raw)) {
        if (!names.includes(key)) {
          throw new InputError(
            `${where}: ${key} という列はありません。指定できるのは ${names.join(' / ')}`,
          );
        }
      }

      const values: Record<string, string> = {};
      for (const column of rowTable.columns) {
        values[column.name] = normalizeValue(
          catalog,
          column.kind,
          raw[column.name],
          `${where}の${column.label}`,
          column.kind === 'enum' ? (side.options?.[column.name] ?? []) : [],
        );
      }

      for (const column of rowTable.columns) {
        if (column.required === true && values[column.name] === '') {
          throw new InputError(
            `${where}: ${column.label}が空です。`
            + '空行を挟むと以降の行がずれるので、行は詰めて渡してください',
          );
        }
      }

      return { row, values };
    });

    // 入れ替えなので、まずその側の行をすべて消す。
    for (let row = 1; row <= rowTable.maxRows; row += 1) {
      for (const column of rowTable.columns) {
        delete table[cellName(side.prefix, row, column.key)];
      }
    }
    for (const row of after) {
      for (const column of rowTable.columns) {
        const value = row.values[column.name] ?? '';
        if (value !== '') table[cellName(side.prefix, row.row, column.key)] = value;
      }
    }

    sides.push({ key: side.key, label: side.label, before, after });

    // 入れ替えで消える行の控えは落とす（残すと、もう無い行の出典が画面に出る）
    const head = rowTable.columns[0];
    if (head !== undefined) {
      const marks = new Map<string, boolean>();
      for (const row of before) {
        marks.set(storageKey(rowTable.table, cellName(side.prefix, row.row, head.key)), false);
      }
      for (const row of after) {
        marks.set(storageKey(rowTable.table, cellName(side.prefix, row.row, head.key)), true);
      }
      for (const [key, filled] of marks) intakeTargets.push({ key, filled });
    }
  }

  const pagesBefore = currentPages(rowTable, table);
  const pagesAfter = Math.max(pagesBefore, pagesFor(rowTable, lastUsedRow(rowTable, table)));
  if (pagesAfter !== pagesBefore) table[rowTable.pages.field] = String(pagesAfter);

  return {
    data: { ...data, [rowTable.table]: table },
    rowTable,
    sides,
    pages: { field: rowTable.pages.field, before: pagesBefore, after: pagesAfter },
    intakeTargets,
  };
}
