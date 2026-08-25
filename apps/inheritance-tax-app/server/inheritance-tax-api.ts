import { z } from 'zod';
import type { Heir, HeirComposition, HeirTaxBreakdown, HeirType, SpouseAcquisitionMode } from '../src/types';
import { calculateDetailedInheritanceTax } from '../src/utils/taxCalculator';
import { reapportionTax } from '../src/utils/reapportionTax';

const JPY_PER_MAN_YEN = 10_000;
const INSURANCE_EXEMPTION_PER_LEGAL_HEIR_JPY = 5_000_000;
// 退職手当金等の非課税枠。生命保険金とは別枠で、限度額は同じ「500万円 × 法定相続人数」。
const RETIREMENT_EXEMPTION_PER_LEGAL_HEIR_JPY = 5_000_000;
const CALCULATION_VERSION = 'inheritance-tax-2026.2';
const TAX_RULE_AS_OF = '2026-01-01';
const rankSchema = z.enum(['none', 'rank1', 'rank2', 'rank3']);
const jpySchema = z.number().finite().int().min(0).max(Number.MAX_SAFE_INTEGER).multipleOf(JPY_PER_MAN_YEN, {
  message: '金額は1万円単位で指定してください。',
});

// 死亡保険金・死亡退職金の受取人。みなし相続財産は遺産分割の対象ではなく受取人固有の権利なので、
// 誰が受け取るかを指定してもらい、その人の取得額へ直接帰属させる。
// heir の index は familyComposition.heirCount の並び（0始まり）を指す。
const recipientSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('spouse') }),
  z.object({ kind: z.literal('heir'), index: z.number().int().min(0).max(19) }),
  z.object({ kind: z.literal('other') }),
]);

const deemedAssetSchema = z.object({
  surrenderValueJpy: jpySchema,
  contracts: z.array(z.object({
    deathBenefitJpy: jpySchema,
    recipient: recipientSchema,
  })).max(100),
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
  lifeInsurance: deemedAssetSchema.optional(),
  // 死亡退職金（退職手当金等）。小規模企業共済などは生存中の解約手当金がB/Sに載るため、
  // 生命保険と同じく「解約返戻金を差し引いて、課税対象の死亡退職金を加える」形で受け取る。
  retirementAllowance: deemedAssetSchema.optional(),
}).superRefine((value, context) => {
  // 受取人の指定が家族構成と食い違うと、帰属先が見つからず黙って按分へ混ざる。
  // 気づけないまま税額だけずれるのを避けるため、ここで弾く。
  const { hasSpouse, selectedRank, heirCount } = value.familyComposition;
  const checkRecipients = (asset: DeemedAssetInput | undefined, key: 'lifeInsurance' | 'retirementAllowance') => {
    asset?.contracts.forEach((contract, index) => {
      const path = [key, 'contracts', index, 'recipient'];
      if (contract.recipient.kind === 'spouse' && !hasSpouse) {
        context.addIssue({ code: z.ZodIssueCode.custom, path, message: '配偶者がいない構成では受取人に配偶者を指定できません。' });
      }
      if (contract.recipient.kind === 'heir' && (selectedRank === 'none' || contract.recipient.index >= heirCount)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path, message: '受取人の相続人番号が相続人数の範囲外です。' });
      }
    });
  };
  checkRecipients(value.lifeInsurance, 'lifeInsurance');
  checkRecipients(value.retirementAllowance, 'retirementAllowance');
});

export type InheritanceTaxApiRequest = z.infer<typeof requestSchema>;
type FamilyCompositionInput = InheritanceTaxApiRequest['familyComposition'];
type DeemedAssetInput = z.infer<typeof deemedAssetSchema>;
type RecipientInput = z.infer<typeof recipientSchema>;

