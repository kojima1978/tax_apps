import type {
  HeirComposition,
  SpouseAcquisitionMode,
  InsuranceContract,
  InsuranceHeirBreakdown,
  InsuranceScenarioResult,
  InsuranceSimulationResult,
  DetailedTaxCalculationResult,
  SpouseDeductionDetail,
} from '../types';
import { INSURANCE_EXEMPT_PER_HEIR, SHARE_RATIOS, SPOUSE_DEDUCTION_LIMIT } from '../constants';
import { getHeirInfo, getBeneficiaryOptions } from './heirUtils';
import { calculateDetailedInheritanceTax } from './taxCalculator';

/**
 * 保険契約リストから相続人別の受取保険金・保険料負担を集計し、
 * 非課税枠を按分して InsuranceHeirBreakdown[] を生成する
 *
 * premiumPaid: 新規契約（category='new'）の保険料のみ受取人に帰属
 */
function calculateHeirInsuranceBreakdowns(
  contracts: InsuranceContract[],
  nonTaxableLimit: number,
  composition: HeirComposition,
): InsuranceHeirBreakdown[] {
  const options = getBeneficiaryOptions(composition);

  // 受取人別に保険金・新規保険料を集計
  const benefitMap = new Map<string, number>();
  const premiumMap = new Map<string, number>();
  for (const opt of options) {
    benefitMap.set(opt.id, 0);
    premiumMap.set(opt.id, 0);
  }
  for (const c of contracts) {
    if (benefitMap.has(c.beneficiaryId)) {
      benefitMap.set(c.beneficiaryId, (benefitMap.get(c.beneficiaryId) || 0) + c.benefit);
      if (c.category === 'new') {
        premiumMap.set(c.beneficiaryId, (premiumMap.get(c.beneficiaryId) || 0) + c.premium);
      }
    }
  }

  const totalBenefitToHeirs = Array.from(benefitMap.values()).reduce((s, v) => s + v, 0);
  const actualNonTaxable = Math.min(totalBenefitToHeirs, nonTaxableLimit);

  const breakdowns: InsuranceHeirBreakdown[] = [];
  for (const opt of options) {
    const benefit = benefitMap.get(opt.id) || 0;
    const premium = premiumMap.get(opt.id) || 0;
    const nonTaxable = totalBenefitToHeirs > 0
      ? Math.floor(actualNonTaxable * (benefit / totalBenefitToHeirs))
      : 0;
    breakdowns.push({
      label: opt.label,
      totalBenefit: benefit,
      nonTaxableAmount: nonTaxable,
      taxableAmount: benefit - nonTaxable,
      premiumPaid: premium,
    });
  }

  return breakdowns;
}

/**
 * 受取人帰属モデルで税の按分を再計算する。
 *
 * 標準モデル: 保険料を遺産全体から控除 → 法定相続分で分割（全員が均等に負担）
 * 受取人帰属モデル: 保険料控除前の元の遺産で法定相続分に分割 → 受取人から保険料を控除
 *                  課税対象保険金も受取人に直接帰属
 *
 * 相続税の総額（totalTax）は変わらず、按分・控除・最終税額のみ再計算する。
 */
