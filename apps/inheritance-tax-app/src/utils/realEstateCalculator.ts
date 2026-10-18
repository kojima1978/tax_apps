import type {
  HeirComposition,
  RealEstateInvestmentInput,
  RealEstateSimulationResult,
  SpouseAcquisitionMode,
} from '../types';
import { calculateDetailedInheritanceTax } from './taxCalculator';

const clampRate = (value: number) => Math.min(100, Math.max(0, value)) / 100;
const floorAmount = (value: number) => Math.floor(value + 1e-7);

export function calculateRentalPropertyValue(input: RealEstateInvestmentInput) {
  const leaseholdRate = clampRate(input.leaseholdRightRate);
  const tenantRate = clampRate(input.tenantRightRate);
  const rentalRate = clampRate(input.rentalRate);

  const landAssessedValue = floorAmount(
    Math.max(0, input.landSelfUseValue) * (1 - leaseholdRate * tenantRate * rentalRate),
  );
  const buildingAssessedValue = floorAmount(
    Math.max(0, input.buildingFixedAssetTaxValue) * (1 - tenantRate * rentalRate),
  );

  return {
    landAssessedValue,
    buildingAssessedValue,
    propertyAssessedValue: landAssessedValue + buildingAssessedValue,
  };
}

/**
 * 現金を賃貸不動産へ組み替えた場合の相続税評価額と税額を比較する。
 * 借入金は資産と債務が同額増えるため、この基本モデルでは購入価格への資金調達方法を区別しない。
 */
export function calculateRealEstateSimulation(
  estateValue: number,
  composition: HeirComposition,
  input: RealEstateInvestmentInput,
  spouseMode: SpouseAcquisitionMode,
): RealEstateSimulationResult {
  const normalizedEstate = Math.max(0, estateValue);
  const purchasePrice = Math.max(0, input.landPurchasePrice) + Math.max(0, input.buildingPurchasePrice);
  const remainingCash = Math.max(0, normalizedEstate - purchasePrice);
  const { landAssessedValue, buildingAssessedValue, propertyAssessedValue } = calculateRentalPropertyValue(input);
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
    purchasePrice,
    remainingCash,
    landAssessedValue,
    buildingAssessedValue,
    propertyAssessedValue,
    valuationReduction: purchasePrice - propertyAssessedValue,
    taxSaving: currentTax.totalFinalTax - proposedTax.totalFinalTax,
    netProceedsDiff: proposedNetProceeds - currentNetProceeds,
  };
}
