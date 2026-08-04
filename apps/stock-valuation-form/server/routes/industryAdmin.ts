// 業種目マスタ・業種目別株価等の書き込みAPI（管理画面 #industry-data 用）。
//
// 読み取りAPI（industry.ts）と分けてあるのは、こちらだけが DB を書き換えるため。
// 削除は月別株価（1業種目単位・1ヶ月まるごと）だけに限る。年分そのものの削除は用意しない：
// 1つ消すと業種目115件と全月の株価が Cascade で道連れになるので、
// そこまで戻したくなったらバックアップからのリストアで戻す（docker/scripts/backup.sh）。

import { Hono } from 'hono';
import { Prisma, type IndustryLevel, type PrismaClient } from '@prisma/client';
import { gregorianYearOf, industryYearLabel } from '../wareki.js';

/** 115業種目 × (業種目 + 比準要素 + 月別株価) を1トランザクションで流すため、既定の5秒では足りない。 */
const BULK_TRANSACTION_OPTIONS = { timeout: 120_000, maxWait: 20_000 };

const LEVELS: readonly IndustryLevel[] = ['LARGE', 'MIDDLE', 'SMALL'];

class ValidationError extends Error {
  constructor(message: string, readonly detail?: unknown) {
    super(message);
  }
}

/** 検証エラーは400、それ以外は投げ直して Hono の500に任せる。 */
function toErrorResponse(error: unknown) {
  if (error instanceof ValidationError) {
    return { body: { error: error.message, detail: error.detail }, status: 400 as const };
  }
  throw error;
}

function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(`${what}はオブジェクトで指定してください`);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) throw new ValidationError(`${what}は配列で指定してください`);
  return value;
}

function asInt(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ValidationError(`${what}は整数で指定してください`);
  }
  return value;
}

function asFiniteNumber(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`${what}は数値で指定してください`);
  }
  return value;
}

function asString(value: unknown, what: string): string {
  if (typeof value !== 'string') throw new ValidationError(`${what}は文字列で指定してください`);
  return value;
}

function optionalString(value: unknown, what: string, fallback = ''): string {
  return value === undefined || value === null ? fallback : asString(value, what);
}

function asMonth(value: unknown, what: string): number {
  const month = asInt(value, what);
  if (month < 1 || month > 12) throw new ValidationError(`${what}は1〜12で指定してください`);
  return month;
}

/** 株価・利益・純資産は円単位の非負整数。null は「未公表」の意味で通す。 */
function asNullableInt(value: unknown, what: string): number | null {
  if (value === undefined || value === null) return null;
  return asInt(value, what);
}

interface ParsedMonthlyPrice {
  year: number;
  month: number;
  price: number;
  twoYearAveragePrice: number | null;
}

function parseMonthlyPrice(raw: unknown, what: string): ParsedMonthlyPrice {
  const row = asRecord(raw, what);
  return {
    year: asInt(row.year, `${what}の year`),
    month: asMonth(row.month, `${what}の month`),
    price: asInt(row.price, `${what}の price`),
    twoYearAveragePrice: asNullableInt(row.twoYearAveragePrice, `${what}の twoYearAveragePrice`),
  };
}

