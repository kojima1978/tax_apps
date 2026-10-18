import { describe, expect, it } from 'vitest';
import type { HeirComposition, RealEstateInvestmentInput } from '../types';
import { calculateRentalPropertyValue, calculateRealEstateSimulation } from './realEstateCalculator';

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
  landPurchasePrice: 6_000,
  buildingPurchasePrice: 4_000,
  landSelfUseValue: 4_800,
  buildingFixedAssetTaxValue: 2_800,
  leaseholdRightRate: 60,
  tenantRightRate: 30,
  rentalRate: 100,
};

describe('calculateRentalPropertyValue', () => {
  it('貸家建付地と貸家の評価式を適用する', () => {
    expect(calculateRentalPropertyValue(input)).toEqual({
      landAssessedValue: 3_936,
      buildingAssessedValue: 1_960,
      propertyAssessedValue: 5_896,
    });
  });

  it('割合を0から100パーセントの範囲に収める', () => {
    expect(calculateRentalPropertyValue({
      ...input,
      leaseholdRightRate: 150,
      tenantRightRate: -20,
    })).toEqual({
      landAssessedValue: 4_800,
      buildingAssessedValue: 2_800,
      propertyAssessedValue: 7_600,
    });
  });
});

describe('calculateRealEstateSimulation', () => {
  it('購入価格を賃貸不動産評価額へ置き換えて相続税を比較する', () => {
    const result = calculateRealEstateSimulation(20_000, composition, input, { mode: 'legal' });

    expect(result.purchasePrice).toBe(10_000);
    expect(result.remainingCash).toBe(10_000);
    expect(result.propertyAssessedValue).toBe(5_896);
    expect(result.proposed.estateValue).toBe(15_896);
    expect(result.valuationReduction).toBe(4_104);
    expect(result.taxSaving).toBeGreaterThanOrEqual(0);
    expect(result.netProceedsDiff).toBe(result.taxSaving);
  });
});
