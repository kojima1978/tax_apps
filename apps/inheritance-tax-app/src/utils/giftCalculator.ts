import type {
  HeirComposition,
  SpouseAcquisitionMode,
  GiftRecipient,
  GiftRecipientResult,
  GiftScenarioResult,
  CashGiftSimulationResult,
} from '../types';
import { SPECIAL_GIFT_TAX_BRACKETS, GIFT_TAX_BASIC_EXEMPTION } from '../constants';
import { calculateDetailedInheritanceTax } from './taxCalculator';
import { getBeneficiaryOptions } from './heirUtils';
import { reapportionTax } from './reapportionTax';

/**
 * 特例贈与税を計算（1年分・1人分）
 * @param annualAmount 年間贈与額（万円）
 * @returns 贈与税額（万円）
 */
export function calculateGiftTaxPerYear(annualAmount: number): number {
  const taxableAmount = Math.max(0, annualAmount - GIFT_TAX_BASIC_EXEMPTION);
  if (taxableAmount <= 0) return 0;
  const bracket = SPECIAL_GIFT_TAX_BRACKETS.find(b => taxableAmount <= b.threshold)
    || SPECIAL_GIFT_TAX_BRACKETS[SPECIAL_GIFT_TAX_BRACKETS.length - 1];
  return Math.floor(Math.max(0, taxableAmount * (bracket.rate / 100) - bracket.deduction));
}

/**
 * 受取人1人分の贈与結果を計算
 */
export function calculateRecipientResult(recipient: GiftRecipient): GiftRecipientResult {
  const taxableAmountPerYear = Math.max(0, recipient.annualAmount - GIFT_TAX_BASIC_EXEMPTION);
  const giftTaxPerYear = calculateGiftTaxPerYear(recipient.annualAmount);
  const totalGift = recipient.annualAmount * recipient.years;
  const totalGiftTax = giftTaxPerYear * recipient.years;
  return {
    id: recipient.id,
    heirId: recipient.heirId,
    heirLabel: recipient.heirLabel,
    annualAmount: recipient.annualAmount,
    years: recipient.years,
    taxableAmountPerYear,
    giftTaxPerYear,
    totalGift,
    totalGiftTax,
    netGift: totalGift - totalGiftTax,
  };
}

/**
 * 贈与対象の相続人（子・孫のみ）の選択肢を取得
 * 特例贈与は直系尊属→18歳以上の子・孫のみ対象
 */
export function getGiftRecipientOptions(
  composition: HeirComposition,
): { id: string; label: string }[] {
  if (composition.selectedRank !== 'rank1') return [];
  return getBeneficiaryOptions(composition).filter(opt => opt.id !== 'spouse');
}

/**
 * 相続人別の税引後取得額を算出（贈与シミュレーション用）
 */
export function getGiftHeirNetProceeds(
  scenario: GiftScenarioResult,
  heirIndex: number,
  recipientResults: GiftRecipientResult[],
): number {
  const taxBreakdown = scenario.taxResult.heirBreakdowns[heirIndex];
  if (!taxBreakdown) return 0;
  let net = taxBreakdown.acquisitionAmount - taxBreakdown.finalTax;
  for (const g of recipientResults.filter(r => r.heirLabel === taxBreakdown.label)) {
    net += g.totalGift - g.totalGiftTax;
  }
  return net;
}

/** 受贈者帰属モデルで税の按分を再計算（共通reapportionTaxのラッパー） */
function reapportionForGiftModel(
  taxResult: Parameters<typeof reapportionTax>[0],
  baseEstate: number,
  recipientResults: GiftRecipientResult[],
  composition: HeirComposition,
  spouseMode: SpouseAcquisitionMode,
) {
  return reapportionTax(
    taxResult, baseEstate, composition, spouseMode,
    // 受贈者帰属: 基本取得額 − 贈与額（0下限）
    (breakdowns) => {
      for (let i = 0; i < breakdowns.length; i++) {
        const label = breakdowns[i].label;
        const totalGiftsToHeir = recipientResults
          .filter(r => r.heirLabel === label)
          .reduce((s, r) => s + r.totalGift, 0);
        if (totalGiftsToHeir > 0) {
          breakdowns[i].acquisitionAmount = Math.max(0, breakdowns[i].acquisitionAmount - totalGiftsToHeir);
        }
      }
    },
    // 分母: 取得額合計（贈与控除後）
    (breakdowns) => breakdowns.reduce((s, b) => s + b.acquisitionAmount, 0),
  );
}

/**
 * 現金贈与シミュレーション
 *
 * 現状（贈与なし）と提案（贈与あり）の2シナリオを比較し、
 * 相続税・贈与税の合計と財産額の増減を算出する。
 */
