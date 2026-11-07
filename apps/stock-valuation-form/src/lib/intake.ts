/**
 * 取込の控え ── 外部ツール（MCP サーバー経由の Claude Desktop など）がどの欄を入れたか。
 *
 * 置き場所は案件データの中の `_intake` バケットで、鍵は「<バケット>.<保存キー>」＝入力欄の
 * name 属性と同じ形。だから控えから欄へそのまま飛べる（goToField に鍵をそのまま渡せる）。
 * 値は JSON 文字列で、案件データの形（表ID → 欄名 → 文字列）を崩していない。
 *
 * 画面の役目は3つ:
 *   1. 自動で入った欄に印を付け、出典をツールチップで見せる（印刷には出さない）
 *   2. 人が確認・入力する欄を一覧にする（自信なし・確認待ち・未入力の必須欄・自動化しない欄）
 *   3. 人が直した欄・確認した欄の印を消す
 *
 * 様式の知識（どの欄が必須か・何を人が入れるか）は辞書（server/fieldCatalog.ts）から
 * 実行時に取る。ここに写しを持たない。
 */
import type {
  CatalogField,
  CatalogRowTable,
  FieldCatalog,
} from '../../server/fieldCatalog';
import type { FormData, TableId } from '@/types/form';

/** 控えのバケット。辞書の CATALOG_INTAKE.table と同じ（食い違えばテストが落ちる）。 */
export const INTAKE_TABLE = '_intake';

/** 1欄ぶんの出典。 */
export interface IntakeMark {
  /** 読んだ資料のファイル名 */
  source: string;
  /** ページ番号 */
  page?: number;
  /** 読み取りのメモ */
  note?: string;
  /** 外部ツールが「自信なし」としたか */
  uncertain?: boolean;
  /** 人が画面で確認したか（印は消すが出典は残す） */
  confirmed?: boolean;
  /** 書き込んだ時刻（ISO8601） */
  at?: string;
}

export type IntakeMarks = Record<string, IntakeMark>;

