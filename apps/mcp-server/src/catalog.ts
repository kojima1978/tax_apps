/**
 * 欄の辞書。実体は株式評価明細書側（server/fieldCatalog.ts）にあり、
 * ここではその形を写して受け取るだけにしてある。
 *
 * このサーバに様式の知識を持たせないのは、様式が変わったときに片方だけ古くなるのを
 * 避けるため。どの欄が書き込めるか・単位は何か・負数をどう書くかは、すべて実行時に
 * 取ってきた辞書から決める。ここにあるのは辞書の使い方だけ。
 */
import { InputError } from './errors.js';

export type CatalogKind = 'integer' | 'signedInteger' | 'text' | 'enum';

export interface CatalogFormat {
  numeric: boolean;
  groupSeparator?: string;
  negativeMark?: string;
}

export interface CatalogField {
  code: string;
  form: string;
  table: string;
  field: string;
  label: string;
  period?: string;
  unit?: string;
  kind: CatalogKind;
  required?: boolean;
  hint?: string;
}

export interface CatalogRowSide {
  key: string;
  label: string;
  prefix: string;
  noteOptions: string[];
}

export interface CatalogRowColumn {
  index: number;
  label: string;
  kind: CatalogKind;
  unit?: string;
}

export interface CatalogRowTable {
  form: string;
  table: string;
  mainRows: number;
  contRows: number;
  maxPages: number;
  maxRows: number;
  sides: CatalogRowSide[];
  columns: CatalogRowColumn[];
}

export interface FieldCatalog {
  version: number;
  rules: string[];
  formats: Record<CatalogKind, CatalogFormat>;
  fields: CatalogField[];
  rowTables: CatalogRowTable[];
}

/** 表ID → 欄名 → 値。値は様式の入力欄と同じくすべて文字列。 */
export type CaseData = Record<string, Record<string, string>>;

/** 欄の呼び名。エラー文で「どの欄の話か」が分かるようにするためのもの。 */
export function fieldLabel(field: CatalogField): string {
  return field.period === undefined
    ? `${field.code} ${field.label}`
    : `${field.code} ${field.label}（${field.period}）`;
}

export function findField(catalog: FieldCatalog, code: string): CatalogField {
  const key = String(code).trim().toUpperCase();
  const found = catalog.fields.find((f) => f.code === key);
  if (found === undefined) {
    throw new InputError(
      `${code} という欄は辞書にありません。describe_fields で書き込める欄を確認してください`
      + '（自動計算欄・他表からの転記欄は、外から書けないよう辞書に載せていません）',
    );
  }
  return found;
}

/** 3桁区切りを入れる。 */
function group(digits: string, separator: string): string {
  const out: string[] = [];
  for (let i = digits.length; i > 0; i -= 3) {
    out.unshift(digits.slice(Math.max(0, i - 3), i));
  }
  return out.join(separator);
}

const CONTROL_CHARS = /[\x00-\x1f\x7f]/;
const DIGITS_ONLY = /^[0-9]+$/;
const LEADING_ZEROS = /^0+(?=[0-9])/;
const SPACES = /[ 　]/g;

/**
 * 受け取った値を、画面が保存しているのと同じ文字列に直す。
 *
 * 直すのは書き方（桁区切りと負号）だけで、値そのものには手を出さない。
 * 円→千円の換算も端数処理も行わないのは、1000倍ずれた数字が黙って入るより、
 * そのまま入って弾かれるほうが気づけるため（第5表の貼り付け取込と同じ考え方）。
 */