interface ParsedCategory {
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

function parseCategory(raw: unknown, index: number): ParsedCategory {
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

export function createIndustryAdminRouter(db: PrismaClient) {
  const router = new Hono();

  /** URL の :gregorianYear から年分を引く。未登録なら null。 */
  async function findYear(param: string) {
    const gregorianYear = Number(param);
    if (!Number.isInteger(gregorianYear)) {
      throw new ValidationError('西暦年は整数で指定してください');
    }
    return db.industryYear.findUnique({ where: { gregorianYear } });
  }

  /**
   * 年分をまるごと新規登録する。業種目マスタ・B/C/D・前年平均・初回分の月別株価を
   * 1トランザクションで入れる（途中で落ちて中途半端な年分が残らないように）。
   */
  router.post('/industry-years', async (c) => {
    try {
      const body = asRecord(await c.req.json(), 'リクエスト本体');

      const era = asString(body.era, 'era');
      const eraYear = asInt(body.eraYear, 'eraYear');
      // 未知の元号は素の Error で落ちるので、入力エラーとして 400 に寄せる。
      let gregorianYear: number;
      try {
        gregorianYear = gregorianYearOf(era, eraYear);
      } catch (error) {
        throw new ValidationError(error instanceof Error ? error.message : String(error));
      }
      const label = industryYearLabel(era, eraYear);

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

      const existing = await db.industryYear.findUnique({ where: { gregorianYear } });
      if (existing) {
        return c.json(
          { error: `${label}は既に登録されています。「登録済みの年分」から開いて更新してください` },
          409,
        );
      }

      const created = await db.$transaction(async (tx) => {
        const year = await tx.industryYear.create({
          data: {
            era,
            eraYear,
            gregorianYear,
            label,
          },
        });

        for (const category of categories) {
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
      }, BULK_TRANSACTION_OPTIONS);

      return c.json(
        {
          year: { id: created.id, label: created.label, gregorianYear: created.gregorianYear },
          categoryCount: categories.length,
          monthlyPriceCount: categories.reduce((sum, { monthlyPrices }) => sum + monthlyPrices.length, 0),
        },
        201,
      );
    } catch (error) {
      const { body, status } = toErrorResponse(error);
      return c.json(body, status);
    }
  });

  /**
   * 月次株価の一括取込。同じ (業種目, 年, 月) が既にあれば上書きする。
   * 公表は115業種目そろって出るが、部分的な訂正も通せるように件数は縛らない。
   */
  router.post('/industry-years/:gregorianYear/monthly-prices', async (c) => {
    try {
      const year = await findYear(c.req.param('gregorianYear'));
      if (!year) return c.json({ error: '指定された年分は登録されていません' }, 404);

      const body = asRecord(await c.req.json(), 'リクエスト本体');
      const priceYear = asInt(body.year, 'year');
      const priceMonth = asMonth(body.month, 'month');

      const rows = asArray(body.rows, 'rows').map((raw, index) => {
        const row = asRecord(raw, `rows[${index}]`);
        return {
          number: asInt(row.number, `rows[${index}]の number`),
          price: asInt(row.price, `rows[${index}]の price`),
          twoYearAveragePrice: asNullableInt(
            row.twoYearAveragePrice,
            `rows[${index}]の twoYearAveragePrice`,
          ),
        };
      });
      if (rows.length === 0) throw new ValidationError('取り込む行がありません');

      const duplicated = rows
        .map(({ number }) => number)
        .filter((number, index, numbers) => numbers.indexOf(number) !== index);
      if (duplicated.length > 0) {
        throw new ValidationError('業種目番号が重複しています', {
          numbers: [...new Set(duplicated)].sort((a, b) => a - b),
        });
      }

      const categories = await db.industryCategory.findMany({
        where: { yearId: year.id, number: { in: rows.map(({ number }) => number) } },
        select: { id: true, number: true },
      });
      const categoryIdByNumber = new Map(categories.map(({ number, id }) => [number, id]));

      const unknown = rows
        .map(({ number }) => number)
        .filter((number) => !categoryIdByNumber.has(number));
      if (unknown.length > 0) {
        throw new ValidationError(`${year.label}に存在しない業種目番号が含まれています`, {
          numbers: unknown,
        });
      }

      const result = await db.$transaction(async (tx) => {
        let created = 0;
        let updated = 0;

        for (const row of rows) {
          const categoryId = categoryIdByNumber.get(row.number)!;
          const where = {
            categoryId_year_month: { categoryId, year: priceYear, month: priceMonth },
          };
          const before = await tx.industryMonthlyPrice.findUnique({ where });

          await tx.industryMonthlyPrice.upsert({
            where,
            create: {
              categoryId,
              year: priceYear,
              month: priceMonth,
              price: row.price,
              twoYearAveragePrice: row.twoYearAveragePrice,
            },
            update: { price: row.price, twoYearAveragePrice: row.twoYearAveragePrice },
          });

          if (before) updated += 1;
          else created += 1;
        }

        return { created, updated };
      }, BULK_TRANSACTION_OPTIONS);

      return c.json({
        year: { id: year.id, label: year.label, gregorianYear: year.gregorianYear },
        priceYear,
        priceMonth,
        ...result,
      });
    } catch (error) {
      const { body, status } = toErrorResponse(error);
      return c.json(body, status);
    }
  });

  /**
   * 月別株価の削除。`numbers` を渡せばその業種目だけ、省略すればその月をまるごと消す。
   * 年分を間違えて取り込んだときの出口。業種目マスタ・B/C/D は消さない。
   */
  router.delete('/industry-years/:gregorianYear/monthly-prices/:priceYear/:priceMonth', async (c) => {
    try {
      const year = await findYear(c.req.param('gregorianYear'));
      if (!year) return c.json({ error: '指定された年分は登録されていません' }, 404);

      const priceYear = asInt(Number(c.req.param('priceYear')), '対象年');
      const priceMonth = asMonth(Number(c.req.param('priceMonth')), '対象月');

      // 本体なしは「その月を全件」。fetch は本体無しの DELETE を普通に送るので空を許す。
      const raw = await c.req.json().catch(() => ({}));
      const body = asRecord(raw ?? {}, 'リクエスト本体');

      let numbers: number[] | undefined;
      if (body.numbers !== undefined && body.numbers !== null) {
        numbers = asArray(body.numbers, 'numbers').map((value, index) =>
          asInt(value, `numbers[${index}]`));
        // 空配列は「全件」と紛らわしいので、意図が読めない指定として弾く。
        if (numbers.length === 0) throw new ValidationError('削除する業種目が指定されていません');
      }

      const categories = await db.industryCategory.findMany({
        where: { yearId: year.id, ...(numbers ? { number: { in: numbers } } : {}) },
        select: { id: true, number: true },
      });

      if (numbers) {
        const found = new Set(categories.map(({ number }) => number));
        const unknown = numbers.filter((number) => !found.has(number));
        if (unknown.length > 0) {
          throw new ValidationError(`${year.label}に存在しない業種目番号が含まれています`, {
            numbers: unknown,
          });
        }
      }

      const { count } = await db.industryMonthlyPrice.deleteMany({
        where: {
          categoryId: { in: categories.map(({ id }) => id) },
          year: priceYear,
          month: priceMonth,
        },
      });

      return c.json({
        year: { id: year.id, label: year.label, gregorianYear: year.gregorianYear },
        priceYear,
        priceMonth,
        deleted: count,
      });
    } catch (error) {
      const { body, status } = toErrorResponse(error);
      return c.json(body, status);
    }
  });

  /** 業種目1件の訂正。B/C/D・前年平均・名称のうち、渡されたものだけ書き換える。 */
  router.patch('/industry-years/:gregorianYear/categories/:number', async (c) => {
    try {
      const year = await findYear(c.req.param('gregorianYear'));
      if (!year) return c.json({ error: '指定された年分は登録されていません' }, 404);

      const number = Number(c.req.param('number'));
      if (!Number.isInteger(number)) {
        throw new ValidationError('業種目番号は整数で指定してください');
      }

      const category = await db.industryCategory.findUnique({
        where: { yearId_number: { yearId: year.id, number } },
        include: { metric: true },
      });
      if (!category) {
        return c.json({ error: `業種目番号 ${number} は${year.label}に登録されていません` }, 404);
      }
      if (!category.metric) {
        return c.json({ error: `業種目番号 ${number} に比準要素（B/C/D）がありません` }, 409);
      }

      const body = asRecord(await c.req.json(), 'リクエスト本体');

      const categoryData: Prisma.IndustryCategoryUpdateInput = {};
      if (body.name !== undefined) categoryData.name = asString(body.name, 'name');
      if (body.description !== undefined) {
        categoryData.description = asString(body.description, 'description');
      }

      const metricData: Prisma.IndustryMetricUpdateInput = {};
      if (body.dividend !== undefined) metricData.dividend = asFiniteNumber(body.dividend, 'dividend');
      if (body.profit !== undefined) metricData.profit = asInt(body.profit, 'profit');
      if (body.netAsset !== undefined) metricData.netAsset = asInt(body.netAsset, 'netAsset');
      if (body.previousYearAveragePrice !== undefined) {
        metricData.previousYearAveragePrice = asInt(
          body.previousYearAveragePrice,
          'previousYearAveragePrice',
        );
      }

      if (Object.keys(categoryData).length === 0 && Object.keys(metricData).length === 0) {
        throw new ValidationError('更新する項目が指定されていません');
      }

      const updated = await db.$transaction(async (tx) => {
        if (Object.keys(metricData).length > 0) {
          await tx.industryMetric.update({
            where: { categoryId: category.id },
            data: metricData,
          });
        }
        return tx.industryCategory.update({
          where: { id: category.id },
          data: categoryData,
          include: { metric: true },
        });
      });

      return c.json({
        number: updated.number,
        name: updated.name,
        description: updated.description,
        dividend: updated.metric === null ? null : Number(updated.metric.dividend),
        profit: updated.metric?.profit ?? null,
        netAsset: updated.metric?.netAsset ?? null,
        previousYearAveragePrice: updated.metric?.previousYearAveragePrice ?? null,
      });
    } catch (error) {
      const { body, status } = toErrorResponse(error);
      return c.json(body, status);
    }
  });

  return router;
}
