import { describe, expect, it } from 'vitest';
import type { GiftRecipient, HeirComposition } from '../types';
import {
  calculateCashGiftSimulation,
  getGiftRecipientOptions,
  getGiftTaxTypeForHeirId,
  optimizeGiftAmounts,
} from './giftCalculator';

const createComposition = (
  overrides: Partial<HeirComposition> = {},
): HeirComposition => ({
  hasSpouse: true,
  selectedRank: 'rank1',
  rank1Children: [{ id: 'child-1', type: 'child' }],
  rank2Ascendants: [],
  rank3Siblings: [],
  ...overrides,
});

describe('getGiftRecipientOptions', () => {
  it('第1順位では配偶者と子を贈与受取人に含める', () => {
    expect(getGiftRecipientOptions(createComposition())).toEqual([
      { id: 'spouse', label: '配偶者' },
      { id: 'child-1', label: '子' },
    ]);
  });

  it('配偶者のみの構成でも配偶者を贈与受取人にできる', () => {
    expect(getGiftRecipientOptions(createComposition({
      selectedRank: 'none',
      rank1Children: [],
    }))).toEqual([{ id: 'spouse', label: '配偶者' }]);
  });

  it('第2順位では配偶者だけを贈与受取人に含める', () => {
    expect(getGiftRecipientOptions(createComposition({
      selectedRank: 'rank2',
      rank1Children: [],
      rank2Ascendants: [{ id: 'parent-1', type: 'parent' }],
    }))).toEqual([{ id: 'spouse', label: '配偶者' }]);
  });
});

describe('getGiftTaxTypeForHeirId', () => {
  it('配偶者は一般贈与、子・孫は特例贈与として扱う', () => {
    expect(getGiftTaxTypeForHeirId('spouse')).toBe('general');
    expect(getGiftTaxTypeForHeirId('child-1')).toBe('special');
  });
});

describe('optimizeGiftAmounts', () => {
  it('相続税と贈与税の合計が贈与なし以下となる年間贈与額を設定する', () => {
    const composition = createComposition();
    const recipients: GiftRecipient[] = [{
      id: 'gift-spouse',
      heirId: 'spouse',
      heirLabel: '配偶者',
      annualAmount: 0,
      years: 3,
      isHeir: true,
      taxType: 'general',
    }];

    const optimized = optimizeGiftAmounts(
      20_000,
      composition,
      recipients,
      { mode: 'legal' },
    );
    const current = calculateCashGiftSimulation(
      20_000,
      composition,
      recipients,
      { mode: 'legal' },
    );
    const proposed = calculateCashGiftSimulation(
      20_000,
      composition,
      optimized,
      { mode: 'legal' },
    );
    const currentTaxBurden = current.proposed.taxResult.totalFinalTax + current.totalGiftTax;
    const optimizedTaxBurden = proposed.proposed.taxResult.totalFinalTax + proposed.totalGiftTax;

    expect(optimized[0].annualAmount).toBeGreaterThanOrEqual(0);
    expect(optimized[0].annualAmount % 10).toBe(0);
    expect(optimizedTaxBurden).toBeLessThanOrEqual(currentTaxBurden);
  });
});
