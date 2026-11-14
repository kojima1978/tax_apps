import { describe, expect, it } from 'vitest';
import {
  blankRow,
  checkRows,
  duplicateWarning,
  hasOpenIssues,
  NO_FILE_REVIEW,
  reviewCounts,
  toCommitFile,
  unknownCategories,
  unreadableFlagCount,
  type EditFile,
  type EditRow,
} from './wizardRows';

const row = (day: number, dup: EditRow['dup']): EditRow => ({
  ...blankRow(`2024-04-${String(day).padStart(2, '0')}`),
  description: `摘要${day}`,
  amountOut: '1000',
  dup,
});

describe('duplicateWarning', () => {
  const rows = [row(1, 'high'), row(2, 'high'), row(3, 'high'), row(4, null), row(5, null)];

  it('3行続けて一致したら注意を出す', () => {
    expect(duplicateWarning(checkRows(rows, false))).toBe('既存データと 3 行連続で一致しています。重複インポートの可能性が高いです。');
  });

  it('重複の行を消したら注意も消える', () => {
    const left = rows.filter((r) => r.dup === null);
    expect(duplicateWarning(checkRows(left, false))).toBeNull();
  });

  it('一部だけ消したら数え直した件数で出る', () => {
    const more = [row(1, 'high'), row(2, 'high'), row(3, 'high'), row(4, null), row(5, 'high'), row(6, null)];
    const left = more.filter((_, i) => i !== 1);
    // 連続は2行に減ったが、5行中3行（60%）が一致
    expect(duplicateWarning(checkRows(left, false))).toBe('5 件中 3 件（60%）が既存データと一致しています。');
  });

  it('未入力の行は数えない', () => {
    const withBlank = [row(1, 'high'), row(2, 'high'), blankRow(), blankRow(), blankRow(), blankRow()];
    // 未入力を数えると 6 件中 2 件（33%）で注意になるが、数えなければ 2 件中 2 件で連続2行・件数2件 → 注意なし
    expect(duplicateWarning(checkRows(withBlank, false))).toBeNull();
  });
});

describe('分類・メモ・付箋（依頼24）', () => {
  const file = (rows: EditRow[]): EditFile => ({
    key: 1,
    filename: '架空.csv',
    isSplit: false,
    detected: true,
    hasBalance: false,
    hasMemo: true,
    hasFlag: true,
    account: { bankName: '架空銀行', branchName: '', accountType: '', accountNumber: '1234567' },
    rows,
    ...NO_FILE_REVIEW,
  });

  it('送るのは CSV・人が選んだ分類と、入っているメモ・付箋だけ（自動分類は送らない）', () => {
    const rows = [
      { ...row(1, null), category: '生活費', categoryOrigin: 'csv' as const },
      { ...row(2, null), autoCategory: '年金', memo: '  ', flagged: false },
      { ...row(3, null), memo: '読めない字', flagged: true },
      blankRow('2024-04-04'),
    ];
    expect(toCommitFile(file(rows)).rows).toEqual([
      { date: '2024-04-01', description: '摘要1', amountOut: '1000', amountIn: '', balance: '', category: '生活費', categorySource: 'csv' },
      { date: '2024-04-02', description: '摘要2', amountOut: '1000', amountIn: '', balance: '' },
      { date: '2024-04-03', description: '摘要3', amountOut: '1000', amountIn: '', balance: '', memo: '読めない字', flagged: true },
    ]);
  });

  it('分類の出どころを添える（取込の結果の内訳用）: CSV のまま・人が選んだ・知らない名前の読み替え', () => {
    const rows = [
      { ...row(1, null), category: '生活費', categoryOrigin: 'csv' as const },
      { ...row(2, null), category: '年金', categoryOrigin: 'manual' as const },
      { ...row(3, null), category: '給与', categoryOrigin: 'manual' as const, unknownCategory: 'ZZQ謎' },
      { ...row(4, null), unknownCategory: 'ZZQ謎' },
    ];
    expect(toCommitFile(file(rows)).rows.map((r) => ('categorySource' in r ? r.categorySource : null))).toEqual(['csv', 'manual', 'remap', null]);
  });

  it('知らない分類名を名前ごとに数え、読めない要確認の行を数える（未入力の行は数えない）', () => {
    const blank = { ...blankRow(), unknownCategory: 'ZZQ謎', flagUnreadable: '?' };
    const rows = [
      { ...row(1, null), unknownCategory: 'ZZQ謎', flagUnreadable: 'たぶん' },
      { ...row(2, null), unknownCategory: 'ZZQ謎', category: '生活費', categoryOrigin: 'manual' as const },
      { ...row(3, null), unknownCategory: 'ZZQ別' },
      blank,
    ];
    expect(unknownCategories([file(rows)])).toEqual([
      { name: 'ZZQ謎', count: 2, chosen: '' },
      { name: 'ZZQ別', count: 1, chosen: '' },
    ]);
    expect(unreadableFlagCount([file(rows)])).toBe(1);
  });
});

describe('問題の行（依頼26）', () => {
  const problem = (over: Partial<EditRow>): EditRow => ({
    ...blankRow('2024-08-01'),
    description: 'ZZQ',
    amountOut: '1000',
    issues: ['払戻額もお預り額も空欄（0）です（読み落とし・列ずれの疑い）'],
    fromProblem: true,
    ...over,
  });

  it('要確認は直すか「このままでよい」まで残り、確定の review を数える', () => {
    const fixed = problem({ issues: [] });
    const accepted = problem({ issues: [], accepted: true });
    const open = problem({});
    expect([fixed, accepted, open].map(hasOpenIssues)).toEqual([false, false, true]);
    const file: EditFile = {
      key: 1,
      filename: '架空.txt',
      isSplit: false,
      detected: true,
      hasBalance: true,
      hasMemo: false,
      hasFlag: false,
      account: { bankName: '', branchName: '', accountType: '', accountNumber: '1' },
      rows: [fixed, accepted, blankRow()],
      skipped: [{ line: 2, description: '繰越', balance: 5000, bankName: null, branchName: null, accountNumber: null }],
      openingBalance: 5000,
      problemTotal: 3, // 1行は削除した
    };
    expect(reviewCounts([file])).toEqual({ skippedRows: 1, problemFixed: 1, problemAccepted: 1, problemRemoved: 1 });
  });

  it('繰越の残高から1行目を確かめる', () => {
    const rows = [problem({ issues: [], amountOut: '1000', balance: '4000' })];
    expect(checkRows(rows, true, 5000)[0]).toMatchObject({ calcBalance: 4000, isBalanceError: false });
    expect(checkRows(rows, true, null)[0]).toMatchObject({ calcBalance: 4000, isBalanceError: false });
    expect(checkRows(rows, true, 6000)[0]!.isBalanceError).toBe(true);
  });
});
