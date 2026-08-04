// 入力欄に打った月次株価を、貼り付け経路と同じ行（MonthlyPriceRow）に揃えるところ。
//
// ここを通すことで、差分の突き合わせ（previewMonthlyPrices）から登録までは
// 「貼り付け」と「直接入力」で完全に共用できる。

import type { IndustryCategory } from '@/data/industryDataset';
import {
  parseInteger,
  type ExtractResult,
  type MonthlyPriceRow,
  type RowIssue,
} from './parsePastedTable';

export interface PriceEntry {
  price: string;
  twoYearAveragePrice: string;
}

export type PriceEntries = Readonly<Record<number, PriceEntry>>;

const EMPTY_ENTRY: PriceEntry = { price: '', twoYearAveragePrice: '' };

export function entryOf(entries: PriceEntries, number: number): PriceEntry {
  return entries[number] ?? EMPTY_ENTRY;
}

/** 登録済みの値を入力欄の初期値にする。未登録の業種目は空欄で始まる。 */
export function entriesFromRegistered(
  categories: readonly IndustryCategory[],
  priceYear: number,
  priceMonth: number,
): PriceEntries {
  const entries: Record<number, PriceEntry> = {};

  for (const category of categories) {
    const price = category.monthlyPrices.find(
      (candidate) => candidate.year === priceYear && candidate.month === priceMonth,
    );
    entries[category.number] = price
      ? {
        price: String(price.price),
        twoYearAveragePrice:
          price.twoYearAveragePrice === null ? '' : String(price.twoYearAveragePrice),
      }
      : EMPTY_ENTRY;
  }

  return entries;
}

/**
 * 空欄にした登録済みの行＝削除する行。
 *
 * 株価・2年平均の**両方**を空にしたときだけ削除とみなす。株価だけ消した状態は
 * extractEnteredPrices が入力ミスとして弾くので、削除と入力ミスが重ならない。
 */
export function deletionsOf(
  categories: readonly IndustryCategory[],
  entries: PriceEntries,
  priceYear: number,
  priceMonth: number,
): number[] {
  return categories
    .filter((category) => {
      const entry = entryOf(entries, category.number);
      if (entry.price.trim() !== '' || entry.twoYearAveragePrice.trim() !== '') return false;
      return category.monthlyPrices.some(
        (price) => price.year === priceYear && price.month === priceMonth,
      );
    })
    .map((category) => category.number);
}

/**
 * 入力欄の中身を行に変換する。
 *
 * 株価が空欄の業種目は「入力していない」とみなして落とす（登録もされない）。
 * 2年平均の空欄は未公表（null）——前年11月・12月分には元々付かない。
 */
export function extractEnteredPrices(
  categories: readonly IndustryCategory[],
  entries: PriceEntries,
): ExtractResult<MonthlyPriceRow> {
  const rows: MonthlyPriceRow[] = [];
  const errors: RowIssue[] = [];

  // 行番号は入力欄には無いので 0。表示側は line > 0 のときだけ「N行目」を出す。
  const fail = (number: number, reason: string) =>
    errors.push({ line: 0, reason: `業種目 ${number}: ${reason}` });

  for (const category of categories) {
    const entry = entryOf(entries, category.number);
    const priceText = entry.price.trim();
    const twoYearText = entry.twoYearAveragePrice.trim();

    if (priceText === '') {
      // 株価が無いのに2年平均だけ入っているのは打ち間違い。黙って捨てずに知らせる。
      if (twoYearText !== '') {
        fail(category.number, '株価が空欄のまま2年間の平均株価だけ入力されています');
      }
      continue;
    }

    const price = parseInteger(priceText);
    if (price === null) {
      fail(category.number, `株価が数値として読めません（"${priceText}"）`);
      continue;
    }
    if (price < 0) {
      fail(category.number, `株価が負の値です（${price}）`);
      continue;
    }

    let twoYearAveragePrice: number | null = null;
    if (twoYearText !== '' && twoYearText !== '-') {
      twoYearAveragePrice = parseInteger(twoYearText);
      if (twoYearAveragePrice === null) {
        fail(category.number, `2年間の平均株価が数値として読めません（"${twoYearText}"）`);
        continue;
      }
    }

    rows.push({ line: 0, number: category.number, price, twoYearAveragePrice });
  }

  return { rows, skipped: [], errors };
}
