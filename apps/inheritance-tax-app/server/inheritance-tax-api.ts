import { z } from 'zod';
import type { Heir, HeirComposition, HeirType, SpouseAcquisitionMode } from '../src/types';
import { calculateDetailedInheritanceTax } from '../src/utils/taxCalculator';

const JPY_PER_MAN_YEN = 10_000;
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
  const result = calculateDetailedInheritanceTax(
    input.estateValueJpy / JPY_PER_MAN_YEN,
    createComposition(input.familyComposition),
    createSpouseMode(input.spouseAcquisition),
  );

  return {
    schemaVersion: '1.0',
    calculatedAt: new Date().toISOString(),
    unit: 'JPY',
    estateValueJpy: toJpy(result.estateValue),
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
      acquisitionAmountJpy: toJpy(heir.acquisitionAmount),
      taxBeforeDeductionsJpy: toJpy(heir.proportionalTax + heir.surchargeAmount),
      spouseDeductionJpy: toJpy(heir.spouseDeduction),
      finalTaxJpy: toJpy(heir.finalTax),
    })),
  };
}

export function parseInheritanceTaxApiRequest(payload: unknown) {
  return requestSchema.safeParse(payload);
}
