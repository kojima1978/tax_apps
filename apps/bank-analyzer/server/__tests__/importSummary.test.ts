// 取込の結果（依頼25）の組み立て。値はすべて架空。
// DB を通した件数の一致（結果の件数＝リンク先の取引一覧の件数）は imports.db.test.ts で見る

import { describe, expect, it } from 'vitest';
import { filterFromQuery } from '../filterQuery.js';
import { buildImportSummary, MAX_ERROR_IDS, type InsertedRow } from '../lib/import/summary.js';

let nextId = 100;
const row = (over: Partial<InsertedRow> = {}): InsertedRow => ({
  id: nextId++,
  accountId: 1,
  date: '2025-04-01',
  amountOut: 0,
  amountIn: 0,
  balance: null,
  category: '未分類',
  categorySource: 'auto',
  memo: null,
  isFlagged: false,
  isLarge: false,
  isTransfer: false,
  ...over,
});
const ACCOUNT = { id: 1, bankName: '架空銀行', branchName: '本店', accountNumber: '1234567', accountType: '普通' };
const build = (files: InsertedRow[][], existing: { accountId: number | null; date: string }[] = []) =>
  buildImportSummary({ files, fileCount: files.length, skipped: 0, accounts: [ACCOUNT], existing });

describe('取込の結果', () => {
  it('口座ごとの件数・期間・入出金計・最後の残高（同じ日は後に入った行）', () => {
    const s = build([
      [
        row({ date: '2025-04-01', amountIn: 10000, balance: 10000 }),
        row({ date: '2025-04-03', amountOut: 3000, balance: 7000 }),
        row({ date: '2025-04-03', amountOut: 2000, balance: 5000 }),
        row({ date: '2025-04-02', amountOut: 1, balance: null }),
      ],
    ]);
    expect(s.imported).toBe(4);
    expect(s.accounts).toHaveLength(1);
    expect(s.accounts[0]).toMatchObject({
      bankName: '架空銀行',
      count: 4,
      period: { from: '2025-04-01', to: '2025-04-03' },
      totalOut: 5001,
      totalIn: 10000,
      lastBalance: { date: '2025-04-03', amount: 5000 },
      before: null,
      overlap: null,
      gaps: [],
      emptyYears: [],
    });
    expect(s.idTo! - s.idFrom!).toBe(3);
  });

  it('残高のつながりはファイルの並びで見る。合わない行の ID は上限まで', () => {
    const a = row({ amountIn: 1000, balance: 1000 });
    const b = row({ amountOut: 100, balance: 800 }); // 900 のはず
    const s = build([[a, b]]);
    expect(s.accounts[0]).toMatchObject({ balanceErrors: 1, balanceErrorIds: [b.id] });

    const many = [row({ amountIn: 1, balance: 1 }), ...Array.from({ length: MAX_ERROR_IDS + 5 }, () => row({ amountIn: 1, balance: 0 }))];
    const t = build([many]);
    expect(t.accounts[0]!.balanceErrors).toBe(MAX_ERROR_IDS + 5);
    expect(t.accounts[0]!.balanceErrorIds).toHaveLength(MAX_ERROR_IDS);
  });

  it('既存の取引との重なり・間（通帳の抜け）・取引の無い年', () => {
    const overlap = build([[row({ date: '2025-03-15' }), row({ date: '2025-06-30' })]], [
      { accountId: 1, date: '2025-01-05' },
      { accountId: 1, date: '2025-04-10' },
      { accountId: 2, date: '2020-01-01' }, // 別の口座は数えない
      { accountId: null, date: '2019-01-01' },
    ]);
    expect(overlap.accounts[0]).toMatchObject({
      before: { from: '2025-01-05', to: '2025-04-10', count: 2 },
      overlap: { from: '2025-03-15', to: '2025-04-10' },
      gaps: [],
      emptyYears: [],
    });

    const gap = build([[row({ date: '2025-02-01' })]], [{ accountId: 1, date: '2023-03-31' }]);
    expect(gap.accounts[0]).toMatchObject({ overlap: null, gaps: [{ from: '2023-04-01', to: '2025-01-31', days: 672 }], emptyYears: [2024] });

    // 90日までの間は知らせない（2か月ごとの年金だけの口座でも出ない）
    const near = build([[row({ date: '2025-06-30' })]], [{ accountId: 1, date: '2025-03-31' }]);
    expect(near.accounts[0]!.gaps).toEqual([]);
    const far = build([[row({ date: '2025-07-01' })]], [{ accountId: 1, date: '2025-03-31' }]);
    expect(far.accounts[0]!.gaps).toEqual([{ from: '2025-04-01', to: '2025-06-30', days: 91 }]);

    // 期間が重なっていても、今回の取引の中の間は拾う。前からある間（片側も今回でない）は出さない
    const inner = build([[row({ date: '2023-06-10' }), row({ date: '2025-02-01' })]], [
      { accountId: 1, date: '2020-01-01' },
      { accountId: 1, date: '2023-06-01' },
      { accountId: 1, date: '2023-06-15' },
    ]);
    expect(inner.accounts[0]).toMatchObject({
      overlap: { from: '2023-06-10', to: '2023-06-15' },
      gaps: [{ from: '2023-06-16', to: '2025-01-31', days: 596 }],
    });
  });

  it('分類の内訳と人が見る所', () => {
    const s = build([
      [
        row({ category: '生活費', categorySource: 'csv', memo: '  ', isFlagged: true }),
        row({ category: '贈与・教育費', categorySource: 'manual', memo: '確認する' }),
        row({ category: '生活費', categorySource: 'remap', isLarge: true }),
        row({ category: '通帳間移動', categorySource: 'auto', isTransfer: false }),
        row({ category: '通帳間移動', categorySource: 'auto', isTransfer: true }),
        row({ category: '未分類', categorySource: 'auto' }),
      ],
    ]);
    expect(s.categories).toEqual({ csv: 1, manual: 1, remap: 1, auto: 2, uncategorized: 1 });
    expect(s.attention).toEqual({ flagged: 1, memo: 1, large: 1, transferUnmatched: 1, gift: 1 });
  });

  it('何も入らなかったとき', () => {
    const s = buildImportSummary({ files: [[]], fileCount: 1, skipped: 3, accounts: [], existing: [] });
    expect(s).toMatchObject({ imported: 0, skipped: 3, idFrom: null, idTo: null, accounts: [] });
  });
});

describe('取引一覧の条件（?id_from / id_to / id / mark）', () => {
  const parse = (q: string) => filterFromQuery(new URLSearchParams(q));
  it('読めるものだけ条件にする', () => {
    expect(parse('id_from=10&id_to=20&id=11&id=x&id=12&mark=memo')).toMatchObject({ idFrom: 10, idTo: 20, ids: [11, 12], mark: 'memo' });
    expect(parse('id_from=-1&id_to=1.5&mark=nope')).toMatchObject({ idFrom: null, idTo: null, ids: [], mark: null });
  });
});
