import { z } from 'zod';
import type { Heir, HeirComposition, HeirType, SpouseAcquisitionMode } from '../src/types';
import { calculateDetailedInheritanceTax } from '../src/utils/taxCalculator';

const JPY_PER_MAN_YEN = 10_000;
const INSURANCE_EXEMPTION_PER_LEGAL_HEIR_JPY = 5_000_000;
// 退職手当金等の非課税枠。生命保険金とは別枠で、限度額は同じ「500万円 × 法定相続人数」。
const RETIREMENT_EXEMPTION_PER_LEGAL_HEIR_JPY = 5_000_000;
const CALCULATION_VERSION = 'inheritance-tax-2026.1';
const TAX_RULE_AS_OF = '2026-01-01';
const rankSchema = z.enum(['none', 'rank1', 'rank2', 'rank3']);
const jpySchema = z.number().finite().int().min(0).max(Number.MAX_SAFE_INTEGER).multipleOf(JPY_PER_MAN_YEN, {
  message: '金額は1万円単位で指定してください。',
});

const requestSchema = z.object({
  estateValueJpy: jpySchema,
  familyComposition: z.object({
    hasSpouse: z.boolean(),
    selectedRank: rankSchema,
    heirCount: z.number().int().min(0).max(20),
  }).superRefine((value, context) => {
    if (value.selectedRank === 'none' && value.heirCount !== 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['heirCount'], message: 'selectedRankがnoneの場合、heirCountは0にしてください。' });
    }
    if (value.selectedRank !== 'none' && value.heirCount < 1) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['heirCount'], message: '相続順位を指定する場合、heirCountは1以上にしてください。' });
    }
  }),
  spouseAcquisition: z.union([
    z.object({ mode: z.literal('legal') }),
    z.object({ mode: z.literal('limit160m') }),
    z.object({
      mode: z.literal('custom'),
      value: jpySchema,
      unit: z.literal('jpy'),
    }),
    z.object({
      mode: z.literal('custom'),
      value: z.number().finite().min(0).max(100),
      unit: z.literal('percent'),
    }),
  ]).optional(),
  lifeInsurance: z.object({
    surrenderValueJpy: jpySchema,
    contracts: z.array(z.object({
      deathBenefitJpy: jpySchema,
      beneficiaryIsLegalHeir: z.boolean(),
    })).max(100),
  }).optional(),
  // 死亡退職金（退職手当金等）。小規模企業共済などは生存中の解約手当金がB/Sに載るため、
  // 生命保険と同じく「解約返戻金を差し引いて、課税対象の死亡退職金を加える」形で受け取る。
  retirementAllowance: z.object({
    surrenderValueJpy: jpySchema,
    contracts: z.array(z.object({
      deathBenefitJpy: jpySchema,
      recipientIsLegalHeir: z.boolean(),
    })).max(100),
  }).optional(),
});

export type InheritanceTaxApiRequest = z.infer<typeof requestSchema>;

const heirTypeByRank: Record<Exclude<InheritanceTaxApiRequest['familyComposition']['selectedRank'], 'none'>, HeirType> = {
  rank1: 'child',
  rank2: 'parent',
  rank3: 'sibling',
};

