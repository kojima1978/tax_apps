import type {
  HeirComposition,
  SpouseAcquisitionMode,
  InsuranceContract,
  InsuranceHeirBreakdown,
  InsuranceScenarioResult,
  InsuranceSimulationResult,
} from '../types';
import { INSURANCE_EXEMPT_PER_HEIR } from '../constants';
import { getHeirInfo, getBeneficiaryOptions } from './heirUtils';
import { calculateDetailedInheritanceTax } from './taxCalculator';
import { reapportionTax } from './reapportionTax';

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

/** 受取人帰属モデルで税の按分を再計算（共通reapportionTaxのラッパー） */
function reapportionForBeneficiaryModel(
  taxResult: Parameters<typeof reapportionTax>[0],
  baseEstate: number,
  adjustedEstate: number,
  heirInsBreakdowns: InsuranceHeirBreakdown[],
  composition: HeirComposition,
  spouseMode: SpouseAcquisitionMode,
) {
  return reapportionTax(
    taxResult, baseEstate, composition, spouseMode,
    // 受取人帰属: 基本取得額 − 保険料負担 + 課税対象保険金
    (breakdowns) => {
      for (let i = 0; i < breakdowns.length; i++) {
        const ins = heirInsBreakdowns[i];
        if (!ins) continue;
        breakdowns[i].acquisitionAmount = breakdowns[i].acquisitionAmount - ins.premiumPaid + ins.taxableAmount;
      }
    },
    // 分母: adjustedEstate（課税遺産額）
    () => adjustedEstate,
  );
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

  // 税引後財産額 = (元の遺産 − 保険料) + 保険金全額 − 相続税
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

/** 税引後取得額 = 遺産取得額 − 保険料負担 + 受取保険金 − 納付税額 */
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
