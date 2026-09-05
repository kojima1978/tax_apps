// 年分まるごとのJSON（書き出し / 読み込み）の検証とファイル操作。
//
// サーバ側（industryAdmin.ts）でも同じ検証をするが、こちらは「読み込ませたファイルが
// そもそも別物ではないか」をその場で弾いて、件数のプレビューを出すためのもの。
// 115業種目 × 全月を送りつけてから400が返るより、送る前に気付けたほうがよい。

import type {
  CreateYearCategory,
  MonthlyPriceInput,
  YearArchive,
  YearArchiveCategory,
} from './api';
import type { IndustryLevel } from '@/data/industryDataset';

/** server/routes/industry.ts の ARCHIVE_FORMAT_VERSION と対応させる。 */
export const ARCHIVE_FORMAT_VERSION = 1;

const LEVELS: readonly IndustryLevel[] = ['LARGE', 'MIDDLE', 'SMALL'];

/** 検証を通したあとの業種目。B・C・D が null でないことがここで保証される。 */
export type ArchiveCategory = CreateYearCategory & { monthlyPrices: MonthlyPriceInput[] };

export interface ParsedArchive {
  era: string;
  eraYear: number;
  /** 書き出し元が入れてきた西暦。復元先の判定には使わない（元号＋年で突き合わせる）。 */
  gregorianYear: number | null;
  label: string;
  exportedAt: string | null;
  categories: ArchiveCategory[];
  monthlyPriceCount: number;
  /** 含まれている月の一覧（読み込み前のプレビュー用）。 */
  months: MonthGroup[];
}

export interface MonthGroup {
  year: number;
  month: number;
  rows: { number: number; price: number; twoYearAveragePrice: number | null }[];
}

export type ParseResult =
  | { ok: true; archive: ParsedArchive }
  | { ok: false; error: string };

function fail(error: string): ParseResult {
  return { ok: false, error };
}

function isInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** 業種目1件を検証する。読めなければ理由の文字列を返す。 */
function checkCategory(raw: YearArchiveCategory, index: number): string | null {
  const where = `${index + 1}件目`;
  if (!isInt(raw.number)) return `${where}: 業種目番号が整数ではありません`;

  const at = `業種目 ${raw.number}`;
  if (typeof raw.name !== 'string' || raw.name === '') return `${at}: 業種目名がありません`;
  if (typeof raw.level !== 'string' || !LEVELS.includes(raw.level)) {
    return `${at}: 階層が LARGE / MIDDLE / SMALL のいずれでもありません`;
  }
  if (typeof raw.largeName !== 'string') return `${at}: 大分類がありません`;
  if (!isNumber(raw.dividend)) return `${at}: B（配当）が数値ではありません`;
  if (!isInt(raw.profit)) return `${at}: C（利益）が整数ではありません`;
  if (!isInt(raw.netAsset)) return `${at}: D（純資産）が整数ではありません`;
  if (!isInt(raw.previousYearAveragePrice)) return `${at}: 前年平均株価が整数ではありません`;

  const prices = raw.monthlyPrices ?? [];
  if (!Array.isArray(prices)) return `${at}: 月別株価が配列ではありません`;
  for (const price of prices) {
    if (!isInt(price?.year) || !isInt(price?.month) || price.month < 1 || price.month > 12) {
      return `${at}: 月別株価の年月が読めません`;
    }
    if (!isInt(price.price)) return `${at}: ${price.year}年${price.month}月分の株価が整数ではありません`;
    const average = price.twoYearAveragePrice;
    if (average !== null && average !== undefined && !isInt(average)) {
      return `${at}: ${price.year}年${price.month}月分の2年平均が整数ではありません`;
    }
  }
  return null;
}