export function normalizeValue(
  catalog: FieldCatalog,
  kind: CatalogKind,
  raw: unknown,
  what: string,
  enumOptions: readonly string[] = [],
): string {
  const format = catalog.formats[kind];
  if (format === undefined) throw new InputError(`${what}: 辞書に ${kind} の書き方がありません`);

  let text: string;
  if (raw === null || raw === undefined) {
    text = '';
  } else if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) throw new InputError(`${what}: 数値として読めません`);
    if (!Number.isInteger(raw)) {
      throw new InputError(`${what}: 小数は受け付けません（${raw}）。端数処理は人が決めてください`);
    }
    text = String(raw);
  } else if (typeof raw === 'string') {
    text = raw.trim();
  } else {
    throw new InputError(`${what}: 文字列か数値で指定してください`);
  }

  if (!format.numeric) {
    if (kind === 'enum') {
      if (text === '') return '';
      if (!enumOptions.includes(text)) {
        const shown = enumOptions.length === 0 ? 'なし' : enumOptions.join(' / ');
        throw new InputError(
          `${what}: 「${text}」は選択肢にありません（選べるのは ${shown}、または空欄）。`
          + '近い言葉に読み替えることはしません',
        );
      }
      return text;
    }
    if (CONTROL_CHARS.test(text)) {
      throw new InputError(`${what}: 改行やタブを含む値は入れられません（1行の欄です）`);
    }
    return text;
  }

  if (text === '') return '';

  const separator = format.groupSeparator;
  let body = separator === undefined ? text : text.split(separator).join('');
  body = body.replace(SPACES, '');

  let negative = false;
  const marks = format.negativeMark === undefined ? ['-'] : ['-', format.negativeMark];
  for (const mark of marks) {
    if (body.startsWith(mark)) {
      negative = true;
      body = body.slice(mark.length);
      break;
    }
  }

  if (!DIGITS_ONLY.test(body)) {
    if (body.includes('.')) {
      throw new InputError(`${what}: 小数は受け付けません（${text}）。端数処理は人が決めてください`);
    }
    const allowed = format.negativeMark === undefined
      ? '半角数字のみ'
      : `半角数字と負号（- または ${format.negativeMark}）のみ`;
    throw new InputError(`${what}: 数字として読めません（${text}）。${allowed}で指定してください`);
  }

  const digits = body.replace(LEADING_ZEROS, '');
  if (digits === '0') negative = false;

  if (negative && format.negativeMark === undefined) {
    throw new InputError(`${what}: この欄はマイナスを受け付けません（${text}）`);
  }

  const formatted = separator === undefined ? digits : group(digits, separator);
  return negative ? `${format.negativeMark ?? '-'}${formatted}` : formatted;
}

export interface FieldValueInput {
  code: string;
  value?: unknown;
}

export interface FieldChange {
  code: string;
  label: string;
  period?: string;
  unit?: string;
  before: string;
  after: string;
  changed: boolean;
}

export interface ApplyFieldsResult {
  data: CaseData;
  changes: FieldChange[];
}

/**
 * 辞書に照らして値を検証し、案件データへ重ねた結果を返す（元のデータは変えない）。
 * 1つでも通らなければ何も書かない ── 一部だけ入った状態が一番たちが悪いため。
 */
export function applyFieldValues(
  catalog: FieldCatalog,
  data: CaseData,
  values: readonly FieldValueInput[],
): ApplyFieldsResult {
  if (values.length === 0) throw new InputError('書き込む欄が1つも指定されていません');

  const seen = new Set<string>();
  const resolved = values.map((entry) => {
    const field = findField(catalog, entry.code);
    if (seen.has(field.code)) {
      throw new InputError(`${field.code} が2回指定されています。1回にまとめてください`);
    }
    seen.add(field.code);
    return { field, value: normalizeValue(catalog, field.kind, entry.value, fieldLabel(field)) };
  });

  const next: CaseData = { ...data };
  const changes: FieldChange[] = [];
  for (const { field, value } of resolved) {
    const table = { ...(next[field.table] ?? {}) };
    const before = table[field.field] ?? '';
    table[field.field] = value;
    next[field.table] = table;
    changes.push({
      code: field.code,
      label: field.label,
      period: field.period,
      unit: field.unit,
      before,
      after: value,
      changed: before !== value,
    });
  }

  return { data: next, changes };
}

/** 案件データから、辞書に載っている欄の現在値を読み出す。 */
export function readFieldValues(catalog: FieldCatalog, data: CaseData): FieldChange[] {
  return catalog.fields.map((field) => {
    const value = data[field.table]?.[field.field] ?? '';
    return {
      code: field.code,
      label: field.label,
      period: field.period,
      unit: field.unit,
      before: value,
      after: value,
      changed: false,
    };
  });
}