function reapportionForBeneficiaryModel(
  taxResult: DetailedTaxCalculationResult,
  baseEstate: number,
  adjustedEstate: number,
  heirInsBreakdowns: InsuranceHeirBreakdown[],
  composition: HeirComposition,
  spouseMode: SpouseAcquisitionMode,
): DetailedTaxCalculationResult {
  const breakdowns = taxResult.heirBreakdowns.map(b => ({ ...b }));
  if (breakdowns.length === 0) return taxResult;

  const { rank } = getHeirInfo(composition);
  const hasSpouse = composition.hasSpouse;

  // 法定相続分の割合
  const ratios = hasSpouse && SHARE_RATIOS[rank]
    ? SHARE_RATIOS[rank]
    : hasSpouse ? { spouse: 1.0, others: 0 } : null;
  const spouseLegalRatio = ratios ? ratios.spouse : 0;

  const spouseIdx = breakdowns.findIndex(b => b.type === 'spouse');
  const otherIndices = breakdowns.map((_, i) => i).filter(i => i !== spouseIdx);

  // 1. 元の遺産ベースで各相続人の基本取得額を計算
  if (spouseIdx >= 0) {
    let spouseBase: number;
    if (spouseMode.mode === 'legal') {
      spouseBase = Math.floor(baseEstate * spouseLegalRatio);
    } else if (spouseMode.mode === 'limit160m') {
      spouseBase = Math.min(baseEstate, SPOUSE_DEDUCTION_LIMIT);
    } else {
      spouseBase = Math.min(spouseMode.value, baseEstate);
    }
    breakdowns[spouseIdx].acquisitionAmount = spouseBase;

    const remaining = baseEstate - spouseBase;
    const otherCount = otherIndices.length;
    if (otherCount > 0) {
      const perPerson = Math.floor(remaining / otherCount);
      for (const idx of otherIndices) {
        breakdowns[idx].acquisitionAmount = perPerson;
      }
    }
  } else {
    const perPerson = Math.floor(baseEstate / breakdowns.length);
    for (let i = 0; i < breakdowns.length; i++) {
      breakdowns[i].acquisitionAmount = perPerson;
    }
  }

  // 2. 受取人帰属: 基本取得額 − 保険料負担 + 課税対象保険金
  for (let i = 0; i < breakdowns.length; i++) {
    const ins = heirInsBreakdowns[i];
    if (!ins) continue;
    breakdowns[i].acquisitionAmount = breakdowns[i].acquisitionAmount - ins.premiumPaid + ins.taxableAmount;
  }

  // 3. 按分税額の再計算
  const { totalTax } = taxResult;
  for (const b of breakdowns) {
    b.proportionalTax = adjustedEstate > 0
      ? Math.floor(totalTax * (b.acquisitionAmount / adjustedEstate))
      : 0;
  }

  // 4. 2割加算（rank3）
  for (const b of breakdowns) {
    b.surchargeAmount = 0;
  }
  if (rank === 3) {
    for (const idx of otherIndices) {
      breakdowns[idx].surchargeAmount = Math.floor(breakdowns[idx].proportionalTax * 0.2);
    }
  }

  // 5. 配偶者の税額軽減
  let spouseDeductionDetail: SpouseDeductionDetail | null = null;
  if (spouseIdx >= 0) {
    breakdowns[spouseIdx].spouseDeduction = 0;
    const spouse = breakdowns[spouseIdx];
    const legalShareOfEstate = Math.floor(adjustedEstate * spouseLegalRatio);
    const deductionLimit = Math.max(legalShareOfEstate, SPOUSE_DEDUCTION_LIMIT);
    const taxBeforeDeduction = spouse.proportionalTax + spouse.surchargeAmount;

    let actualDeduction: number;
    if (spouse.acquisitionAmount <= deductionLimit) {
      actualDeduction = taxBeforeDeduction;
    } else {
      actualDeduction = Math.floor(totalTax * (deductionLimit / adjustedEstate));
      actualDeduction = Math.min(actualDeduction, taxBeforeDeduction);
    }

    spouse.spouseDeduction = actualDeduction;
    spouseDeductionDetail = {
      acquisitionAmount: spouse.acquisitionAmount,
      legalShareAmount: legalShareOfEstate,
      limit160m: SPOUSE_DEDUCTION_LIMIT,
      deductionLimit,
      taxBeforeDeduction,
      actualDeduction,
    };
  }

  // 6. 最終税額
  for (const b of breakdowns) {
    b.finalTax = Math.max(0, b.proportionalTax + b.surchargeAmount - b.spouseDeduction);
  }

  const totalFinalTax = breakdowns.reduce((sum, b) => sum + b.finalTax, 0);
  const effectiveTaxRate = adjustedEstate > 0 ? (totalFinalTax / adjustedEstate) * 100 : 0;

  return {
    ...taxResult,
    heirBreakdowns: breakdowns,
    spouseDeductionDetail,
    totalFinalTax,
    effectiveTaxRate,
  };
}

/**
 * 1シナリオ分の計算
 *
 * 受取人帰属モデル: 保険料は受取人の取得額から控除、
 * 課税対象保険金は受取人に帰属させて税の按分を再計算する。
 */
