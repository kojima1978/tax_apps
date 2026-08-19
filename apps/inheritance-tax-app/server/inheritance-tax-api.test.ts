import { describe, expect, it } from 'vitest';
import { calculateInheritanceTaxApi, parseInheritanceTaxApiRequest } from './inheritance-tax-api';

describe('calculateInheritanceTaxApi', () => {
  it('円単位の入力から相続税額を円単位で返す', () => {
    const result = calculateInheritanceTaxApi({
      estateValueJpy: 200_000_000,
      familyComposition: { hasSpouse: true, selectedRank: 'rank1', heirCount: 2 },
    });

    expect(result.unit).toBe('JPY');
    expect(result.calculationVersion).toBe('inheritance-tax-2026.1');
    expect(result.taxRuleAsOf).toBe('2026-01-01');
    expect(result.legalHeirCount).toBe(3);
    expect(result.estateValueJpy).toBe(200_000_000);
    expect(result.basicDeductionJpy).toBe(48_000_000);
    expect(result.totalInheritanceTaxJpy).toBeGreaterThan(0);
    expect(result.effectiveTaxRate).toBe(6.75);
    expect(result.heirs).toHaveLength(3);
    expect(result.heirs[0]).toMatchObject({
      legalShareRatio: 0.5,
      legalShareAmountJpy: 76_000_000,
      taxOnLegalShareJpy: 15_800_000,
    });
    expect(result.heirs.reduce((sum, heir) => sum + heir.finalTaxJpy, 0)).toBe(result.totalInheritanceTaxJpy);
  });

  it('基礎控除以下の場合は相続税額を0円で返す', () => {
    const result = calculateInheritanceTaxApi({
      estateValueJpy: 40_000_000,
      familyComposition: { hasSpouse: true, selectedRank: 'rank1', heirCount: 1 },
    });

    expect(result.totalInheritanceTaxJpy).toBe(0);
  });

  it('法定相続人が受け取る死亡保険金に500万円×法定相続人数の非課税枠を適用する', () => {
    const result = calculateInheritanceTaxApi({
      estateValueJpy: 200_000_000,
      familyComposition: { hasSpouse: true, selectedRank: 'rank1', heirCount: 2 },
      lifeInsurance: {
        surrenderValueJpy: 10_000_000,
        contracts: [{ deathBenefitJpy: 30_000_000, beneficiaryIsLegalHeir: true }],
      },
    });

    expect(result.insuranceNonTaxableLimitJpy).toBe(15_000_000);
    expect(result.insuranceNonTaxableAmountJpy).toBe(15_000_000);
    expect(result.insuranceTaxableDeathBenefitJpy).toBe(15_000_000);
    expect(result.estateValueJpy).toBe(205_000_000);
  });

  it('法定相続人以外が受け取る死亡保険金には非課税枠を適用しない', () => {
    const result = calculateInheritanceTaxApi({
      estateValueJpy: 100_000_000,
      familyComposition: { hasSpouse: true, selectedRank: 'rank1', heirCount: 1 },
      lifeInsurance: {
        surrenderValueJpy: 5_000_000,
        contracts: [{ deathBenefitJpy: 20_000_000, beneficiaryIsLegalHeir: false }],
      },
    });

    expect(result.insuranceNonTaxableAmountJpy).toBe(0);
    expect(result.insuranceTaxableDeathBenefitJpy).toBe(20_000_000);
    expect(result.estateValueJpy).toBe(115_000_000);
  });

  it('法定相続人が受け取る死亡退職金に500万円×法定相続人数の非課税枠を適用する', () => {
    const result = calculateInheritanceTaxApi({
      estateValueJpy: 200_000_000,
      familyComposition: { hasSpouse: true, selectedRank: 'rank1', heirCount: 2 },
      retirementAllowance: {
        surrenderValueJpy: 10_000_000,
        contracts: [{ deathBenefitJpy: 30_000_000, recipientIsLegalHeir: true }],
      },
    });

    expect(result.retirementNonTaxableLimitJpy).toBe(15_000_000);
    expect(result.retirementNonTaxableAmountJpy).toBe(15_000_000);
    expect(result.retirementTaxableDeathBenefitJpy).toBe(15_000_000);
    // 2億 − 解約手当金1,000万 ＋ 課税対象1,500万
    expect(result.estateValueJpy).toBe(205_000_000);
  });

  it('法定相続人以外が受け取る死亡退職金には非課税枠を適用しない', () => {
    const result = calculateInheritanceTaxApi({
      estateValueJpy: 100_000_000,
      familyComposition: { hasSpouse: true, selectedRank: 'rank1', heirCount: 1 },
      retirementAllowance: {
        surrenderValueJpy: 5_000_000,
        contracts: [{ deathBenefitJpy: 20_000_000, recipientIsLegalHeir: false }],
      },
    });

    expect(result.retirementNonTaxableAmountJpy).toBe(0);
    expect(result.retirementTaxableDeathBenefitJpy).toBe(20_000_000);
    expect(result.estateValueJpy).toBe(115_000_000);
  });

  it('死亡保険金と死亡退職金の非課税枠はそれぞれ別枠で適用する', () => {
    const result = calculateInheritanceTaxApi({
      estateValueJpy: 200_000_000,
      familyComposition: { hasSpouse: true, selectedRank: 'rank1', heirCount: 2 },
      lifeInsurance: {
        surrenderValueJpy: 0,
        contracts: [{ deathBenefitJpy: 30_000_000, beneficiaryIsLegalHeir: true }],
      },
      retirementAllowance: {
        surrenderValueJpy: 0,
        contracts: [{ deathBenefitJpy: 30_000_000, recipientIsLegalHeir: true }],
      },
    });

    // 1,500万円の非課税枠を保険・退職金それぞれに適用する（合算して1,500万円ではない）
    expect(result.insuranceNonTaxableAmountJpy).toBe(15_000_000);
    expect(result.retirementNonTaxableAmountJpy).toBe(15_000_000);
    // 2億 ＋ 課税対象1,500万 ＋ 課税対象1,500万
    expect(result.estateValueJpy).toBe(230_000_000);
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
