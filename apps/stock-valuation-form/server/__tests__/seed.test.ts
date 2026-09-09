// 起動時シード（prisma/industry-data/*.json → DB）の振る舞い。
//
// 「未登録の年分だけ入れる」「1件も入らないまま起動しない」が要点なので、
// Prisma は最小限のフェイクで置き換えて DB 無しで確かめる。
// SQLの正しさは実DBを使う起動時の取込そのもので担保する。

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seedIndustryData } from '../seed.js';

/** 年分アーカイブ1件分。業種目は件数だけ変えられれば十分なので中身は最小構成。 */
function archiveOf(era: string, eraYear: number, gregorianYear: number, categoryCount: number) {
  return {
    formatVersion: 1,
    label: `${era}${eraYear}年分`,
    era,
    eraYear,
    gregorianYear,
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
      monthlyPrices: [
        { year: gregorianYear, month: 1, price: 410, twoYearAveragePrice: 405 },
        { year: gregorianYear, month: 2, price: 420, twoYearAveragePrice: null },
      ],
    })),
  };
}

interface FakeYear {
  id: number;
  era: string;
  eraYear: number;
  gregorianYear: number;
  label: string;
}

/** seedIndustryData が触る範囲だけの Prisma もどき。 */
function createFakeDb() {
  const years = new Map<number, FakeYear>();
  const categories: { yearId: number; number: number }[] = [];
  let nextId = 1;

  const db = {
    industryYear: {
      findUnique: async ({ where }: { where: { gregorianYear: number } }) =>
        years.get(where.gregorianYear) ?? null,
      count: async () => years.size,
      deleteMany: async () => {
        const count = years.size;
        years.clear();
        categories.length = 0;
        return { count };
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

describe('seedIndustryData', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svf-seed-'));
    delete process.env.SEED_FORCE;
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
    delete process.env.SEED_FORCE;
  });

  function write(era: string, eraYear: number, gregorianYear: number, categoryCount: number) {
    fs.writeFileSync(
      path.join(dataDir, `業種目データ_${era}${eraYear}年分_${gregorianYear}.json`),
      JSON.stringify(archiveOf(era, eraYear, gregorianYear, categoryCount)),
      'utf8',
    );
  }

  it('未登録の年分をすべて取り込む', async () => {
    write('令和', 7, 2025, 2);
    write('令和', 8, 2026, 3);
    const { db, years, categories } = createFakeDb();

    const result = await seedIndustryData(db, dataDir);

    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);
    // ファイル名順（令和7 → 令和8）に読むので、ログの並びもこの順になる。
    expect(result.years.map(({ label }) => label)).toEqual(['令和7年分', '令和8年分']);
    expect(result.years.map(({ categoryCount }) => categoryCount)).toEqual([2, 3]);
    // 月別株価は業種目1件につき2ヶ月分。
    expect(result.years.map(({ monthlyPriceCount }) => monthlyPriceCount)).toEqual([4, 6]);
    expect([...years.keys()].sort()).toEqual([2025, 2026]);
    expect(categories).toHaveLength(5);
  });

  it('登録済みの年分には触れない', async () => {
    write('令和', 7, 2025, 2);
    write('令和', 8, 2026, 3);
    const { db, years, categories } = createFakeDb();
    years.set(2025, { id: 99, era: '令和', eraYear: 7, gregorianYear: 2025, label: '令和7年分' });

    const result = await seedIndustryData(db, dataDir);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.years[0]).toEqual({
      label: '令和7年分',
      skipped: true,
      categoryCount: 0,
      monthlyPriceCount: 0,
    });
    // 既存年分の業種目は作り直されない（入るのは令和8年分の3件だけ）。
    expect(years.get(2025)?.id).toBe(99);
    expect(categories).toHaveLength(3);
    expect(new Set(categories.map(({ yearId }) => yearId)).size).toBe(1);
  });

  it('環境変数では何も消さない（起動時に既存データを作り直す経路を持たない）', async () => {
    // かつて SEED_FORCE=1 で全年分を消していた。環境変数はコンテナに残り続けるため
    // 再起動のたびに全消し→再取込が走り、アーカイブの無い年分は戻せなくなる。
    // 入れ直しは npm run industry:reseed（年分を名指しする明示操作）へ移した。
    write('令和', 8, 2026, 3);
    const { db, years, categories } = createFakeDb();
    years.set(2026, { id: 99, era: '令和', eraYear: 8, gregorianYear: 2026, label: '令和8年分' });
    process.env.SEED_FORCE = '1';

    const result = await seedIndustryData(db, dataDir);

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
    expect(years.get(2026)?.id).toBe(99);
    expect(categories).toHaveLength(0);
  });

  it('アーカイブに無い年分は残る（起動時のシードは足すだけ）', async () => {
    write('令和', 8, 2026, 3);
    const { db, years } = createFakeDb();
    // 画面から登録したまま industry:save していない年分。消すと戻す先が無い。
    years.set(2025, { id: 77, era: '令和', eraYear: 7, gregorianYear: 2025, label: '令和7年分' });

    await seedIndustryData(db, dataDir);

    expect(years.get(2025)?.id).toBe(77);
    expect([...years.keys()].sort()).toEqual([2025, 2026]);
  });

  it('JSONが1件も無ければ失敗する（空のまま起動させない）', async () => {
    const { db } = createFakeDb();
    await expect(seedIndustryData(db, dataDir)).rejects.toThrow('1件もありません');
  });

  it('ディレクトリごと無ければ失敗する', async () => {
    const { db } = createFakeDb();
    await expect(seedIndustryData(db, path.join(dataDir, 'なし'))).rejects.toThrow(
      'ディレクトリがありません',
    );
  });

  it('壊れたアーカイブはファイル名つきで落とす', async () => {
    fs.writeFileSync(
      path.join(dataDir, '業種目データ_壊れ.json'),
      JSON.stringify({ categories: [] }),
      'utf8',
    );
    const { db } = createFakeDb();

    await expect(seedIndustryData(db, dataDir)).rejects.toThrow(
      '業種目データ_壊れ.json: eraは文字列で指定してください',
    );
  });
});