export function calculateCashGiftSimulation(
  estateValue: number,
  composition: HeirComposition,
  recipients: GiftRecipient[],
  spouseMode: SpouseAcquisitionMode,
): CashGiftSimulationResult {
  const recipientResults = recipients.map(calculateRecipientResult);
  const totalGifts = recipientResults.reduce((s, r) => s + r.totalGift, 0);
  const totalGiftTax = recipientResults.reduce((s, r) => s + r.totalGiftTax, 0);

  // 現状: 贈与なし
  const currentTax = calculateDetailedInheritanceTax(estateValue, composition, spouseMode);
  const current: GiftScenarioResult = {
    label: '現状',
    estateValue,
    taxResult: currentTax,
    totalNetProceeds: estateValue - currentTax.totalFinalTax,
  };

  // 提案: 贈与あり → 遺産が減少
  const reducedEstate = Math.max(0, estateValue - totalGifts);
  const baseTaxResult = calculateDetailedInheritanceTax(reducedEstate, composition, spouseMode);
  // 受贈者帰属モデル: 贈与額を受贈者の取得額から直接控除して按分を再計算
  const proposedTax = reapportionForGiftModel(
    baseTaxResult, estateValue, recipientResults, composition, spouseMode,
  );
  const proposed: GiftScenarioResult = {
    label: '提案',
    estateValue: reducedEstate,
    taxResult: proposedTax,
    totalNetProceeds: estateValue - proposedTax.totalFinalTax - totalGiftTax,
  };

  const inheritanceTaxSaving = currentTax.totalFinalTax - proposedTax.totalFinalTax;
  const netProceedsDiff = proposed.totalNetProceeds - current.totalNetProceeds;

  return {
    current,
    proposed,
    recipientResults,
    totalGifts,
    totalGiftTax,
    inheritanceTaxSaving,
    netProceedsDiff,
    baseEstate: estateValue,
  };
}

/**
 * 受取人ごとに最適な年間贈与額を算出する（座標降下法）
 *
 * 同じ贈与年数の受取人は同一の年間贈与額を割り当てる（年数でグループ化）。
 * 2フェーズ探索（粗い100万円刻み → 精密10万円刻み）× 座標降下法で収束させる。
 */
export function optimizeGiftAmounts(
  estateValue: number,
  composition: HeirComposition,
  recipients: GiftRecipient[],
  spouseMode: SpouseAcquisitionMode,
): GiftRecipient[] {
  if (recipients.length === 0 || estateValue <= 0) return recipients;

  const optimized = recipients.map(r => ({ ...r }));
  const COARSE = 100;
  const FINE = 10;
  const PER_PERSON_CAP = 5000;

  // 年数でグループ化（同じ年数の受取人は同じ贈与額にする）
  const yearGroups = new Map<number, number[]>();
  for (let i = 0; i < optimized.length; i++) {
    const { years } = optimized[i];
    if (years <= 0) continue;
    const group = yearGroups.get(years);
    if (group) group.push(i);
    else yearGroups.set(years, [i]);
  }

  for (let iter = 0; iter < 3; iter++) {
    let changed = false;

    for (const [years, indices] of yearGroups) {
      const indexSet = new Set(indices);
      const groupSize = indices.length;

      const otherTotal = optimized
        .filter((_, j) => !indexSet.has(j))
        .reduce((s, r) => s + r.annualAmount * r.years, 0);

      const maxAmount = Math.min(
        Math.floor(Math.max(0, estateValue - otherTotal) / (groupSize * years)),
        PER_PERSON_CAP,
      );

      // Phase 1: 粗い探索（100万円刻み）
      let coarseBest = 0;
      let coarseBestNet = -Infinity;
      for (let a = 0; a <= maxAmount; a += COARSE) {
        const test = optimized.map((r, j) => indexSet.has(j) ? { ...r, annualAmount: a } : r);
        const net = calculateCashGiftSimulation(estateValue, composition, test, spouseMode).proposed.totalNetProceeds;
        if (net > coarseBestNet) { coarseBestNet = net; coarseBest = a; }
      }

      // Phase 2: 精密探索（10万円刻み、粗いピーク ±100万）
      const fineStart = Math.max(0, coarseBest - COARSE);
      const fineEnd = Math.min(maxAmount, coarseBest + COARSE);
      let bestAmount = coarseBest;
      let bestNet = coarseBestNet;
      for (let a = fineStart; a <= fineEnd; a += FINE) {
        const test = optimized.map((r, j) => indexSet.has(j) ? { ...r, annualAmount: a } : r);
        const net = calculateCashGiftSimulation(estateValue, composition, test, spouseMode).proposed.totalNetProceeds;
        if (net > bestNet) { bestNet = net; bestAmount = a; }
      }

      for (const idx of indices) {
        if (bestAmount !== optimized[idx].annualAmount) {
          optimized[idx].annualAmount = bestAmount;
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  return optimized;
}
