// フロントに同梱されている業種目マスタ・業種目別株価等のJSONをDBへ取り込む。
//
// Phase 1 の時点ではフロントも同じJSONを直接参照し続けるため、ここが唯一の取込経路。
// Phase 2 でフロントがAPI駆動に切り替わったあと、Phase 3 で年分の追加投入UIを載せる。

import fs from 'node:fs';
import path from 'node:path';
import type { IndustryLevel, Prisma, PrismaClient } from '@prisma/client';
import {
  gregorianYearOf,
  industryYearLabel,
  parseMonthlyPriceKey,
  parseYearAverageKey,
} from './wareki.js';

/** 業種目別株価等のうち、月別株価の入れ子オブジェクトの見出し。 */
const TWO_YEAR_AVERAGE_KEY = '課税時期の属する月以前２年間の平均株価';

/** src/data/industryCategories.json の1件。 */
interface RawCategory {
  大分類: string;
  中分類: string;
  小分類: string;
  名前: string;
  番号: number;
  内容: string;
}

/** src/data/industryValuationMetrics.json の1件。月別株価は和暦キーで並ぶ。 */
interface RawMetrics {
  番号: number;
  B: number;
  C: number;
  D: number;
  [TWO_YEAR_AVERAGE_KEY]?: Record<string, number>;
  [warekiKey: string]: number | Record<string, number> | undefined;
}

interface MonthlyPrice {
  year: number;
  month: number;
  price: number;
  twoYearAveragePrice: number | null;
}

interface ParsedMetrics {
  number: number;
  dividend: number;
  profit: number;
  netAsset: number;
  previousYearAveragePrice: number;
  monthlyPrices: MonthlyPrice[];
}

function levelOf(category: RawCategory): IndustryLevel {
  if (category.小分類 !== '') return 'SMALL';
  if (category.中分類 !== '') return 'MIDDLE';
  return 'LARGE';
}

function readJson<T>(dir: string, fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(dir, fileName), 'utf8')) as T;
}

/**
 * 1件分の業種目別株価等を、和暦キーを西暦へ倒しつつ読み解く。
 * 月別株価が1つも無い、または前年平均が無いデータは公表値として不完全なのでエラーにする。
 */
function parseMetrics(raw: RawMetrics): ParsedMetrics {
  const twoYearAverages = (raw[TWO_YEAR_AVERAGE_KEY] ?? {}) as Record<string, number>;

  // 「令和８年１月分」→ 西暦(2026, 1)。2年平均は同じ見出しで入れ子側に並ぶ。
  const monthlyPrices: MonthlyPrice[] = [];
  let previousYearAveragePrice: number | null = null;

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== 'number') continue;

    const month = parseMonthlyPriceKey(key);
    if (month) {
      const twoYearAverage = twoYearAverages[key];
      monthlyPrices.push({
        year: month.gregorianYear,
        month: month.month,
        price: value,
        twoYearAveragePrice: typeof twoYearAverage === 'number' ? twoYearAverage : null,
      });
      continue;
    }

    if (parseYearAverageKey(key)) previousYearAveragePrice = value;
  }

  if (monthlyPrices.length === 0) {
    throw new Error(`業種目番号 ${raw.番号}: 月別株価の見出しが1つも読み取れませんでした`);
  }
  if (previousYearAveragePrice === null) {
    throw new Error(`業種目番号 ${raw.番号}: 前年平均株価（「令和N年平均」）が見つかりません`);
  }

  return {
    number: raw.番号,
    dividend: raw.B,
    profit: raw.C,
    netAsset: raw.D,
    previousYearAveragePrice,
    monthlyPrices,
  };
}

/**
 * 年分を決める。公表データは前年11月・12月分も併記されるため、
 * 月別株価に現れる最も新しい元号年をその年分とみなす（令和8年分なら「令和8」）。
 */
function resolveYear(rawMetrics: RawMetrics[]): { era: string; eraYear: number } {
  let latest: { era: string; eraYear: number } | null = null;

  for (const raw of rawMetrics) {
    for (const key of Object.keys(raw)) {
      const month = parseMonthlyPriceKey(key);
      if (!month) continue;
      if (!latest || month.eraYear > latest.eraYear) {
        latest = { era: month.era, eraYear: month.eraYear };
      }
    }
  }

  if (!latest) throw new Error('月別株価の見出しから年分を特定できませんでした');
  return latest;
}

export interface SeedResult {
  label: string;
  skipped: boolean;
  categoryCount: number;
  monthlyPriceCount: number;
}

/**
 * 年分がまだ登録されていなければJSONから取り込む。
 * 既にある年分には触れない（Phase 3 で画面から編集できるようにするため上書きしない）。
 * 再取込したいときは SEED_FORCE=1 を立てる。
 */
export async function seedIndustryDataIfMissing(
  db: PrismaClient,
  dataDir: string,
): Promise<SeedResult> {
  const rawCategories = readJson<RawCategory[]>(dataDir, 'industryCategories.json');
  const rawMetrics = readJson<RawMetrics[]>(dataDir, 'industryValuationMetrics.json');

  const { era, eraYear } = resolveYear(rawMetrics);
  const label = industryYearLabel(era, eraYear);
  const gregorianYear = gregorianYearOf(era, eraYear);

  const force = process.env.SEED_FORCE === '1';
  const existing = await db.industryYear.findUnique({ where: { gregorianYear } });
  if (existing && !force) {
    return { label, skipped: true, categoryCount: 0, monthlyPriceCount: 0 };
  }

  const metricsByNumber = new Map(rawMetrics.map((raw) => [raw.番号, parseMetrics(raw)]));
  let monthlyPriceCount = 0;

  await db.$transaction(async (tx) => {
    // 年分ごと作り直す。子テーブルは onDelete: Cascade で一緒に消える。
    if (existing) await tx.industryYear.delete({ where: { id: existing.id } });

    const year = await tx.industryYear.create({
      data: {
        era,
        eraYear,
        gregorianYear,
        label,
      },
    });

    for (const rawCategory of rawCategories) {
      const metrics = metricsByNumber.get(rawCategory.番号);
      if (!metrics) {
        throw new Error(`業種目番号 ${rawCategory.番号}: 対応する業種目別株価等がありません`);
      }

      const monthlyPrices: Prisma.IndustryMonthlyPriceCreateWithoutCategoryInput[] =
        metrics.monthlyPrices.map((price) => ({
          year: price.year,
          month: price.month,
          price: price.price,
          twoYearAveragePrice: price.twoYearAveragePrice,
        }));
      monthlyPriceCount += monthlyPrices.length;

      await tx.industryCategory.create({
        data: {
          yearId: year.id,
          number: rawCategory.番号,
          largeName: rawCategory.大分類,
          middleName: rawCategory.中分類,
          smallName: rawCategory.小分類,
          name: rawCategory.名前,
          level: levelOf(rawCategory),
          description: rawCategory.内容,
          metric: {
            create: {
              dividend: metrics.dividend,
              profit: metrics.profit,
              netAsset: metrics.netAsset,
              previousYearAveragePrice: metrics.previousYearAveragePrice,
            },
          },
          monthlyPrices: { create: monthlyPrices },
        },
      });
    }
    // 115業種目 × (業種目 + 比準要素 + 月別株価) を1トランザクションで流すため、
    // Prisma 既定の5秒では足りない。
  }, { timeout: 120_000, maxWait: 20_000 });

  return {
    label,
    skipped: false,
    categoryCount: rawCategories.length,
    monthlyPriceCount,
  };
}
