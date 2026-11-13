// 相続税の観点の集計（依頼22）。期間の切り方と境目の日、3つの集計。値はすべて架空。

import { describe, expect, it } from 'vitest';
import {
  addDays,
  giftAdditionPeriod,
  giftPeriodLabel,
  giftReview,
  inheritanceReview,
  isCashWithdrawal,
  isOutwardTransfer,
  monthsBefore,
  outwardReview,
  withdrawalReview,
  yearsBefore,
  type ReviewTx,
} from '../lib/inheritanceReview.js';

let nextId = 1;
const tx = (over: Partial<ReviewTx> = {}): ReviewTx => ({
  id: nextId++,
  accountId: 1,
  date: '2025-04-01',
  bankName: '架空銀行',
  branchName: '本店',
  accountType: '普通',
  accountNumber: '1234567',
  description: 'ZZQ架空',
  amountOut: 0,
  amountIn: 0,
  category: '未分類',
  isFlagged: false,
  ...over,
});
const gift = (date: string, amountOut: number, description = '架空花子') => tx({ date, amountOut, description, category: '贈与・教育費' });

describe('日付の計算', () => {
  it('n 年前の応当日。2/29 の応当日が無ければ 2/28（広めに取る）', () => {
    expect(yearsBefore('2026-06-15', 3)).toBe('2023-06-15');
    expect(yearsBefore('2028-02-29', 3)).toBe('2025-02-28');
    expect(yearsBefore('2028-02-29', 4)).toBe('2024-02-29');
  });
  it('n か月前の応当日。無ければ月末', () => {
    expect(monthsBefore('2026-06-15', 3)).toBe('2026-03-15');
    expect(monthsBefore('2026-05-31', 3)).toBe('2026-02-28');
    expect(monthsBefore('2028-05-31', 3)).toBe('2028-02-29');
    expect(monthsBefore('2026-02-10', 3)).toBe('2025-11-10');
    expect(monthsBefore('2026-12-31', 36)).toBe('2023-12-31');
  });
  it('日の足し引きは月・年をまたぐ', () => {
    expect(addDays('2024-01-01', -1)).toBe('2023-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });
});

describe('加算対象期間', () => {
  it('令和8年12月31日までの相続開始は3年以内（3年前の応当日から）', () => {
    const p = giftAdditionPeriod('2026-12-31');
    expect(p).toEqual({ kind: 'three', start: '2023-12-31', end: '2026-12-31', threeYearStart: '2023-12-31', extended: null });
    expect(giftPeriodLabel(p)).toBe('令和5年12月31日〜令和8年12月31日（相続開始前3年以内）');
  });
  it('令和9年1月1日は経過措置。3年前の日が R6.1.1 と同じなので延びた部分は無い', () => {
    const p = giftAdditionPeriod('2027-01-01');
    expect(p.kind).toBe('transition');
    expect(p.start).toBe('2024-01-01');
    expect(p.threeYearStart).toBe('2024-01-01');
    expect(p.extended).toBeNull();
  });
  it('令和9年1月2日から延びた部分ができる（R6.1.1 の1日だけ）', () => {
    const p = giftAdditionPeriod('2027-01-02');
    expect(p.extended).toEqual({ from: '2024-01-01', to: '2024-01-01' });
  });
  it('令和12年12月31日は R6.1.1 から。延びた部分は3年前の応当日の前日まで', () => {
    const p = giftAdditionPeriod('2030-12-31');
    expect(p.kind).toBe('transition');
    expect(p.start).toBe('2024-01-01');
    expect(p.threeYearStart).toBe('2027-12-31');
    expect(p.extended).toEqual({ from: '2024-01-01', to: '2027-12-30' });
  });
  it('令和13年1月1日からは7年以内', () => {
    const p = giftAdditionPeriod('2031-01-01');
    expect(p.kind).toBe('seven');
    expect(p.start).toBe('2024-01-01');
    expect(p.extended).toEqual({ from: '2024-01-01', to: '2027-12-31' });
    const q = giftAdditionPeriod('2033-07-10');
    expect(q.start).toBe('2026-07-10');
    expect(q.threeYearStart).toBe('2030-07-10');
    expect(giftPeriodLabel(q)).toBe('令和8年7月10日〜令和15年7月10日（相続開始前7年以内）');
  });
});

describe('生前贈与の検討', () => {
  it('応当日はちょうど期間の中、その前日は期間より前', () => {
    const r = giftReview([gift('2023-06-15', 500_000), gift('2023-06-14', 300_000), gift('2026-06-15', 100_000)], '2026-06-15');
    expect(r.count).toBe(2);
    expect(r.total).toBe(600_000);
    expect(r.before).toEqual({ count: 1, total: 300_000, from: '2023-06-14', to: '2023-06-14' });
  });
  it('基準日より後の贈与は数えない。出金以外・他の分類も数えない', () => {
    const r = giftReview(
      [gift('2026-06-16', 100_000), tx({ date: '2025-01-01', amountIn: 50_000, category: '贈与・教育費' }), tx({ date: '2025-01-01', amountOut: 70_000, category: '生活費' })],
      '2026-06-15',
    );
    expect(r.count).toBe(0);
  });
  it('相手先×暦年で、110万円超えに印。延びた部分と3年以内を分ける', () => {
    // 基準日 R10.3.1 → 期間 R6.1.1〜、3年以内は R7.3.1〜
    const txs = [
      gift('2024-01-01', 800_000), // R6.1.1 期間の初日（延びた部分）
      gift('2024-05-01', 500_000), // 延びた部分
      gift('2025-02-28', 400_000), // 3年前の応当日の前日 = 延びた部分
      gift('2025-03-01', 600_000), // 応当日 = 3年以内
      gift('2027-01-10', 1_100_000), // 3年以内・ちょうど110万円（超えない）
      gift('2026-05-01', 200_000, 'ｶｸｳ ｼﾞﾛｳ'),
      gift('2026-08-01', 300_000, 'カクウ　ジロウ'),
      gift('2023-12-31', 999_999), // R6.1.1 の前日 = 期間より前
    ];
    const r = giftReview(txs, '2028-03-01');
    expect(r.period.kind).toBe('transition');
    expect(r.period.extended).toEqual({ from: '2024-01-01', to: '2025-02-28' });
    expect(r.total).toBe(3_900_000);
    expect(r.within3).toBe(2_200_000);
    expect(r.extended).toBe(1_700_000);
    expect(r.before).toMatchObject({ count: 1, total: 999_999 });

    const hanako = r.counterparties[0]!;
    expect(hanako.counterparty).toBe('架空花子');
    expect(hanako.total).toBe(3_400_000);
    expect(hanako.extended).toBe(1_700_000);
    expect(hanako.within3).toBe(1_700_000);
    expect(hanako.extendedAfterDeduction).toBe(700_000);
    expect(hanako.years.map((y) => [y.year, y.total, y.overExemption, y.within3, y.extended])).toEqual([
      [2024, 1_300_000, true, 0, 1_300_000],
      [2025, 1_000_000, false, 600_000, 400_000],
      [2027, 1_100_000, false, 1_100_000, 0],
    ]);
    // 暦年の絞り込みは期間の内側に収める
    expect(hanako.years[0]).toMatchObject({ from: '2024-01-01', to: '2024-12-31' });

    // 半角カナ・全角空白の違いは同じ相手先にまとめる
    const jiro = r.counterparties[1]!;
    expect(jiro.total).toBe(500_000);
    expect(jiro.years).toHaveLength(1);
    expect(jiro.extendedAfterDeduction).toBe(0);
  });
  it('期間の初日と末日（基準日）を含む年の範囲を絞る', () => {
    const r = giftReview([gift('2024-08-01', 100), gift('2026-06-15', 100)], '2026-06-15');
    const ys = r.counterparties[0]!.years;
    expect(ys[0]).toMatchObject({ year: 2024, from: '2024-01-01' });
    // R8年6月15日の3年前は R5.6.15。2024 年は丸ごと期間内
    expect(ys[1]).toMatchObject({ year: 2026, from: '2026-01-01', to: '2026-06-15' });
    const s = giftReview([gift('2023-08-01', 100)], '2026-06-15');
    expect(s.counterparties[0]!.years[0]).toMatchObject({ from: '2023-06-15', to: '2023-12-31' });
  });
  it('摘要が空の贈与は「摘要なし」', () => {
    const r = giftReview([gift('2025-01-01', 100, '')], '2026-06-15');
    expect(r.counterparties[0]).toMatchObject({ counterparty: '摘要なし', keyword: '' });
  });
});

describe('相続開始直前の出金', () => {
  it('現金の引出しの見分け方', () => {
    expect(isCashWithdrawal('ＡＴＭ　引出')).toBe(true);
    expect(isCashWithdrawal('ｶｰﾄﾞ')).toBe(true);
    expect(isCashWithdrawal('カード 7-11')).toBe(true);
    expect(isCashWithdrawal('cd')).toBe(true);
    expect(isCashWithdrawal('現金払戻')).toBe(true);
    expect(isCashWithdrawal('JCBカード')).toBe(false);
    expect(isCashWithdrawal('電気料金')).toBe(false);
    expect(isCashWithdrawal(null)).toBe(false);
  });
  it('基準日の N か月前の応当日〜前日。現金と多額だけ、基準日以後は別枠', () => {
    const txs = [
      tx({ date: '2026-03-15', amountOut: 100_000, description: 'ATM' }), // 応当日 = 入る
      tx({ date: '2026-03-14', amountOut: 100_000, description: 'ATM' }), // 前日 = 入らない
      tx({ date: '2026-05-01', amountOut: 30_000, description: '電気料金' }), // 少額・現金でない
      tx({ date: '2026-05-02', amountOut: 600_000, description: '架空商事', accountId: 2, accountNumber: '7654321' }), // 多額
      tx({ date: '2026-06-14', amountOut: 700_000, description: 'カード' }), // 現金かつ多額
      tx({ date: '2026-06-14', amountIn: 700_000, description: 'ATM' }), // 入金は見ない
      tx({ date: '2026-06-15', amountOut: 200_000, description: 'ATM' }), // 基準日 = 別枠
      tx({ date: '2026-07-01', amountOut: 50_000, description: 'ATM' }), // 基準日後 = 別枠
    ];
    const w = withdrawalReview(txs, '2026-06-15', 3, 500_000);
    expect(w.from).toBe('2026-03-15');
    expect(w.to).toBe('2026-06-14');
    expect(w.before.rows.map((r) => [r.date, r.cash, r.large])).toEqual([
      ['2026-03-15', true, false],
      ['2026-05-02', false, true],
      ['2026-06-14', true, true],
    ]);
    expect(w.before.total).toBe(1_400_000);
    expect(w.before.cashTotal).toBe(800_000);
    expect(w.before.largeTotal).toBe(1_300_000);
    expect(w.before.byAccount.map((a) => [a.accountId, a.count, a.total, a.cash])).toEqual([
      [1, 2, 800_000, 800_000],
      [2, 1, 600_000, 0],
    ]);
    expect(w.after.rows.map((r) => r.date)).toEqual(['2026-06-15', '2026-07-01']);
    expect(w.after.total).toBe(250_000);
    expect(w.after).toMatchObject({ from: '2026-06-15', to: '2026-07-01' });
  });
  it('多額の基準が 0 なら現金だけ', () => {
    const w = withdrawalReview([tx({ date: '2026-06-01', amountOut: 9_000_000, description: '架空商事' })], '2026-06-15', 3, 0);
    expect(w.before.rows).toHaveLength(0);
  });
});

describe('口座の外への多額の移動', () => {
  it('振込・振替の見分け方', () => {
    expect(isOutwardTransfer('振込 カクウ')).toBe(true);
    expect(isOutwardTransfer('ﾌﾘｺﾐ ｶｸｳ')).toBe(true);
    expect(isOutwardTransfer('口座振替')).toBe(true);
    expect(isOutwardTransfer('電気料金')).toBe(false);
  });
  it('資金移動の組になったもの・現金・少額・入金は除き、新しい順。基準日との前後を付ける', () => {
    const paired = tx({ date: '2026-01-10', amountOut: 1_000_000, description: '振替' });
    const txs = [
      paired,
      tx({ date: '2025-12-01', amountOut: 2_000_000, description: '振込 カクウ' }),
      tx({ date: '2026-06-15', amountOut: 500_000, description: 'ﾌﾘｺﾐ' }), // ちょうど基準額 = 入る
      tx({ date: '2026-07-01', amountOut: 800_000, description: '送金' }),
      tx({ date: '2026-02-01', amountOut: 499_999, description: '振込' }), // 少額
      tx({ date: '2026-02-01', amountOut: 900_000, description: 'ATM振込' }), // 現金扱い
      tx({ date: '2026-02-01', amountIn: 900_000, description: '振込' }),
      tx({ date: '2026-02-01', amountOut: 900_000, description: '架空商事' }), // 振込の印なし
    ];
    const o = outwardReview(txs, '2026-06-15', 500_000, new Set([paired.id]));
    expect(o.rows.map((r) => [r.date, r.side, r.amountOut])).toEqual([
      ['2026-07-01', '後', 800_000],
      ['2026-06-15', '当日', 500_000],
      ['2025-12-01', '前', 2_000_000],
    ]);
    expect(o.total).toBe(3_300_000);
    expect(o.ids).toHaveLength(3);
  });
});

describe('まとめ', () => {
  it('3つをまとめて返す', () => {
    const r = inheritanceReview([gift('2025-01-01', 100)], '2026-06-15', { preDeathMonths: 6, largeThreshold: 500_000, pairedIds: new Set() });
    expect(r.referenceDate).toBe('2026-06-15');
    expect(r.gift.count).toBe(1);
    expect(r.withdrawal.months).toBe(6);
    expect(r.withdrawal.from).toBe('2025-12-15');
    expect(r.outward.threshold).toBe(500_000);
  });
});