function calculateScenario(
  label: string,
  baseEstate: number,
  contracts: InsuranceContract[],
  premiumDeduction: number,
  nonTaxableLimit: number,
  composition: HeirComposition,
  spouseMode: SpouseAcquisitionMode,
): InsuranceScenarioResult {
  const heirBreakdowns = calculateHeirInsuranceBreakdowns(contracts, nonTaxableLimit, composition);

  const totalBenefit = heirBreakdowns.reduce((s, b) => s + b.totalBenefit, 0);
  const nonTaxableAmount = heirBreakdowns.reduce((s, b) => s + b.nonTaxableAmount, 0);
  const taxableInsurance = totalBenefit - nonTaxableAmount;

  // 調整後遺産額 = 元の遺産 − 新規保険料 + 課税対象保険金（税計算用）
  const adjustedEstate = Math.max(0, baseEstate - premiumDeduction + taxableInsurance);

  // 1. 標準モデルで総税額を算出
  const baseTaxResult = calculateDetailedInheritanceTax(adjustedEstate, composition, spouseMode);

  // 2. 受取人帰属モデルで按分を再計算
  const taxResult = reapportionForBeneficiaryModel(
    baseTaxResult, baseEstate, adjustedEstate, heirBreakdowns, composition, spouseMode,
  );

  // 手取り合計 = (元の遺産 − 保険料) + 保険金全額 − 相続税
  const totalNetProceeds = (baseEstate - premiumDeduction) + totalBenefit - taxResult.totalFinalTax;

  return {
    label,
    totalBenefit,
    nonTaxableLimit,
    nonTaxableAmount,
    taxableInsurance,
    adjustedEstate,
    premiumDeduction,
    totalNetProceeds,
    taxResult,
    heirBreakdowns,
  };
}

/** 相続人の遺産取得額（保険料控除前・課税対象保険金加算前の法定相続分） */
export function getHeirBaseAcquisition(scenario: InsuranceScenarioResult, index: number): number {
  const ins = scenario.heirBreakdowns[index];
  const tax = scenario.taxResult.heirBreakdowns[index];
  if (!ins || !tax) return 0;
  return tax.acquisitionAmount + ins.premiumPaid - ins.taxableAmount;
}

/** 手取り = 遺産取得額 − 保険料負担 + 受取保険金 − 納付税額 */
export function getHeirNetProceeds(scenario: InsuranceScenarioResult, index: number): number {
  const ins = scenario.heirBreakdowns[index];
  const tax = scenario.taxResult.heirBreakdowns[index];
  if (!ins || !tax) return 0;
  return tax.acquisitionAmount + ins.nonTaxableAmount - tax.finalTax;
}

/**
 * 死亡保険金シミュレーション
 *
 * 現状（既存契約のみ）と提案（既存＋新規契約）の2シナリオを比較し、
 * 節税効果を算出する。
 */
export function calculateInsuranceSimulation(
  estateValue: number,
  composition: HeirComposition,
  existingContracts: InsuranceContract[],
  newContracts: InsuranceContract[],
  spouseMode: SpouseAcquisitionMode,
): InsuranceSimulationResult {
  const { totalHeirsCount } = getHeirInfo(composition);
  const nonTaxableLimit = INSURANCE_EXEMPT_PER_HEIR * totalHeirsCount;

  const newPremiumTotal = newContracts.reduce((s, c) => s + c.premium, 0);

  // 現状: 既存契約のみ（保険料控除なし — 既に支払済み）
  const current = calculateScenario(
    '現状', estateValue, existingContracts, 0, nonTaxableLimit, composition, spouseMode,
  );

  // 提案: 既存＋新規契約（新規保険料分を遺産から差し引き）
  const allContracts = [...existingContracts, ...newContracts];
  const proposed = calculateScenario(
    '提案', estateValue, allContracts, newPremiumTotal, nonTaxableLimit, composition, spouseMode,
  );

  const taxSaving = current.taxResult.totalFinalTax - proposed.taxResult.totalFinalTax;
  const netProceedsDiff = proposed.totalNetProceeds - current.totalNetProceeds;

  return { current, proposed, taxSaving, netProceedsDiff, newPremiumTotal, baseEstate: estateValue };
}