function createHeirs(type: HeirType, count: number): Heir[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${type}-${index + 1}`,
    type,
    isDeceased: false,
    representatives: [],
  }));
}

function createComposition(input: InheritanceTaxApiRequest['familyComposition']): HeirComposition {
  const heirs = input.selectedRank === 'none' ? [] : createHeirs(heirTypeByRank[input.selectedRank], input.heirCount);
  return {
    hasSpouse: input.hasSpouse,
    selectedRank: input.selectedRank,
    rank1Children: input.selectedRank === 'rank1' ? heirs : [],
    rank2Ascendants: input.selectedRank === 'rank2' ? heirs : [],
    rank3Siblings: input.selectedRank === 'rank3' ? heirs : [],
  };
}

function createSpouseMode(input: InheritanceTaxApiRequest['spouseAcquisition']): SpouseAcquisitionMode {
  if (!input || input.mode === 'legal' || input.mode === 'limit160m') return input ?? { mode: 'legal' };
  return {
    mode: 'custom',
    value: input.unit === 'jpy' ? input.value / JPY_PER_MAN_YEN : input.value,
    unit: input.unit === 'jpy' ? 'amount' : 'percent',
  };
}

const toJpy = (valueInManYen: number) => Math.round(valueInManYen * JPY_PER_MAN_YEN);

export function calculateInheritanceTaxApi(payload: unknown) {
  const input = requestSchema.parse(payload);
  const legalHeirCount = (input.familyComposition.hasSpouse ? 1 : 0)
    + (input.familyComposition.selectedRank === 'none' ? 0 : input.familyComposition.heirCount);
  const insuranceDeathBenefitJpy = input.lifeInsurance?.contracts.reduce((sum, contract) => sum + contract.deathBenefitJpy, 0) ?? 0;
  const insuranceEligibleDeathBenefitJpy = input.lifeInsurance?.contracts.reduce(
    (sum, contract) => sum + (contract.beneficiaryIsLegalHeir ? contract.deathBenefitJpy : 0),
    0,
  ) ?? 0;
  const insuranceNonTaxableLimitJpy = input.lifeInsurance
    ? INSURANCE_EXEMPTION_PER_LEGAL_HEIR_JPY * legalHeirCount
    : 0;
  const insuranceNonTaxableAmountJpy = Math.min(insuranceEligibleDeathBenefitJpy, insuranceNonTaxableLimitJpy);
  const insuranceTaxableDeathBenefitJpy = insuranceDeathBenefitJpy - insuranceNonTaxableAmountJpy;
  const insuranceSurrenderValueJpy = input.lifeInsurance?.surrenderValueJpy ?? 0;
  // 死亡退職金も生命保険金と同じ手順で置き換える。非課税枠は生命保険とは別枠で判定する。
  const retirementDeathBenefitJpy = input.retirementAllowance?.contracts.reduce((sum, contract) => sum + contract.deathBenefitJpy, 0) ?? 0;
  const retirementEligibleDeathBenefitJpy = input.retirementAllowance?.contracts.reduce(
    (sum, contract) => sum + (contract.recipientIsLegalHeir ? contract.deathBenefitJpy : 0),
    0,
  ) ?? 0;
  const retirementNonTaxableLimitJpy = input.retirementAllowance
    ? RETIREMENT_EXEMPTION_PER_LEGAL_HEIR_JPY * legalHeirCount
    : 0;
  const retirementNonTaxableAmountJpy = Math.min(retirementEligibleDeathBenefitJpy, retirementNonTaxableLimitJpy);
  const retirementTaxableDeathBenefitJpy = retirementDeathBenefitJpy - retirementNonTaxableAmountJpy;
  const retirementSurrenderValueJpy = input.retirementAllowance?.surrenderValueJpy ?? 0;
  const adjustedEstateValueJpy = Math.max(
    0,
    input.estateValueJpy
      - insuranceSurrenderValueJpy + insuranceTaxableDeathBenefitJpy
      - retirementSurrenderValueJpy + retirementTaxableDeathBenefitJpy,
  );
  const result = calculateDetailedInheritanceTax(
    adjustedEstateValueJpy / JPY_PER_MAN_YEN,
    createComposition(input.familyComposition),
    createSpouseMode(input.spouseAcquisition),
  );

  return {
    schemaVersion: '1.0',
    calculationVersion: CALCULATION_VERSION,
    taxRuleAsOf: TAX_RULE_AS_OF,
    calculatedAt: new Date().toISOString(),
    unit: 'JPY',
    familyComposition: input.familyComposition,
    legalHeirCount,
    inputEstateValueJpy: input.estateValueJpy,
    estateValueJpy: toJpy(result.estateValue),
    insuranceSurrenderValueJpy,
    insuranceDeathBenefitJpy,
    insuranceNonTaxableLimitJpy,
    insuranceNonTaxableAmountJpy,
    insuranceTaxableDeathBenefitJpy,
    retirementSurrenderValueJpy,
    retirementDeathBenefitJpy,
    retirementNonTaxableLimitJpy,
    retirementNonTaxableAmountJpy,
    retirementTaxableDeathBenefitJpy,
    basicDeductionJpy: toJpy(result.basicDeduction),
    taxableEstateJpy: toJpy(result.taxableAmount),
    totalTaxBeforeDeductionsJpy: toJpy(result.totalTax),
    totalInheritanceTaxJpy: toJpy(result.totalFinalTax),
    effectiveTaxRateBeforeDeductions: result.effectiveTaxRate,
    effectiveTaxRate: result.estateValue > 0 ? result.totalFinalTax / result.estateValue * 100 : 0,
    heirs: result.heirBreakdowns.map((heir) => ({
      id: heir.heirId ?? null,
      label: heir.label,
      type: heir.type,
      legalShareRatio: heir.legalShareRatio,
      legalShareAmountJpy: toJpy(heir.legalShareAmount),
      taxOnLegalShareJpy: toJpy(heir.taxOnShare),
      acquisitionAmountJpy: toJpy(heir.acquisitionAmount),
      proportionalTaxJpy: toJpy(heir.proportionalTax),
      surchargeAmountJpy: toJpy(heir.surchargeAmount),
      taxBeforeDeductionsJpy: toJpy(heir.proportionalTax + heir.surchargeAmount),
      spouseDeductionJpy: toJpy(heir.spouseDeduction),
      finalTaxJpy: toJpy(heir.finalTax),
    })),
  };
}

export function parseInheritanceTaxApiRequest(payload: unknown) {
  return requestSchema.safeParse(payload);
}
