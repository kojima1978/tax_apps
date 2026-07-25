import { describe, expect, it } from 'vitest';
import { calculateInheritanceTaxApi, parseInheritanceTaxApiRequest } from './inheritance-tax-api';

describe('calculateInheritanceTaxApi', () => {
  it('円単位の入力から相続税額を円単位で返す', () => {
    const result = calculateInheritanceTaxApi({
      estateValueJpy: 200_000_000,
      familyComposition: { hasSpouse: true, selectedRank: 'rank1', heirCount: 2 },
    });

    expect(result.unit).toBe('JPY');
    expect(result.estateValueJpy).toBe(200_000_000);
    expect(result.basicDeductionJpy).toBe(48_000_000);
    expect(result.totalInheritanceTaxJpy).toBeGreaterThan(0);
    expect(result.effectiveTaxRate).toBe(6.75);
    expect(result.heirs).toHaveLength(3);
    expect(result.heirs.reduce((sum, heir) => sum + heir.finalTaxJpy, 0)).toBe(result.totalInheritanceTaxJpy);
  });

  it('基礎控除以下の場合は相続税額を0円で返す', () => {
    const result = calculateInheritanceTaxApi({
      estateValueJpy: 40_000_000,
      familyComposition: { hasSpouse: true, selectedRank: 'rank1', heirCount: 1 },
    });

    expect(result.totalInheritanceTaxJpy).toBe(0);
  });

  it('相続順位と人数の矛盾を拒否する', () => {
    const parsed = parseInheritanceTaxApiRequest({
      estateValueJpy: 100_000_000,
      familyComposition: { hasSpouse: true, selectedRank: 'none', heirCount: 1 },
    });

    expect(parsed.success).toBe(false);
  });

  it('1万円単位ではない財産額を拒否する', () => {
    const parsed = parseInheritanceTaxApiRequest({
      estateValueJpy: 100_000_001,
      familyComposition: { hasSpouse: true, selectedRank: 'rank1', heirCount: 1 },
    });

    expect(parsed.success).toBe(false);
  });

  it('100%を超える配偶者取得割合を拒否する', () => {
    const parsed = parseInheritanceTaxApiRequest({
      estateValueJpy: 100_000_000,
      familyComposition: { hasSpouse: true, selectedRank: 'rank1', heirCount: 1 },
      spouseAcquisition: { mode: 'custom', unit: 'percent', value: 101 },
    });

    expect(parsed.success).toBe(false);
  });
});
