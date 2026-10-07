// 多額取引・資金移動の判定。正解の記録（transfer シナリオ）で確かめた組み合わせを手で並べる。
// シナリオを丸ごと流して transactions.json と突き合わせるのは次の段で。

import { describe, expect, it } from 'vitest';
import { DEFAULT_ANALYSIS_SETTINGS as S, detectTransfers, isLargeAmount, resolveAnalysisSettings } from '../lib/analyze.js';

const tx = (id: number, accountNumber: string, date: string, amountOut: number, amountIn: number) =>
  ({ id, accountNumber, date, amountOut, amountIn });

describe('資金移動', () => {
  it('手数料を差し引いた入金と組む', () => {
    expect(detectTransfers([tx(1, '1111111', '2024-04-01', 1_000_000, 0), tx(26, '2222222', '2024-04-01', 0, 999_560)], S)).toEqual([
      { id: 1, transferTo: '2222222 (2024-04-01) 手数料440円' },
      { id: 26, transferTo: '1111111 (2024-04-01) 手数料440円' },
    ]);
  });

  it('3日後までは組み、4日後・入金が先・誤差1001円は組まない', () => {
    const r = detectTransfers([
      tx(4, 'A', '2024-04-10', 30000, 0), tx(27, 'B', '2024-04-13', 0, 30000),
      tx(5, 'A', '2024-05-01', 40000, 0), tx(28, 'B', '2024-05-05', 0, 40000),
      tx(6, 'A', '2024-05-10', 60000, 0), tx(29, 'B', '2024-05-10', 0, 58999),
      tx(8, 'A', '2024-06-10', 70000, 0), tx(32, 'B', '2024-06-09', 0, 70000),
    ], S);
    expect(r.map((m) => m.id)).toEqual([4, 27]);
  });

  it('both なら入金が先でも組む', () => {
    expect(detectTransfers([tx(8, 'A', '2024-06-10', 70000, 0), tx(32, 'B', '2024-06-09', 0, 70000)], { ...S, transferDateMode: 'both' })).toHaveLength(2);
  });

  it('金額の近い方を選び、同じ口座・組み済みの入金は使わない', () => {
    const r = detectTransfers([
      tx(7, 'A', '2024-05-20', 50000, 0), tx(30, 'B', '2024-05-20', 0, 50500), tx(31, 'B', '2024-05-21', 0, 50000),
      tx(9, 'A', '2024-05-20', 50000, 0), tx(10, 'A', '2024-05-20', 0, 50000),
    ], S);
    expect(r).toEqual([
      { id: 7, transferTo: 'B (2024-05-21)' }, { id: 31, transferTo: 'A (2024-05-20)' },
      { id: 9, transferTo: 'B (2024-05-20)' }, { id: 30, transferTo: 'A (2024-05-20)' },
    ]);
  });
});

describe('多額・設定', () => {
  it('閾値以上', () => {
    expect(isLargeAmount(500_000, 0, 500_000)).toBe(true);
    expect(isLargeAmount(0, 499_999, 500_000)).toBe(false);
  });
  it('負の値と不正なモードは既定値', () => {
    expect(resolveAnalysisSettings({ transferTolerance: -1, transferDaysWindow: 0, transferDateMode: 'x' })).toEqual({ ...S, transferDaysWindow: 0 });
  });
});
