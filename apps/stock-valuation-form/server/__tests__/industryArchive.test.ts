// 年分アーカイブの入れ直し（replaceIndustryYear）。
//
// 見たいのは「名指しした年分だけが入れ替わる」こと。年分を1つ消すと業種目と
// 全月の株価が Cascade で道連れになるので、対象の取り違えがそのままデータ消失になる。
// Prisma は最小限のフェイクで置き換えて DB 無しで確かめる。

import type { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { parseArchive, replaceIndustryYear } from '../industryArchive.js';

function archiveOf(era: string, eraYear: number, categoryCount: number) {
  return parseArchive({
    era,
    eraYear,
    categories: Array.from({ length: categoryCount }, (_, index) => ({
      number: index + 1,
      largeName: '建設業',
      middleName: '',
      smallName: '',
      name: '建設業',
      level: 'LARGE',
      description: '',
      dividend: 5.5,
      profit: 30,
      netAsset: 300,
      previousYearAveragePrice: 400,
      monthlyPrices: [{ year: 2026, month: 1, price: 410, twoYearAveragePrice: 405 }],
    })),
  });
}

interface FakeYear {
  id: number;
  era: string;
  eraYear: number;
  gregorianYear: number;
  label: string;
}

/** replaceIndustryYear が触る範囲だけの Prisma もどき。Cascade も真似る。 */
function createFakeDb() {
  const years = new Map<number, FakeYear>();
  const categories: { yearId: number; number: number }[] = [];
  let nextId = 1;

  const db = {
    industryYear: {
      deleteMany: async ({ where }: { where: { gregorianYear: number } }) => {
        const target = years.get(where.gregorianYear);
        if (!target) return { count: 0 };
        years.delete(where.gregorianYear);
        // 子テーブルは onDelete: Cascade で一緒に消える。
        for (let index = categories.length - 1; index >= 0; index -= 1) {
          if (categories[index]!.yearId === target.id) categories.splice(index, 1);
        }
        return { count: 1 };
      },
      create: async ({ data }: { data: Omit<FakeYear, 'id'> }) => {
        const year = { id: nextId, ...data };
        nextId += 1;
        years.set(year.gregorianYear, year);
        return year;
      },
    },
    industryCategory: {
      create: async ({ data }: { data: { yearId: number; number: number } }) => {
        categories.push({ yearId: data.yearId, number: data.number });
        return data;
      },
    },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(db),
  };

  return { db: db as unknown as PrismaClient, years, categories };
}

describe('replaceIndustryYear', () => {
  it('名指しした年分だけを入れ替え、他の年分には触れない', async () => {
    const { db, years, categories } = createFakeDb();
    years.set(2026, { id: 90, era: '令和', eraYear: 8, gregorianYear: 2026, label: '令和8年分' });
    years.set(2025, { id: 91, era: '令和', eraYear: 7, gregorianYear: 2025, label: '令和7年分' });
    categories.push({ yearId: 90, number: 1 }, { yearId: 91, number: 1 });

    const result = await replaceIndustryYear(db, archiveOf('令和', 8, 3));

    expect(result).toMatchObject({ label: '令和8年分', categoryCount: 3, monthlyPriceCount: 3 });
    // 令和8年分は作り直されて別IDになり、業種目も入れ直した3件だけになる
    expect(years.get(2026)?.id).not.toBe(90);
    expect(categories.filter(({ yearId }) => yearId === result.id)).toHaveLength(3);
    expect(categories.some(({ yearId }) => yearId === 90)).toBe(false);
    // 令和7年分（アーカイブを渡していない年分）はそのまま
    expect(years.get(2025)?.id).toBe(91);
    expect(categories.filter(({ yearId }) => yearId === 91)).toHaveLength(1);
  });

  it('未登録の年分でも取り込める（消す対象が無いだけ）', async () => {
    const { db, years } = createFakeDb();

    await replaceIndustryYear(db, archiveOf('令和', 8, 2));

    expect(years.get(2026)?.label).toBe('令和8年分');
  });
});
