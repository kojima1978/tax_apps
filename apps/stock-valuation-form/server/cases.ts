// 案件（評価する会社1社ぶんの入力データ）の検証と、APIが返す形。
//
// サーバは様式の中身を知らない。どの欄が会社名でどれが課税時期かはフロントの領分なので、
// 保存時に一緒に送ってもらい、ここでは「表ID → 欄名 → 値（文字列）」という入れ子の形だけを
// 確かめる。こうしておくと様式が改訂されてもサーバ側は変更が要らない。

import { ValidationError, asRecord, asString } from './validation.js';

/**
 * 1案件のデータ量の上限。空の骨格で1KB弱、第5表を埋めきっても数十KBなので、
 * 2MBは事故（別物のJSONを投げ込んだ等）を弾くための線であって実用上の制限ではない。
 */
export const MAX_DATA_BYTES = 2_000_000;

const MAX_COMPANY_NAME_LENGTH = 200;
const MAX_TAX_PERIOD_LENGTH = 100;

/** 表ID → 欄名 → 値。値は様式の入力欄と同じくすべて文字列。 */
export type CaseFormData = Record<string, Record<string, string>>;

export interface ParsedCaseInput {
  companyName: string;
  taxPeriod: string;
  data: CaseFormData;
}

function label(value: unknown, what: string, max: number): string {
  if (value === undefined || value === null) return '';
  const text = asString(value, what).trim();
  if (text.length > max) {
    throw new ValidationError(`${what}は${max}文字以内で指定してください`);
  }
  return text;
}

/**
 * 入力値の入れ子。表と欄の名前は検査しない（様式の追加・改廃でサーバを直さずに済むように）。
 * 確かめるのは「オブジェクトの中がオブジェクトで、その中身が文字列」であることだけ。
 */
export function parseCaseData(raw: unknown, what = 'data'): CaseFormData {
  const tables = asRecord(raw, what);

  if (Buffer.byteLength(JSON.stringify(tables)) > MAX_DATA_BYTES) {
    throw new ValidationError(
      `${what}が大きすぎます（上限 ${MAX_DATA_BYTES / 1_000_000}MB）。この明細書のデータではない可能性があります`,
    );
  }

  return Object.fromEntries(
    Object.entries(tables).map(([tableId, fields]) => [
      tableId,
      Object.fromEntries(
        Object.entries(asRecord(fields, `${what}.${tableId}`)).map(([field, value]) => [
          field,
          asString(value, `${what}.${tableId}.${field}`),
        ]),
      ),
    ]),
  );
}

/** 保存（POST）・上書き（PUT）のリクエスト本体。 */
export function parseCaseInput(raw: unknown, what = 'リクエスト本体'): ParsedCaseInput {
  const body = asRecord(raw, what);
  return {
    companyName: label(body.companyName, '会社名', MAX_COMPANY_NAME_LENGTH),
    taxPeriod: label(body.taxPeriod, '課税時期', MAX_TAX_PERIOD_LENGTH),
    data: parseCaseData(body.data),
  };
}

/** URL の :id。整数以外は400に倒す（Prisma まで持ち込まない）。 */
export function parseCaseId(param: string): number {
  const id = Number(param);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError('案件IDは正の整数で指定してください');
  }
  return id;
}

/** 複製した案件の名前。元が空のままでも「どれが複製か」が一覧で分かるようにする。 */
export function copiedCaseName(companyName: string): string {
  const base = companyName.trim();
  const copied = base === '' ? '（コピー）' : `${base}（コピー）`;
  return copied.length > MAX_COMPANY_NAME_LENGTH
    ? copied.slice(0, MAX_COMPANY_NAME_LENGTH)
    : copied;
}

export interface CaseRow {
  id: number;
  companyName: string;
  taxPeriod: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** 一覧用。入力データは載せない（案件が増えるほど重くなるため）。 */
export function toCaseSummary(row: CaseRow) {
  return {
    id: row.id,
    companyName: row.companyName,
    taxPeriod: row.taxPeriod,
    archivedAt: row.archivedAt === null ? null : row.archivedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** 1件取得用。入力データまで載せる。 */
export function toCaseResponse(row: CaseRow & { data: unknown }) {
  return { ...toCaseSummary(row), data: row.data };
}
