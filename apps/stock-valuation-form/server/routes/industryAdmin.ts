// 業種目マスタ・業種目別株価等の書き込みAPI（管理画面 #industry-data 用）。
//
// 読み取りAPI（industry.ts）と分けてあるのは、こちらだけが DB を書き換えるため。
// 削除は月別株価（1業種目単位・1ヶ月まるごと）だけに限る。年分そのものの削除は用意しない：
// 1つ消すと業種目115件と全月の株価が Cascade で道連れになるので、
// そこまで戻したくなったらバックアップからのリストアで戻す（docker/scripts/backup.sh）。

import { Hono } from 'hono';
import { Prisma, type PrismaClient } from '@prisma/client';
import {
  BULK_TRANSACTION_OPTIONS,
  ValidationError,
  asArray,
  asFiniteNumber,
  asInt,
  asMonth,
  asNullableInt,
  asRecord,
  asString,
  createIndustryYear,
  parseArchive,
} from '../industryArchive.js';

/** 検証エラーは400、それ以外は投げ直して Hono の500に任せる。 */
function toErrorResponse(error: unknown) {
  if (error instanceof ValidationError) {
    return { body: { error: error.message, detail: error.detail }, status: 400 as const };
  }
  throw error;
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
   * 年分をまるごと新規登録する。検証と書き込みの実体は industryArchive.ts にあり、
   * 起動時のシード（seed.ts）と共通。ここは既存年分の扱い（409）とHTTPの体裁だけ持つ。
   */
  router.post('/industry-years', async (c) => {
    try {
      const archive = parseArchive(await c.req.json());

      const existing = await db.industryYear.findUnique({
        where: { gregorianYear: archive.gregorianYear },
      });
      if (existing) {
        return c.json(
          {
            error: `${archive.label}は既に登録されています。「登録済みの年分」から開いて更新してください`,
          },
          409,
        );
      }

      const created = await createIndustryYear(db, archive);

      return c.json(
        {
          year: { id: created.id, label: created.label, gregorianYear: created.gregorianYear },
          categoryCount: created.categoryCount,
          monthlyPriceCount: created.monthlyPriceCount,
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
