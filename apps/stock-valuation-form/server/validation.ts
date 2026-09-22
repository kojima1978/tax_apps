// APIとシードが共通で使う入力検証のプリミティブ。
//
// 業種目アーカイブ（industryArchive.ts）と案件（cases.ts）の双方から使うため、
// どちらの都合にも寄らないようにここへ置く。エラーは ValidationError に統一し、
// 呼び出し側（ルータ）が 400 に倒す。

/** 入力の不備。APIでは400、シードでは起動失敗（health 503）に落ちる。 */
export class ValidationError extends Error {
  constructor(message: string, readonly detail?: unknown) {
    super(message);
  }
}

export function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(`${what}はオブジェクトで指定してください`);
  }
  return value as Record<string, unknown>;
}

export function asArray(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) throw new ValidationError(`${what}は配列で指定してください`);
  return value;
}

export function asInt(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ValidationError(`${what}は整数で指定してください`);
  }
  return value;
}

export function asFiniteNumber(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`${what}は数値で指定してください`);
  }
  return value;
}

export function asString(value: unknown, what: string): string {
  if (typeof value !== 'string') throw new ValidationError(`${what}は文字列で指定してください`);
  return value;
}

export function optionalString(value: unknown, what: string, fallback = ''): string {
  return value === undefined || value === null ? fallback : asString(value, what);
}

export function asMonth(value: unknown, what: string): number {
  const month = asInt(value, what);
  if (month < 1 || month > 12) throw new ValidationError(`${what}は1〜12で指定してください`);
  return month;
}

/** 株価・利益・純資産は円単位の非負整数。null は「未公表」の意味で通す。 */
export function asNullableInt(value: unknown, what: string): number | null {
  if (value === undefined || value === null) return null;
  return asInt(value, what);
}

/** ValidationError は入力の不備なので400、それ以外は投げ直して Hono の500に任せる。 */
export function toErrorResponse(error: unknown) {
  if (error instanceof ValidationError) {
    return { body: { error: error.message, detail: error.detail }, status: 400 as const };
  }
  throw error;
}