/** 欄を指す鍵。入力欄の name 属性と同じ形にしてある。 */
export function intakeKey(table: string, field: string): string {
  return `${table}.${field}`;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/**
 * 控えの値（JSON 文字列）を読む。壊れていれば null ── 控えが読めないだけで
 * 入力が開けなくなるのは本末転倒なので、落とすのではなく無かったことにする。
 */
export function parseIntakeMark(raw: string | undefined): IntakeMark | null {
  if (raw === undefined || raw.trim() === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const mark = parsed as Record<string, unknown>;
  const source = optionalText(mark.source);
  if (source === undefined) return null;
  const page = typeof mark.page === 'number' && Number.isFinite(mark.page) ? mark.page : undefined;
  const note = optionalText(mark.note);
  const at = optionalText(mark.at);
  return {
    source,
    ...(page === undefined ? {} : { page }),
    ...(note === undefined ? {} : { note }),
    ...(mark.uncertain === true ? { uncertain: true } : {}),
    ...(mark.confirmed === true ? { confirmed: true } : {}),
    ...(at === undefined ? {} : { at }),
  };
}

export function encodeIntakeMark(mark: IntakeMark): string {
  return JSON.stringify(mark);
}

/** 読める控えだけを鍵つきで返す。 */
export function readIntakeMarks(data: FormData): IntakeMarks {
  const bucket = data[INTAKE_TABLE];
  if (bucket === undefined) return {};
  const marks: IntakeMarks = {};
  for (const [key, raw] of Object.entries(bucket)) {
    const mark = parseIntakeMark(raw);
    if (mark !== null) marks[key] = mark;
  }
  return marks;
}

/**
 * その欄の控えを引く（確認済みは印を出さないので null）。
 *
 * 和暦日付のように1つの欄が4つの保存キーに分かれているもの（f14 → f14_g/_y/_m/_d）は、
 * 欄の名前に `_` を足した前置きで拾う。
 */
export function lookupIntakeMark(
  marks: IntakeMarks,
  bucket: string,
  field: string | undefined,
): IntakeMark | null {
  if (field === undefined) return null;
  const key = intakeKey(bucket, field);
  const exact = marks[key];
  if (exact !== undefined) return exact.confirmed === true ? null : exact;
  const head = `${key}_`;
  for (const [candidate, mark] of Object.entries(marks)) {
    if (candidate.startsWith(head) && mark.confirmed !== true) return mark;
  }
  return null;
}

/** 控えが1件でもあるか（打鍵ごとに通るので、無いときは何もしない）。 */
export function hasIntakeMarks(data: FormData): boolean {
  const bucket = data[INTAKE_TABLE];
  return bucket !== undefined && Object.keys(bucket).length > 0;
}

function withBucket(data: FormData, bucket: Record<string, string>): FormData {
  if (Object.keys(bucket).length === 0) {
    const { [INTAKE_TABLE]: _drop, ...rest } = data;
    return rest as FormData;
  }
  return { ...data, [INTAKE_TABLE]: bucket };
}

/**
 * 人の編集で値が変わった欄の控えを落とす。
 *
 * 出典は「自動で入った値」の出典なので、人が値を変えた時点で合わなくなる。
 * 確認済み（confirmed）と違って残さない。直した欄だけでなく、それに連動して
 * 変わった欄（業種目番号に連れて変わる名称など）の控えも一緒に落ちる。
 */
export function dropChangedIntakeMarks(before: FormData, after: FormData): FormData {
  const bucket = after[INTAKE_TABLE];
  if (bucket === undefined) return after;
  let next: Record<string, string> | null = null;
  for (const key of Object.keys(bucket)) {
    const at = key.indexOf('.');
    if (at < 0) continue;
    const table = key.slice(0, at) as TableId;
    const field = key.slice(at + 1);
    if ((before[table] ?? {})[field] === (after[table] ?? {})[field]) continue;
    next ??= { ...bucket };
    delete next[key];
  }
  return next === null ? after : withBucket(after, next);
}

/** 「確認済み」にする（印は消し、出典は残す）。 */
export function confirmIntakeMarks(data: FormData, keys: readonly string[]): FormData {
  const bucket = data[INTAKE_TABLE];
  if (bucket === undefined) return data;
  const next = { ...bucket };
  let changed = false;
  for (const key of keys) {
    const mark = parseIntakeMark(next[key]);
    if (mark === null || mark.confirmed === true) continue;
    next[key] = encodeIntakeMark({ ...mark, confirmed: true });
    changed = true;
  }
  return changed ? withBucket(data, next) : data;
}

/** 欄に出すツールチップ（出典・ページ・メモ）。 */
export function intakeTooltip(mark: IntakeMark): string {
  const head = mark.page === undefined ? mark.source : `${mark.source} ${mark.page}ページ`;
  return [
    mark.uncertain === true ? `自動入力（要確認）: ${head}` : `自動入力: ${head}`,
    mark.note,
    '値を直すか「取込の確認」で確認済みにすると、この印は消えます',
  ].filter((line): line is string => line !== undefined && line !== '').join('\n');
}

/* ------------------------------------------------------------------ *
 * 人が確認・入力する欄の一覧
 * ------------------------------------------------------------------ */

/** 移動先のタブ。第4表の1／2 と第7表のように、1つのバケットを2画面で使う表があるので様式名で引く。 */
const TAB_OF_FORM: Record<string, TableId> = {
  第1表の1: 'table1_1',
  第1表の2: 'table1_2',
  第4表の1: 'table4_1',
  第4表の2: 'table4_2',
  第5表: 'table5',
};

/** 様式名が分からないときの保険（バケットから引く）。 */
const TAB_OF_TABLE: Record<string, TableId> = {
  table1_1: 'table1_1',
  table1_2: 'table1_2',
  table4: 'table4_1',
  table5: 'table5',
};

function tabFor(form: string | undefined, table: string): TableId {
  return TAB_OF_FORM[form ?? ''] ?? TAB_OF_TABLE[table] ?? 'table1_1';
}

export type ReviewKind = 'uncertain' | 'auto' | 'required' | 'manual';

/** 一覧の1行。どこへ飛ぶか（tab と name）と、何を見てほしいか（title / detail）。 */
export interface ReviewRow {
  id: string;
  kind: ReviewKind;
  tab: TableId;
  /** 入力欄の name 属性。欄を1つに絞れないときは null（表を開くだけ） */
  name: string | null;
  title: string;
  detail: string;
  /** 控えの鍵（「確認済み」にできる行だけ持つ） */
  intakeKey?: string;
}

function fieldTitle(field: CatalogField): string {
  const period = field.period === undefined ? '' : `（${field.period}）`;
  return `${field.form} ${field.label}${period}`;
}

/** 明細行の保存キー（`a_12_3`）を様式の言葉に直す。 */
function describeRowCell(
  rowTable: CatalogRowTable,
  field: string,
): { title: string; form: string } | null {
  for (const side of rowTable.sides) {
    const head = `${side.prefix}_`;
    if (!field.startsWith(head)) continue;
    const rest = field.slice(head.length);
    const at = rest.indexOf('_');
    if (at < 0) continue;
    const row = Number(rest.slice(0, at));
    const columnKey = rest.slice(at + 1);
    const column = rowTable.columns.find((c) => c.key === columnKey);
    if (!Number.isInteger(row) || column === undefined) continue;
    return {
      form: rowTable.form,
      title: `${rowTable.form} ${side.label}${row}行目の${column.label}`,
    };
  }
  return null;
}

/** 控えの鍵を様式の言葉に直す（辞書に無い欄でも鍵だけは出す）。 */
export function describeIntakeKey(
  catalog: FieldCatalog,
  key: string,
): { title: string; tab: TableId } {
  const at = key.indexOf('.');
  const table = at < 0 ? '' : key.slice(0, at);
  const field = at < 0 ? key : key.slice(at + 1);

  const named = catalog.fields.find((f) => f.table === table && f.field === field);
  if (named !== undefined) {
    return { title: fieldTitle(named), tab: tabFor(named.form, table) };
  }

  // 課税時期などの日付欄は4つに分かれて保存されている（f14_y / f14_m …）
  const identity = catalog.caseIdentity;
  if (identity.table === table) {
    if (identity.companyName.field === field) {
      return { title: `${identity.form} 会社名`, tab: tabFor(identity.form, table) };
    }
    for (const date of identity.dates) {
      for (const part of identity.parts) {
        if (`${date.prefix}${part.keySuffix}` !== field) continue;
        const suffix = part.labelSuffix === '' ? '元号' : part.labelSuffix;
        return { title: `${identity.form} ${date.label}の${suffix}`, tab: tabFor(identity.form, table) };
      }
    }
  }

  for (const rowTable of catalog.rowTables) {
    if (rowTable.table !== table) continue;
    const described = describeRowCell(rowTable, field);
    if (described !== null) return { title: described.title, tab: tabFor(described.form, table) };
  }

  return { title: key, tab: tabFor(undefined, table) };
}

function valueOf(data: FormData, table: string, field: string): string {
  return (data[table as TableId] ?? {})[field] ?? '';
}

/** その列が空のままの行数（明細の「相続税評価額」のように、人が後から入れる列を数える）。 */
function emptyColumnRows(
  catalog: FieldCatalog,
  data: FormData,
  rowTableId: string,
  columnName: string,
): number {
  const rowTable = catalog.rowTables.find((t) => t.id === rowTableId);
  if (rowTable === undefined) return 0;
  const target = rowTable.columns.find((c) => c.name === columnName);
  if (target === undefined) return 0;
  const keys = rowTable.columns.filter((c) => c.required === true).map((c) => c.key);

  let count = 0;
  for (const side of rowTable.sides) {
    for (let row = 1; row <= rowTable.maxRows; row += 1) {
      const filled = keys.some((key) => valueOf(data, rowTable.table, `${side.prefix}_${row}_${key}`).trim() !== '');
      if (!filled) continue;
      if (valueOf(data, rowTable.table, `${side.prefix}_${row}_${target.key}`).trim() === '') count += 1;
    }
  }
  return count;
}

/**
 * 人が確認・入力する欄の一覧。
 *
 * 並びは「自信なし → 自動入力（確認待ち）→ 未入力の必須欄 → 自動化しない欄」。
 * 自動で入った欄を先に出すのは、機械が入れた数字を人が通し読みする作業が先にあるため。
 */
export function reviewRows(catalog: FieldCatalog | null, data: FormData): ReviewRow[] {
  if (catalog === null) return [];
  const marks = readIntakeMarks(data);
  const rows: ReviewRow[] = [];

  for (const [key, mark] of Object.entries(marks)) {
    if (mark.confirmed === true) continue;
    const { title, tab } = describeIntakeKey(catalog, key);
    const head = mark.page === undefined ? mark.source : `${mark.source} ${mark.page}ページ`;
    rows.push({
      id: `intake:${key}`,
      kind: mark.uncertain === true ? 'uncertain' : 'auto',
      tab,
      name: key,
      title,
      detail: [mark.uncertain === true ? '自信なし' : null, head, mark.note]
        .filter((part): part is string => part !== null && part !== undefined && part !== '')
        .join(' / '),
      intakeKey: key,
    });
  }

  for (const field of catalog.fields) {
    if (field.required !== true) continue;
    if (valueOf(data, field.table, field.field).trim() !== '') continue;
    const key = intakeKey(field.table, field.field);
    // 自動で入った欄として既に並んでいるなら重ねない
    if (marks[key] !== undefined && marks[key]?.confirmed !== true) continue;
    rows.push({
      id: `required:${key}`,
      kind: 'required',
      tab: tabFor(field.form, field.table),
      name: key,
      title: fieldTitle(field),
      detail: field.hint ?? '比準要素の計算に要る欄',
    });
  }

  for (const item of catalog.manualItems) {
    const tab = tabFor(item.form, item.table);
    if (item.rowTable !== undefined && item.column !== undefined) {
      const empty = emptyColumnRows(catalog, data, item.rowTable, item.column);
      if (empty === 0) continue;
      rows.push({
        id: `manual:${item.key}`,
        kind: 'manual',
        tab,
        name: null,
        title: `${item.form} ${item.label}`,
        detail: `${empty}行が未入力 / ${item.why}`,
      });
      continue;
    }
    const fields = item.fields ?? [];
    const empty = fields.filter((field) => valueOf(data, item.table, field).trim() === '');
    // 入力済みの欄は出さない（欄を持たない項目は、確かめようがないので毎回出す）
    if (fields.length > 0 && empty.length === 0) continue;
    rows.push({
      id: `manual:${item.key}`,
      kind: 'manual',
      tab,
      name: empty[0] === undefined ? null : intakeKey(item.table, empty[0]),
      title: `${item.form} ${item.label}`,
      detail: item.why,
    });
  }

  const order: Record<ReviewKind, number> = { uncertain: 0, auto: 1, required: 2, manual: 3 };
  return rows.sort((a, b) => order[a.kind] - order[b.kind]);
}

