import { describe, expect, it } from 'vitest';
import type { IndustryCategory, IndustryMonthlyPrice } from '@/data/industryDataset';
import { entriesFromRegistered, entryOf, extractEnteredPrices } from '../directPriceEntry';

function category(number: number, monthlyPrices: IndustryMonthlyPrice[] = []): IndustryCategory {
  return {
    number,
    largeName: '製造業',
    middleName: '',
    smallName: '',
    name: `業種目${number}`,
    level: 'LARGE',
    dividend: 5.2,
    profit: 34,
    netAsset: 312,
    previousYearAveragePrice: 451,
    monthlyPrices,
  };
}

const categories = [category(1), category(2), category(3)];

describe('entriesFromRegistered', () => {
  const registered = [
    category(1, [{ year: 2026, month: 4, price: 763, twoYearAveragePrice: 579 }]),
    category(2, [{ year: 2026, month: 4, price: 812, twoYearAveragePrice: null }]),
    category(3, [{ year: 2026, month: 3, price: 700, twoYearAveragePrice: 570 }]),
  ];

  it('その月の登録値を文字列で入れる（2年平均が未公表なら空欄）', () => {
    const entries = entriesFromRegistered(registered, 2026, 4);

    expect(entries[1]).toEqual({ price: '763', twoYearAveragePrice: '579' });
    expect(entries[2]).toEqual({ price: '812', twoYearAveragePrice: '' });
  });

  it('その月が未登録の業種目は空欄で始まる', () => {
    expect(entriesFromRegistered(registered, 2026, 4)[3])
      .toEqual({ price: '', twoYearAveragePrice: '' });
  });
});

describe('extractEnteredPrices', () => {
  it('入力のある業種目だけを行にする（空欄は登録対象にしない）', () => {
    const result = extractEnteredPrices(categories, {
      1: { price: '763', twoYearAveragePrice: '579' },
      2: { price: '', twoYearAveragePrice: '' },
      3: { price: '812', twoYearAveragePrice: '' },
    });

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      { line: 0, number: 1, price: 763, twoYearAveragePrice: 579 },
      { line: 0, number: 3, price: 812, twoYearAveragePrice: null },
    ]);
  });

  it('全角・桁区切りは貼り付けと同じ規則で読む', () => {
    const result = extractEnteredPrices([category(1)], {
      1: { price: '１，２３４', twoYearAveragePrice: ' 1,100 ' },
    });

    expect(result.rows).toEqual([
      { line: 0, number: 1, price: 1234, twoYearAveragePrice: 1100 },
    ]);
  });

  it('2年平均の "-" は未公表として null にする', () => {
    const result = extractEnteredPrices([category(1)], {
      1: { price: '763', twoYearAveragePrice: '-' },
    });

    expect(result.rows[0]?.twoYearAveragePrice).toBeNull();
  });

  it('株価が空欄のまま2年平均だけ入っていればエラーにする', () => {
    const result = extractEnteredPrices([category(1)], {
      1: { price: '', twoYearAveragePrice: '579' },
    });

    expect(result.rows).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.reason).toContain('業種目 1');
  });

  it('数値として読めない入力・負の株価はエラーにする', () => {
    const result = extractEnteredPrices([category(1), category(2)], {
      1: { price: '七六三', twoYearAveragePrice: '' },
      2: { price: '-5', twoYearAveragePrice: '' },
    });

    expect(result.rows).toEqual([]);
    expect(result.errors.map((issue) => issue.line)).toEqual([0, 0]);
    expect(result.errors[1]?.reason).toContain('負の値');
  });

  it('登録済みの値をそのまま抽出すれば元の値と一致する（据置の往復）', () => {
    const registered = [
      category(1, [{ year: 2026, month: 4, price: 763, twoYearAveragePrice: 579 }]),
    ];
    const result = extractEnteredPrices(registered, entriesFromRegistered(registered, 2026, 4));

    expect(result.rows).toEqual([
      { line: 0, number: 1, price: 763, twoYearAveragePrice: 579 },
    ]);
  });
});

describe('entryOf', () => {
  it('未設定の業種目は空欄を返す（入力欄の初期表示に使う）', () => {
    expect(entryOf({}, 99)).toEqual({ price: '', twoYearAveragePrice: '' });
  });
});
