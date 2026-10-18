import type {
  HeirComposition,
  RealEstateInvestmentInput,
  RealEstateSimulationResult,
  SpouseAcquisitionMode,
} from '../types';
import { calculateDetailedInheritanceTax } from './taxCalculator';

const clampRate = (value: number) => Math.min(100, Math.max(0, value)) / 100;
const floorAmount = (value: number) => Math.floor(value + 1e-7);

export function calculateCompressedPropertyValue(input: RealEstateInvestmentInput): number {
  const investmentAmount = Math.max(0, input.investmentAmount);
  const baseAssessedValue = floorAmount(investmentAmount * (1 - clampRate(input.compressionRate)));
  const rentalAdjustment = 1 - clampRate(input.leaseholdRightRate) * clampRate(input.tenantRightRate);
  return floorAmount(baseAssessedValue * rentalAdjustment);
}

/**
 * 現金を不動産へ組み替え、圧縮率と借地権・借家権割合を適用した場合の相続税を比較する。
 */
export function calculateRealEstateSimulation(
  estateValue: number,
  composition: HeirComposition,
  input: RealEstateInvestmentInput,
  spouseMode: SpouseAcquisitionMode,
): RealEstateSimulationResult {
  const normalizedEstate = Math.max(0, estateValue);
  const investmentAmount = Math.max(0, input.investmentAmount);
  const remainingCash = Math.max(0, normalizedEstate - investmentAmount);
  const baseAssessedValue = floorAmount(investmentAmount * (1 - clampRate(input.compressionRate)));
  const propertyAssessedValue = calculateCompressedPropertyValue(input);
  const proposedEstateValue = Math.max(0, remainingCash + propertyAssessedValue);

  const currentTax = calculateDetailedInheritanceTax(normalizedEstate, composition, spouseMode);
  const proposedTax = calculateDetailedInheritanceTax(proposedEstateValue, composition, spouseMode);
  const currentNetProceeds = normalizedEstate - currentTax.totalFinalTax;
  const proposedNetProceeds = normalizedEstate - proposedTax.totalFinalTax;

  return {
    input: { ...input },
    current: {
      label: '現状',
      estateValue: normalizedEstate,
      taxResult: currentTax,
      totalNetProceeds: currentNetProceeds,
    },
    proposed: {
      label: '不動産購入後',
      estateValue: proposedEstateValue,
      taxResult: proposedTax,
      totalNetProceeds: proposedNetProceeds,
    },
    investmentAmount,
    remainingCash,
    baseAssessedValue,
    propertyAssessedValue,
    valuationReduction: investmentAmount - propertyAssessedValue,
    taxSaving: currentTax.totalFinalTax - proposedTax.totalFinalTax,
    netProceedsDiff: proposedNetProceeds - currentNetProceeds,
  };
}
