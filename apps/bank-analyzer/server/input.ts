// 画面から届いた値の読み取り。Django 版は読めない値を黙って 0 や「変更なし」にしていた
// （金額の「1,2x」が 0 円で登録される、日付の打ち間違いが日付なしで登録される）ので、
// こちらは読めなければ理由を返して何も書かない。

import { parseAmountInput } from './lib/aggregate.js';
import { toIsoDate } from './lib/dates.js';
import { parseId } from './json.js';

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });
const fail = (error: string): Parsed<never> => ({ ok: false, error });

// 金額の列は PostgreSQL の integer（Django の IntegerField）
const INT_MIN = -2147483648;
const INT_MAX = 2147483647;

// 金額。数値でも「1,234」のような文字列でもよい。空なら emptyValue。
export function parseAmountValue<E extends number | null>(value: unknown, label: string, emptyValue: E): Parsed<number | E> {
  if (value === undefined || value === null || value === '') return ok(emptyValue);
  let n: number | null;
  if (typeof value === 'number') n = Number.isInteger(value) ? value : null;
  else if (typeof value === 'string') n = parseAmountInput(value);
  else n = null;
  if (n === null) return fail(`${label}が不正な値です`);
  if (n < INT_MIN || n > INT_MAX) return fail(`${label}が大きすぎます`);
  return ok(n);
}

export const DATE_FORMAT_ERROR = '日付の形式が正しくありません（YYYY-MM-DD）';

// 'YYYY-MM-DD'（実在する日だけ）。空なら null。
export function parseDateValue(value: unknown): Parsed<Date | null> {
  if (value === undefined || value === null || value === '') return ok(null);
  if (typeof value !== 'string') return fail(DATE_FORMAT_ERROR);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  const iso = m ? toIsoDate(Number(m[1]), Number(m[2]), Number(m[3])) : null;
  return iso ? ok(new Date(`${iso}T00:00:00Z`)) : fail(DATE_FORMAT_ERROR);
}

// 文字列の欄。前後の空白を落とし、空なら null。文字列以外（数値など）も文字にする。
export function optionalText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

// ID の一覧。1つでも整数でなければ全体を null（Django の parse_int_ids と同じ全か無か）。
export function parseIdList(value: unknown): bigint[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.map((v) => parseId(typeof v === 'string' ? v.trim() : v));
  return ids.every((id): id is bigint => id !== null) ? ids : null;
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
