// 業種目データ「1年分アーカイブ」の検証と取込。
//
// 管理API（routes/industryAdmin.ts の POST /industry-years）と起動時のシード（seed.ts）は
// 同じ形のJSONを受け取るので、検証とDBへの書き込みをここに一本化する。
// 形は書き出しAPI（routes/industry.ts の GET /industry-years/:gregorianYear/export）と対。

import type { IndustryLevel, Prisma, PrismaClient } from '@prisma/client';
import { gregorianYearOf, industryYearLabel } from './wareki.js';

/** `$transaction` のコールバックが受け取るクライアント（$transaction 等を持たない）。 */
type TransactionClient = Prisma.TransactionClient;

/** 115業種目 × (業種目 + 比準要素 + 月別株価) を1トランザクションで流すため、既定の5秒では足りない。 */
export const BULK_TRANSACTION_OPTIONS = { timeout: 120_000, maxWait: 20_000 };

const LEVELS: readonly IndustryLevel[] = ['LARGE', 'MIDDLE', 'SMALL'];

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

export interface ParsedMonthlyPrice {
  year: number;
  month: number;
  price: number;
  twoYearAveragePrice: number | null;
}

export function parseMonthlyPrice(raw: unknown, what: string): ParsedMonthlyPrice {
  const row = asRecord(raw, what);
  return {
    year: asInt(row.year, `${what}の year`),
    month: asMonth(row.month, `${what}の month`),
    price: asInt(row.price, `${what}の price`),
    twoYearAveragePrice: asNullableInt(row.twoYearAveragePrice, `${what}の twoYearAveragePrice`),
  };
}

export interface ParsedCategory {
  number: number;
  largeName: string;
  middleName: string;
  smallName: string;
  name: string;
  level: IndustryLevel;
  description: string;
  dividend: number;
  profit: number;
  netAsset: number;
  previousYearAveragePrice: number;
  monthlyPrices: ParsedMonthlyPrice[];
}

export function parseCategory(raw: unknown, index: number): ParsedCategory {
  const what = `categories[${index}]`;
  const row = asRecord(raw, what);

  const level = asString(row.level, `${what}の level`);
  if (!LEVELS.includes(level as IndustryLevel)) {
    throw new ValidationError(`${what}の level は LARGE / MIDDLE / SMALL のいずれかです`);
  }

  return {
    number: asInt(row.number, `${what}の number`),
    largeName: asString(row.largeName, `${what}の largeName`),
    middleName: optionalString(row.middleName, `${what}の middleName`),
    smallName: optionalString(row.smallName, `${what}の smallName`),
    name: asString(row.name, `${what}の name`),
    level: level as IndustryLevel,
    description: optionalString(row.description, `${what}の description`),
    dividend: asFiniteNumber(row.dividend, `${what}の dividend`),
    profit: asInt(row.profit, `${what}の profit`),
    netAsset: asInt(row.netAsset, `${what}の netAsset`),
    previousYearAveragePrice: asInt(
      row.previousYearAveragePrice,
      `${what}の previousYearAveragePrice`,
    ),
    monthlyPrices: asArray(row.monthlyPrices ?? [], `${what}の monthlyPrices`).map((price, i) =>
      parseMonthlyPrice(price, `${what}.monthlyPrices[${i}]`),
    ),
  };
}

/** 検証済みの1年分。DB内部のIDは持たない（年分の同定は元号と西暦で行う）。 */
export interface ParsedArchive {
  era: string;
  eraYear: number;
  gregorianYear: number;
  label: string;
  categories: ParsedCategory[];
}

/**
 * 年分アーカイブを検証して読み解く。西暦年とラベルは元号から導き直すので、
 * ファイル側の gregorianYear / label がずれていても元号が正となる。
 * `what` はエラーメッセージの主語（APIなら「リクエスト本体」、シードならファイル名）。
 */
