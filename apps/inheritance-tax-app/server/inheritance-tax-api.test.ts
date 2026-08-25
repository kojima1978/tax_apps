import { describe, expect, it } from 'vitest';
import { calculateInheritanceTaxApi, parseInheritanceTaxApiRequest } from './inheritance-tax-api';

const spouse = { kind: 'spouse' } as const;
const other = { kind: 'other' } as const;
const heir = (index: number) => ({ kind: 'heir', index }) as const;

describe('calculateInheritanceTaxApi', () => {
  it('円単位の入力から相続税額を円単位で返す', () => {
    const result = calculateInheritanceTaxApi({
      estateValueJpy: 200_000_000,
      familyComposition: { hasSpouse: true, selectedRank: 'rank1', heirCount: 2 },
    });

    expect(result.unit).toBe('JPY');
    expect(result.calculationVersion).toBe('inheritance-tax-2026.2');
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
        contracts: [{ deathBenefitJpy: 30_000_000, recipient: spouse }],
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
        contracts: [{ deathBenefitJpy: 20_000_000, recipient: other }],
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
        contracts: [{ deathBenefitJpy: 30_000_000, recipient: spouse }],
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
        contracts: [{ deathBenefitJpy: 20_000_000, recipient: other }],
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
        contracts: [{ deathBenefitJpy: 30_000_000, recipient: spouse }],
      },
      retirementAllowance: {
        surrenderValueJpy: 0,
        contracts: [{ deathBenefitJpy: 30_000_000, recipient: spouse }],
      },
    });

    // 1,500万円の非課税枠を保険・退職金それぞれに適用する（合算して1,500万円ではない）
    expect(result.insuranceNonTaxableAmountJpy).toBe(15_000_000);
    expect(result.retirementNonTaxableAmountJpy).toBe(15_000_000);
    // 2億 ＋ 課税対象1,500万 ＋ 課税対象1,500万
    expect(result.estateValueJpy).toBe(230_000_000);
  });

  it('死亡保険金は受取人へ帰属させ、残りを法定相続分で按分する', () => {
    const result = calculateInheritanceTaxApi({
      estateValueJpy: 100_000_000,
      familyComposition: { hasSpouse: true, selectedRank: 'rank1', heirCount: 2 },
      lifeInsurance: {
        surrenderValueJpy: 0,
        // 子1が2,000万円を受け取る。非課税枠1,500万円を控除した500万円が子1に帰属する。
        contracts: [{ deathBenefitJpy: 20_000_000, recipient: heir(0) }],
      },
    });

    // 課税価格の合計額 1億500万、分割対象は保険金を除いた1億
    expect(result.estateValueJpy).toBe(105_000_000);
    expect(result.divisibleEstateJpy).toBe(100_000_000);
    // 配偶者 1億×1/2、子は残り5,000万円を折半し、子1にだけ課税保険金500万円が乗る
    expect(result.heirs.map((heir) => heir.acquisitionAmountJpy)).toEqual([50_000_000, 30_000_000, 25_000_000]);
    expect(result.heirs.map((heir) => heir.deemedTaxableJpy)).toEqual([0, 5_000_000, 0]);
    // 相続税の総額は課税価格の合計額から決まるので、受取人の指定では変わらない
    expect(result.totalTaxBeforeDeductionsJpy).toBe(7_030_000);
    // 配偶者の取得額が法定相続分（5,250万円）より小さくなり、軽減される額が減るため
    // 納付税額は増える（法定相続分どおりに按分した場合は352万円）
    expect(result.totalInheritanceTaxJpy).toBe(3_680_000);
    expect(result.heirs.reduce((sum, heir) => sum + heir.finalTaxJpy, 0)).toBe(result.totalInheritanceTaxJpy);
  });

  it('法定相続人以外が受け取る死亡保険金は受取人へ帰属させず按分に含める', () => {
    const result = calculateInheritanceTaxApi({
      estateValueJpy: 100_000_000,
      familyComposition: { hasSpouse: true, selectedRank: 'rank1', heirCount: 1 },
      lifeInsurance: {
        surrenderValueJpy: 0,
        contracts: [{ deathBenefitJpy: 20_000_000, recipient: other }],
      },
    });

    expect(result.estateValueJpy).toBe(120_000_000);
    expect(result.divisibleEstateJpy).toBe(120_000_000);
    expect(result.heirs.map((heir) => heir.acquisitionAmountJpy)).toEqual([60_000_000, 60_000_000]);
    expect(result.heirs.every((heir) => heir.deemedTaxableJpy === 0)).toBe(true);
  });

  it('非課税枠は受取人ごとの受取額に比例して配分する', () => {
    const result = calculateInheritanceTaxApi({
      estateValueJpy: 100_000_000,
      familyComposition: { hasSpouse: true, selectedRank: 'rank1', heirCount: 2 },
      lifeInsurance: {
        surrenderValueJpy: 0,
        contracts: [
          { deathBenefitJpy: 15_000_000, recipient: spouse },
          { deathBenefitJpy: 5_000_000, recipient: heir(0) },
        ],
      },
    });

    // 非課税枠1,500万円を 1,500万:500万 で配分 → 配偶者1,125万・子1 375万
    expect(result.heirs.map((heir) => heir.deemedNonTaxableJpy)).toEqual([11_250_000, 3_750_000, 0]);
    expect(result.heirs.map((heir) => heir.deemedTaxableJpy)).toEqual([3_750_000, 1_250_000, 0]);
    expect(result.heirs.map((heir) => heir.deemedBenefitJpy)).toEqual([15_000_000, 5_000_000, 0]);
    expect(result.insuranceNonTaxableAmountJpy).toBe(15_000_000);
  });

  it('相続順位と人数の矛盾を拒否する', () => {
    const parsed = parseInheritanceTaxApiRequest({
      estateValueJpy: 100_000_000,
      familyComposition: { hasSpouse: true, selectedRank: 'none', heirCount: 1 },
    });

    expect(parsed.success).toBe(false);
  });

  it('相続人数の範囲外を指す受取人を拒否する', () => {
    const parsed = parseInheritanceTaxApiRequest({
      estateValueJpy: 100_000_000,
      familyComposition: { hasSpouse: true, selectedRank: 'rank1', heirCount: 2 },
      lifeInsurance: { surrenderValueJpy: 0, contracts: [{ deathBenefitJpy: 10_000_000, recipient: heir(2) }] },
    });

    expect(parsed.success).toBe(false);
  });

  it('配偶者がいない構成で配偶者を受取人に指定するのを拒否する', () => {
    const parsed = parseInheritanceTaxApiRequest({
      estateValueJpy: 100_000_000,
      familyComposition: { hasSpouse: false, selectedRank: 'rank1', heirCount: 2 },
      retirementAllowance: { surrenderValueJpy: 0, contracts: [{ deathBenefitJpy: 10_000_000, recipient: spouse }] },
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
