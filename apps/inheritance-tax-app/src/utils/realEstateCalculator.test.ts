import { describe, expect, it } from 'vitest';
import type { HeirComposition, RealEstateInvestmentInput } from '../types';
import { calculateCompressedPropertyValue, calculateRealEstateSimulation } from './realEstateCalculator';

const composition: HeirComposition = {
  hasSpouse: true,
  selectedRank: 'rank1',
  rank1Children: [
    { id: 'child-1', type: 'child' },
    { id: 'child-2', type: 'child' },
  ],
  rank2Ascendants: [],
  rank3Siblings: [],
};

const input: RealEstateInvestmentInput = {
  investmentAmount: 10_000,
  compressionRate: 40,
  leaseholdRightRate: 60,
  tenantRightRate: 30,
};

describe('calculateCompressedPropertyValue', () => {
  it('圧縮後の評価額に借地権・借家権の調整を適用する', () => {
    expect(calculateCompressedPropertyValue(input)).toBe(4_920);
  });

  it('圧縮率を0から100パーセントの範囲に収める', () => {
    expect(calculateCompressedPropertyValue({ ...input, compressionRate: 150 })).toBe(0);
    expect(calculateCompressedPropertyValue({
      ...input,
      compressionRate: -20,
      leaseholdRightRate: 200,
      tenantRightRate: -20,
    })).toBe(10_000);
  });
});

describe('calculateRealEstateSimulation', () => {
  it('購入価格を賃貸不動産評価額へ置き換えて相続税を比較する', () => {
    const result = calculateRealEstateSimulation(20_000, composition, input, { mode: 'legal' });

    expect(result.investmentAmount).toBe(10_000);
    expect(result.remainingCash).toBe(10_000);
    expect(result.baseAssessedValue).toBe(6_000);
    expect(result.propertyAssessedValue).toBe(4_920);
    expect(result.proposed.estateValue).toBe(14_920);
    expect(result.valuationReduction).toBe(5_080);
    expect(result.taxSaving).toBeGreaterThanOrEqual(0);
    expect(result.netProceedsDiff).toBe(result.taxSaving);
  });
});