const heirTypeByRank: Record<Exclude<FamilyCompositionInput['selectedRank'], 'none'>, HeirType> = {
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

function createComposition(input: FamilyCompositionInput): HeirComposition {
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

/** 受取人を heirBreakdowns の heirId に対応づける。法定相続人以外は null。 */
function recipientHeirId(recipient: RecipientInput, composition: FamilyCompositionInput): string | null {
  if (recipient.kind === 'spouse') return 'spouse';
  if (recipient.kind === 'heir' && composition.selectedRank !== 'none') {
    return `${heirTypeByRank[composition.selectedRank]}-${recipient.index + 1}`;
  }
  return null;
}

type AmountsByHeirId = Map<string, number>;
const addAmount = (amounts: AmountsByHeirId, heirId: string, value: number) => amounts.set(heirId, (amounts.get(heirId) ?? 0) + value);
const mergeAmounts = (left: AmountsByHeirId, right: AmountsByHeirId): AmountsByHeirId => {
  const merged = new Map(left);
  for (const [heirId, value] of right) addAmount(merged, heirId, value);
  return merged;
};
const sumAmounts = (amounts: AmountsByHeirId) => [...amounts.values()].reduce((sum, value) => sum + value, 0);

/**
 * みなし相続財産（死亡保険金・死亡退職金）の集計。
 *
 * 非課税枠は法定相続人が受け取る分にだけ適用し、各人へは受取額に比例して配分する（相法12条1項5号ロ）。
 * 各人を切り捨てると配分の合計が非課税額に満たないため、不足分は最大剰余法で
 * 小数部の大きい順（同点は受取額の多い順）に1万円ずつ寄せて合計を一致させる。
 */
function summarizeDeemedAsset(
  asset: DeemedAssetInput | undefined,
  exemptionPerLegalHeirJpy: number,
  legalHeirCount: number,
  composition: FamilyCompositionInput,
) {
  const contracts = asset?.contracts ?? [];
  const deathBenefitJpy = contracts.reduce((sum, contract) => sum + contract.deathBenefitJpy, 0);
  const eligibleContracts = contracts.filter((contract) => contract.recipient.kind !== 'other');
  const eligibleBenefitJpy = eligibleContracts.reduce((sum, contract) => sum + contract.deathBenefitJpy, 0);
  const nonTaxableLimitJpy = asset ? exemptionPerLegalHeirJpy * legalHeirCount : 0;
  const nonTaxableAmountJpy = Math.min(eligibleBenefitJpy, nonTaxableLimitJpy);

  const nonTaxableUnits = nonTaxableAmountJpy / JPY_PER_MAN_YEN;
  const allocations = eligibleContracts.map((contract) => {
    const exact = eligibleBenefitJpy > 0 ? nonTaxableUnits * (contract.deathBenefitJpy / eligibleBenefitJpy) : 0;
    const units = Math.floor(exact);
    return { contract, units, fraction: exact - units };
  });
  let remainder = nonTaxableUnits - allocations.reduce((sum, allocation) => sum + allocation.units, 0);
  const order = [...allocations].sort((a, b) => (b.fraction - a.fraction) || (b.contract.deathBenefitJpy - a.contract.deathBenefitJpy));
  for (const allocation of order) {
    if (remainder <= 0) break;
    allocation.units += 1;
    remainder -= 1;
  }

  const benefitByHeirId: AmountsByHeirId = new Map();
  const nonTaxableByHeirId: AmountsByHeirId = new Map();
  const taxableByHeirId: AmountsByHeirId = new Map();
  for (const { contract, units } of allocations) {
    const heirId = recipientHeirId(contract.recipient, composition);
    if (!heirId) continue;
    const nonTaxableJpy = units * JPY_PER_MAN_YEN;
    addAmount(benefitByHeirId, heirId, contract.deathBenefitJpy);
    addAmount(nonTaxableByHeirId, heirId, nonTaxableJpy);
    addAmount(taxableByHeirId, heirId, contract.deathBenefitJpy - nonTaxableJpy);
  }

  return {
    surrenderValueJpy: asset?.surrenderValueJpy ?? 0,
    deathBenefitJpy,
    nonTaxableLimitJpy,
    nonTaxableAmountJpy,
    taxableDeathBenefitJpy: deathBenefitJpy - nonTaxableAmountJpy,
    benefitByHeirId,
    nonTaxableByHeirId,
    taxableByHeirId,
  };
}

const toJpy = (valueInManYen: number) => Math.round(valueInManYen * JPY_PER_MAN_YEN);

export function calculateInheritanceTaxApi(payload: unknown) {
  const input = requestSchema.parse(payload);
  const legalHeirCount = (input.familyComposition.hasSpouse ? 1 : 0)
    + (input.familyComposition.selectedRank === 'none' ? 0 : input.familyComposition.heirCount);
  const insurance = summarizeDeemedAsset(input.lifeInsurance, INSURANCE_EXEMPTION_PER_LEGAL_HEIR_JPY, legalHeirCount, input.familyComposition);
  // 死亡退職金も生命保険金と同じ手順で置き換える。非課税枠は生命保険とは別枠で判定する。
  const retirement = summarizeDeemedAsset(input.retirementAllowance, RETIREMENT_EXEMPTION_PER_LEGAL_HEIR_JPY, legalHeirCount, input.familyComposition);
  const adjustedEstateValueJpy = Math.max(
    0,
    input.estateValueJpy
      - insurance.surrenderValueJpy + insurance.taxableDeathBenefitJpy
      - retirement.surrenderValueJpy + retirement.taxableDeathBenefitJpy,
  );

  // 法定相続人が受け取る分は受取人の取得額へ直接帰属させ、残り（分割対象の財産と、
  // 法定相続人以外が受け取る分）を法定相続分で按分する。
  // 相続税の総額は課税価格の合計額から決まるので変わらない。変わるのは各人の取得額と、
  // そこから決まる按分税額・2割加算・配偶者の税額軽減。
  const deemedTaxableByHeirId = mergeAmounts(insurance.taxableByHeirId, retirement.taxableByHeirId);
  const divisibleEstateJpy = Math.max(0, adjustedEstateValueJpy - sumAmounts(deemedTaxableByHeirId));

  const composition = createComposition(input.familyComposition);
  const spouseMode = createSpouseMode(input.spouseAcquisition);
  const result = reapportionTax(
    calculateDetailedInheritanceTax(adjustedEstateValueJpy / JPY_PER_MAN_YEN, composition, spouseMode),
    divisibleEstateJpy / JPY_PER_MAN_YEN,
    composition,
    spouseMode,
    (breakdowns: HeirTaxBreakdown[]) => {
      for (const breakdown of breakdowns) {
        breakdown.acquisitionAmount += (deemedTaxableByHeirId.get(breakdown.heirId ?? '') ?? 0) / JPY_PER_MAN_YEN;
      }
    },
    // 按分の分母は課税価格の合計額
    () => adjustedEstateValueJpy / JPY_PER_MAN_YEN,
  );

  const deemedBenefitByHeirId = mergeAmounts(insurance.benefitByHeirId, retirement.benefitByHeirId);
  const deemedNonTaxableByHeirId = mergeAmounts(insurance.nonTaxableByHeirId, retirement.nonTaxableByHeirId);

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
    divisibleEstateJpy,
    insuranceSurrenderValueJpy: insurance.surrenderValueJpy,
    insuranceDeathBenefitJpy: insurance.deathBenefitJpy,
    insuranceNonTaxableLimitJpy: insurance.nonTaxableLimitJpy,
    insuranceNonTaxableAmountJpy: insurance.nonTaxableAmountJpy,
    insuranceTaxableDeathBenefitJpy: insurance.taxableDeathBenefitJpy,
    retirementSurrenderValueJpy: retirement.surrenderValueJpy,
    retirementDeathBenefitJpy: retirement.deathBenefitJpy,
    retirementNonTaxableLimitJpy: retirement.nonTaxableLimitJpy,
    retirementNonTaxableAmountJpy: retirement.nonTaxableAmountJpy,
    retirementTaxableDeathBenefitJpy: retirement.taxableDeathBenefitJpy,
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
      deemedBenefitJpy: deemedBenefitByHeirId.get(heir.heirId ?? '') ?? 0,
      deemedNonTaxableJpy: deemedNonTaxableByHeirId.get(heir.heirId ?? '') ?? 0,
      deemedTaxableJpy: deemedTaxableByHeirId.get(heir.heirId ?? '') ?? 0,
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
