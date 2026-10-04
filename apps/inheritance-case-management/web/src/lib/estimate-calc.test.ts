import { describe, expect, it } from 'vitest';
import {
  BASE_RATE,
  calcEstimate,
  calcSpecialAdditionsTotal,
  createFeeCalcSnapshot,
  type EstimateParams,
} from './estimate-calc';

const params = (over: Partial<EstimateParams> = {}): EstimateParams => ({
  propertyValue: 0,
  landRosenkaCount: 0,
  landBairitsuCount: 0,
  unlistedStockCount: 0,
  heirCount: 0,
  ...over,
});

describe('見積額の自動計算', () => {
  it('基本報酬は遺産総額の0.8%を切り捨てる', () => {
    // 123,456,789 × 0.008 = 987,654.312。円未満を繰り上げると請求額が1円ずれる。
    expect(calcEstimate(params({ propertyValue: 123_456_789 })).baseFee).toBe(987_654);
    expect(calcEstimate(params({ propertyValue: 0 })).baseFee).toBe(0);
    expect(BASE_RATE).toBe(0.008);
  });

  it('土地・非上場株式は区分ごとの単価を掛ける', () => {
    const b = calcEstimate(params({ landRosenkaCount: 3, landBairitsuCount: 2, unlistedStockCount: 1 }));
    expect(b.landRosenkaFee).toBe(30_000);
    expect(b.landBairitsuFee).toBe(6_000);
    expect(b.unlistedStockFee).toBe(100_000);
    expect(b.total).toBe(136_000);
  });

  it('相続人加算は2人目から、5人目以降は加算しない', () => {
    const heirFee = (heirCount: number) => calcEstimate(params({ heirCount })).heirFee;
    expect(heirFee(0)).toBe(0);
    expect(heirFee(1)).toBe(0);
    expect(heirFee(2)).toBe(50_000);
    expect(heirFee(5)).toBe(200_000);
    // 上限は4人分。6人でも10人でも増えない。
    expect(heirFee(6)).toBe(200_000);
    expect(heirFee(10)).toBe(200_000);
  });

  it('合計は内訳の総和', () => {
    const b = calcEstimate(params({ propertyValue: 50_000_000, landRosenkaCount: 1, unlistedStockCount: 1, heirCount: 3 }));
    expect(b.total).toBe(b.baseFee + b.landRosenkaFee + b.landBairitsuFee + b.unlistedStockFee + b.heirFee);
    expect(b.total).toBe(400_000 + 10_000 + 100_000 + 100_000);
  });
});

describe('特別加算', () => {
  it('3件目以降は合計に入れない（欄が2つしか無いため）', () => {
    const additions = [
      { description: 'A', amount: 10_000 },
      { description: 'B', amount: 20_000 },
      { description: 'C', amount: 1_000_000 },
    ];
    expect(calcSpecialAdditionsTotal(additions)).toBe(30_000);
    expect(calcSpecialAdditionsTotal()).toBe(0);
  });
});

describe('報酬計算の控え（feeCalcSnapshot）', () => {
  it('説明が空の加算は控えに残さない', () => {
    const snap = createFeeCalcSnapshot(params({ propertyValue: 10_000_000 }), 0, 'estimate', [
      { description: '  ', amount: 50_000 },
      { description: ' 複雑案件 ', amount: 30_000 },
    ]);
    expect(snap.specialAdditions).toEqual([{ description: '複雑案件', amount: 30_000 }]);
    expect(snap.specialAdditionsTotal).toBe(30_000);
  });

  it('値引き後の金額を持ち、計算の前提（単価と入力値）も一緒に残す', () => {
    const p = params({ propertyValue: 100_000_000, heirCount: 3 });
    const snap = createFeeCalcSnapshot(p, 100_000, 'fee', [{ description: '加算', amount: 50_000 }]);
    // 800,000 + 100,000（相続人2人分）+ 50,000 − 100,000
    expect(snap.breakdown.total).toBe(900_000);
    expect(snap.netAmount).toBe(850_000);
    expect(snap.appliedTo).toBe('fee');
    expect(snap.params).toEqual(p);
    expect(snap.rates.baseRate).toBe(0.008);
    expect(snap.rates.heirMaxAdditional).toBe(4);
  });
});