export function parseArchive(raw: unknown, what = 'リクエスト本体'): ParsedArchive {
  const body = asRecord(raw, what);

  const era = asString(body.era, 'era');
  const eraYear = asInt(body.eraYear, 'eraYear');
  // 未知の元号は素の Error で落ちるので、入力エラーとして扱えるよう包み直す。
  let gregorianYear: number;
  try {
    gregorianYear = gregorianYearOf(era, eraYear);
  } catch (error) {
    throw new ValidationError(error instanceof Error ? error.message : String(error));
  }

  const categories = asArray(body.categories, 'categories').map(parseCategory);
  if (categories.length === 0) {
    throw new ValidationError('業種目が1件も含まれていません');
  }

  const duplicated = categories
    .map(({ number }) => number)
    .filter((number, index, numbers) => numbers.indexOf(number) !== index);
  if (duplicated.length > 0) {
    throw new ValidationError('業種目番号が重複しています', {
      numbers: [...new Set(duplicated)].sort((a, b) => a - b),
    });
  }

  return { era, eraYear, gregorianYear, label: industryYearLabel(era, eraYear), categories };
}

export interface CreatedYear {
  id: number;
  label: string;
  gregorianYear: number;
  categoryCount: number;
  monthlyPriceCount: number;
}

/** 年分の本体を1つ書き込む。呼び出し側がトランザクションを持つ（新規登録と入れ直しで共用）。 */
async function writeIndustryYear(tx: TransactionClient, archive: ParsedArchive) {
  const year = await tx.industryYear.create({
    data: {
      era: archive.era,
      eraYear: archive.eraYear,
      gregorianYear: archive.gregorianYear,
      label: archive.label,
    },
  });

  for (const category of archive.categories) {
    await tx.industryCategory.create({
      data: {
        yearId: year.id,
        number: category.number,
        largeName: category.largeName,
        middleName: category.middleName,
        smallName: category.smallName,
        name: category.name,
        level: category.level,
        description: category.description,
        metric: {
          create: {
            dividend: category.dividend,
            profit: category.profit,
            netAsset: category.netAsset,
            previousYearAveragePrice: category.previousYearAveragePrice,
          },
        },
        monthlyPrices: { create: category.monthlyPrices },
      },
    });
  }

  return year;
}

function countsOf(created: { id: number; label: string; gregorianYear: number }, archive: ParsedArchive): CreatedYear {
  return {
    id: created.id,
    label: created.label,
    gregorianYear: created.gregorianYear,
    categoryCount: archive.categories.length,
    monthlyPriceCount: archive.categories.reduce(
      (sum, { monthlyPrices }) => sum + monthlyPrices.length,
      0,
    ),
  };
}

/**
 * 検証済みの年分をまるごと新規登録する。業種目マスタ・B/C/D・前年平均・月別株価を
 * 1トランザクションで入れる（途中で落ちて中途半端な年分が残らないように）。
 * 同じ年分が既にあるときの振る舞いは呼び出し側で決める（APIは409、シードは読み飛ばし）。
 */
export async function createIndustryYear(
  db: PrismaClient,
  archive: ParsedArchive,
): Promise<CreatedYear> {
  const created = await db.$transaction(
    (tx) => writeIndustryYear(tx, archive),
    BULK_TRANSACTION_OPTIONS,
  );
  return countsOf(created, archive);
}

/**
 * 既にある年分を、アーカイブの内容で入れ直す（削除と登録で1トランザクション）。
 *
 * 消すのは **引数の年分だけ**。他の年分には触れないので、アーカイブの無い年分
 * （画面から登録したまま `industry:save` していないもの）が巻き込まれることはない。
 * 途中で落ちても消しただけの状態は残らない。
 *
 * この関数を呼ぶ経路は「その年分を入れ直す」と名指しできる場所に限る
 * （PUT /industry-years/:gregorianYear と `npm run industry:reseed`）。
 * 起動時のシードは決してここを通さない ── 環境変数の消し忘れで
 * 再起動のたびにデータが作り直される、という壊れ方を作らないため。
 */
export async function replaceIndustryYear(
  db: PrismaClient,
  archive: ParsedArchive,
): Promise<CreatedYear> {
  const created = await db.$transaction(async (tx) => {
    // 子テーブル（業種目・比準要素・月別株価）は onDelete: Cascade で一緒に消える。
    await tx.industryYear.deleteMany({ where: { gregorianYear: archive.gregorianYear } });
    return writeIndustryYear(tx, archive);
  }, BULK_TRANSACTION_OPTIONS);
  return countsOf(created, archive);
}
