// 類似業種比準価額の計算に使う業種目マスタ・業種目別株価等の読み取りAPI。
//
// 丸め（B の10銭単位、比準割合の2位未満切捨てなど）は評価明細書の記載要領に沿って
// フロント側が担っているため、ここでは公表値をそのまま返すことに徹する。

import { Hono } from 'hono';
import type { PrismaClient } from '@prisma/client';

type YearRecord = {
  id: number;
  era: string;
  eraYear: number;
  gregorianYear: number;
  label: string;
  sourceUrl: string | null;
  note: string;
};

function toYearResponse(year: YearRecord) {
  return {
    id: year.id,
    label: year.label,
    era: year.era,
    eraYear: year.eraYear,
    gregorianYear: year.gregorianYear,
    sourceUrl: year.sourceUrl,
    note: year.note,
  };
}

/** 課税時期の n か月前を西暦で返す（年跨ぎを正しく扱う）。 */
function monthsBefore(year: number, month: number, back: number) {
  const shifted = new Date(Date.UTC(year, month - 1 - back, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

export function createIndustryRouter(db: PrismaClient) {
  const router = new Hono();

  /**
   * 対象の年分を決める。`year`（「令和8年分」）または `gregorianYear`（2026）で指定でき、
   * 省略時は最も新しい年分。未登録の年分を指したときは null を返して呼び出し側で404にする。
   */
  async function resolveYear(query: Record<string, string | undefined>) {
    const { year: label, gregorianYear } = query;

    if (label) return db.industryYear.findUnique({ where: { label } });
    if (gregorianYear) {
      const parsed = Number(gregorianYear);
      if (!Number.isInteger(parsed)) return null;
      return db.industryYear.findUnique({ where: { gregorianYear: parsed } });
    }
    return db.industryYear.findFirst({ orderBy: { gregorianYear: 'desc' } });
  }

  // 登録済みの年分一覧。
  router.get('/industry-years', async (c) => {
    const years = await db.industryYear.findMany({
      orderBy: { gregorianYear: 'desc' },
      include: { _count: { select: { categories: true } } },
    });

    return c.json({
      years: years.map((year) => ({
        ...toYearResponse(year),
        categoryCount: year._count.categories,
      })),
    });
  });

  // 業種目マスタ。`内容` は「その業種目の対象となる会社」の説明。
  router.get('/industry-categories', async (c) => {
    const year = await resolveYear(c.req.query());
    if (!year) return c.json({ error: '指定された年分は登録されていません' }, 404);

    const categories = await db.industryCategory.findMany({
      where: { yearId: year.id },
      orderBy: { number: 'asc' },
    });

    return c.json({
      year: toYearResponse(year),
      categories: categories.map((category) => ({
        number: category.number,
        largeName: category.largeName,
        middleName: category.middleName,
        smallName: category.smallName,
        name: category.name,
        level: category.level,
        description: category.description,
      })),
    });
  });

  // 業種目別株価等（B/C/D・前年平均・月別株価）。`number` で1件に絞れる。
  router.get('/industry-metrics', async (c) => {
    const query = c.req.query();
    const year = await resolveYear(query);
    if (!year) return c.json({ error: '指定された年分は登録されていません' }, 404);

    const number = query.number === undefined ? undefined : Number(query.number);
    if (number !== undefined && !Number.isInteger(number)) {
      return c.json({ error: 'number は整数で指定してください' }, 400);
    }

    const categories = await db.industryCategory.findMany({
      where: { yearId: year.id, ...(number === undefined ? {} : { number }) },
      orderBy: { number: 'asc' },
      include: {
        metric: true,
        monthlyPrices: { orderBy: [{ year: 'asc' }, { month: 'asc' }] },
      },
    });

    if (number !== undefined && categories.length === 0) {
      return c.json({ error: `業種目番号 ${number} は登録されていません` }, 404);
    }

    return c.json({
      year: toYearResponse(year),
      metrics: categories.map((category) => ({
        number: category.number,
        name: category.name,
        level: category.level,
        dividend: category.metric === null ? null : Number(category.metric.dividend),
        profit: category.metric?.profit ?? null,
        netAsset: category.metric?.netAsset ?? null,
        previousYearAveragePrice: category.metric?.previousYearAveragePrice ?? null,
        monthlyPrices: category.monthlyPrices.map((price) => ({
          year: price.year,
          month: price.month,
          price: price.price,
          twoYearAveragePrice: price.twoYearAveragePrice,
        })),
      })),
    });
  });

  /**
   * 第4表「類似業種の株価」に必要な A の候補を、課税時期（西暦の年月）から引く。
   * 課税時期の属する月／前月／前々月・前年平均・課税時期の属する月以前2年間の平均を返す。
   * 未公表の月は null（例: 令和8年5月分がまだ公表されていない場合）。
   */
  router.get('/similar-industry-prices', async (c) => {
    const query = c.req.query();

    const number = Number(query.number);
    const taxYear = Number(query.taxYear);
    const taxMonth = Number(query.taxMonth);
    if (!Number.isInteger(number)) {
      return c.json({ error: 'number は整数で指定してください' }, 400);
    }
    if (!Number.isInteger(taxYear) || !Number.isInteger(taxMonth) || taxMonth < 1 || taxMonth > 12) {
      return c.json({ error: 'taxYear（西暦）と taxMonth（1〜12）を指定してください' }, 400);
    }

    // 年分は課税時期の属する年で決まる。`year` / `gregorianYear` で明示指定もできる。
    const year = await resolveYear(
      query.year || query.gregorianYear ? query : { gregorianYear: String(taxYear) },
    );
    if (!year) return c.json({ error: `${taxYear}年分は登録されていません` }, 404);

    const category = await db.industryCategory.findUnique({
      where: { yearId_number: { yearId: year.id, number } },
      include: { metric: true, monthlyPrices: true },
    });
    if (!category) {
      return c.json({ error: `業種目番号 ${number} は登録されていません` }, 404);
    }

    const priceAt = (at: { year: number; month: number }) =>
      category.monthlyPrices.find((p) => p.year === at.year && p.month === at.month) ?? null;

    const current = monthsBefore(taxYear, taxMonth, 0);
    const previous = monthsBefore(taxYear, taxMonth, 1);
    const twoBefore = monthsBefore(taxYear, taxMonth, 2);
    const currentRow = priceAt(current);

    return c.json({
      year: toYearResponse(year),
      number: category.number,
      name: category.name,
      level: category.level,
      taxPeriod: current,
      dividend: category.metric === null ? null : Number(category.metric.dividend),
      profit: category.metric?.profit ?? null,
      netAsset: category.metric?.netAsset ?? null,
      prices: {
        currentMonth: { ...current, price: currentRow?.price ?? null },
        previousMonth: { ...previous, price: priceAt(previous)?.price ?? null },
        twoMonthsBefore: { ...twoBefore, price: priceAt(twoBefore)?.price ?? null },
        previousYearAverage: category.metric?.previousYearAveragePrice ?? null,
        twoYearAverage: currentRow?.twoYearAveragePrice ?? null,
      },
    });
  });

  return router;
}
