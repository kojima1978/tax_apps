// 類似業種比準価額の計算に使う業種目マスタ・業種目別株価等の読み取りAPI。
//
// 丸め（B の10銭単位、比準割合の2位未満切捨てなど）は評価明細書の記載要領に沿って
// フロント側が担っているため、ここでは公表値をそのまま返すことに徹する。

import { Hono } from 'hono';
import { Prisma, type PrismaClient } from '@prisma/client';

type YearRecord = {
  id: number;
  era: string;
  eraYear: number;
  gregorianYear: number;
  label: string;
};

function toYearResponse(year: YearRecord) {
  return {
    id: year.id,
    label: year.label,
    era: year.era,
    eraYear: year.eraYear,
    gregorianYear: year.gregorianYear,
  };
}

/** 年分の書き出しJSONの形式。読み込む側が想定外の形を弾けるように版を持たせる。 */
const ARCHIVE_FORMAT_VERSION = 1;

type MetricRecord = {
  dividend: Prisma.Decimal;
  profit: number;
  netAsset: number;
  previousYearAveragePrice: number;
};

type MonthlyPriceRecord = {
  year: number;
  month: number;
  price: number;
  twoYearAveragePrice: number | null;
};

/**
 * B・C・D・前年平均と月別株価。metrics / dataset / export の3箇所で同じ形を返すのでここに寄せる。
 * 比準要素が無い業種目（取込途中など）は null で返し、欠けていることを隠さない。
 */
function toMetricResponse(category: {
  metric: MetricRecord | null;
  monthlyPrices: MonthlyPriceRecord[];
}) {
  return {
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
  };
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
        ...toMetricResponse(category),
      })),
    });
  });

  /**
   * フロントエンドが起動時に一括取得する全年分のデータ。
   *
   * 帳票の入力は同期的に組み立てられる（業種目を選ぶと第4表のB/C/D・株価が即座に埋まる）ため、
   * 都度APIを呼ぶのではなく必要な分をまとめて渡す。`description`（業種目の内容説明）は
   * 帳票では使わないので含めない。
   */
  router.get('/industry-dataset', async (c) => {
    const years = await db.industryYear.findMany({
      orderBy: { gregorianYear: 'desc' },
      include: {
        categories: {
          orderBy: { number: 'asc' },
          include: {
            metric: true,
            monthlyPrices: { orderBy: [{ year: 'asc' }, { month: 'asc' }] },
          },
        },
      },
    });

    return c.json({
      years: years.map((year) => ({
        ...toYearResponse(year),
        categories: year.categories.map((category) => ({
          number: category.number,
          largeName: category.largeName,
          middleName: category.middleName,
          smallName: category.smallName,
          name: category.name,
          level: category.level,
          ...toMetricResponse(category),
        })),
      })),
    });
  });

  /**
   * 年分をまるごと書き出す。`POST /industry-years` がそのまま受け取れる形で返すので、
   * これ1本で別環境への移設・手元への控えができる（`/industry-dataset` は帳票用に
   * `description` を落としているため、そちらだけでは復元できない）。
   *
   * DB内部のIDは環境ごとに変わるので載せない。年分の同定は西暦と元号で行う。
   */
  router.get('/industry-years/:gregorianYear/export', async (c) => {
    const gregorianYear = Number(c.req.param('gregorianYear'));
    if (!Number.isInteger(gregorianYear)) {
      return c.json({ error: '西暦年は整数で指定してください' }, 400);
    }

    const year = await db.industryYear.findUnique({
      where: { gregorianYear },
      include: {
        categories: {
          orderBy: { number: 'asc' },
          include: {
            metric: true,
            monthlyPrices: { orderBy: [{ year: 'asc' }, { month: 'asc' }] },
          },
        },
      },
    });
    if (!year) return c.json({ error: '指定された年分は登録されていません' }, 404);

    return c.json({
      formatVersion: ARCHIVE_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      label: year.label,
      era: year.era,
      eraYear: year.eraYear,
      gregorianYear: year.gregorianYear,
      categories: year.categories.map((category) => ({
        number: category.number,
        largeName: category.largeName,
        middleName: category.middleName,
        smallName: category.smallName,
        name: category.name,
        level: category.level,
        // 復元用なので内容説明も載せる（帳票では使わないが、書き出して戻したときに消えては困る）。
        description: category.description,
        ...toMetricResponse(category),
      })),
    });
  });

  return router;
}