function toArchiveCategory(raw: YearArchiveCategory): ArchiveCategory {
  return {
    number: raw.number,
    largeName: raw.largeName,
    middleName: raw.middleName ?? '',
    smallName: raw.smallName ?? '',
    name: raw.name,
    level: raw.level,
    description: raw.description ?? '',
    dividend: raw.dividend as number,
    profit: raw.profit as number,
    netAsset: raw.netAsset as number,
    previousYearAveragePrice: raw.previousYearAveragePrice as number,
    monthlyPrices: (raw.monthlyPrices ?? []).map((price) => ({
      year: price.year,
      month: price.month,
      price: price.price,
      twoYearAveragePrice: price.twoYearAveragePrice ?? null,
    })),
  };
}

/** 月別株価を (年, 月) ごとにまとめる。月次取込APIは1回につき1ヶ月なので、その単位に割る。 */
export function groupMonthlyPricesByMonth(categories: readonly ArchiveCategory[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();

  for (const category of categories) {
    for (const price of category.monthlyPrices) {
      const key = `${price.year}-${price.month}`;
      let group = groups.get(key);
      if (!group) {
        group = { year: price.year, month: price.month, rows: [] };
        groups.set(key, group);
      }
      group.rows.push({
        number: category.number,
        price: price.price,
        twoYearAveragePrice: price.twoYearAveragePrice,
      });
    }
  }

  return [...groups.values()].sort((a, b) => a.year - b.year || a.month - b.month);
}

/**
 * 読み込ませたファイルの中身を検証する。
 * 想定外の形は「どこがどう違うか」まで出す（ファイルを取り違えたときが一番多いため）。
 */
export function parseYearArchive(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return fail(`JSONとして読めません（${error instanceof Error ? error.message : String(error)}）`);
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return fail('JSONの中身がオブジェクトではありません。年分の書き出しファイルを選んでください');
  }
  const archive = raw as Partial<YearArchive>;

  const version = archive.formatVersion ?? ARCHIVE_FORMAT_VERSION;
  if (!isInt(version) || version > ARCHIVE_FORMAT_VERSION) {
    return fail(`このアプリより新しい形式です（formatVersion: ${String(archive.formatVersion)}）`);
  }

  if (typeof archive.era !== 'string' || archive.era === '') {
    return fail('元号（era）がありません。年分の書き出しファイルを選んでください');
  }
  if (!isInt(archive.eraYear) || archive.eraYear < 1) {
    return fail('元号年（eraYear）が正の整数ではありません');
  }
  if (!Array.isArray(archive.categories) || archive.categories.length === 0) {
    return fail('業種目（categories）が1件も入っていません');
  }

  for (const [index, category] of archive.categories.entries()) {
    if (typeof category !== 'object' || category === null) {
      return fail(`${index + 1}件目の業種目がオブジェクトではありません`);
    }
    const reason = checkCategory(category, index);
    if (reason) return fail(reason);
  }

  const categories = archive.categories.map(toArchiveCategory);

  const duplicated = categories
    .map(({ number }) => number)
    .filter((number, index, numbers) => numbers.indexOf(number) !== index);
  if (duplicated.length > 0) {
    return fail(`業種目番号が重複しています（${[...new Set(duplicated)].join(', ')}）`);
  }

  const months = groupMonthlyPricesByMonth(categories);

  return {
    ok: true,
    archive: {
      era: archive.era,
      eraYear: archive.eraYear,
      gregorianYear: isInt(archive.gregorianYear) ? archive.gregorianYear : null,
      label: `${archive.era}${archive.eraYear}年分`,
      exportedAt: typeof archive.exportedAt === 'string' ? archive.exportedAt : null,
      categories,
      monthlyPriceCount: months.reduce((total, group) => total + group.rows.length, 0),
      months,
    },
  };
}

export function archiveFileName(label: string, gregorianYear: number): string {
  return `業種目データ_${label}_${gregorianYear}.json`;
}

/** ブラウザにファイルとして落とす。サーバに置き場を作らずに済ませるための最小実装。 */
export function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
