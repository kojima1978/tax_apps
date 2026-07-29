import type { BeneficiaryAllocation, Policy } from '@/types';

type BeneficiaryPolicy = Pick<Policy, 'beneficiaryId' | 'beneficiaryAllocations'>;

export function normalizeBeneficiaryAllocations(
  allocations: BeneficiaryAllocation[] | undefined,
  legacyBeneficiaryId = '',
): BeneficiaryAllocation[] {
  const byBeneficiary = new Map<string, number>();
  if (Array.isArray(allocations)) {
    allocations.forEach((allocation) => {
      const beneficiaryId = String(allocation?.beneficiaryId || '').trim();
      const percentage = Number(allocation?.percentage);
      if (!beneficiaryId || !Number.isFinite(percentage) || percentage <= 0) return;
      byBeneficiary.set(beneficiaryId, (byBeneficiary.get(beneficiaryId) || 0) + percentage);
    });
  }

  const normalized = [...byBeneficiary].map(([beneficiaryId, percentage]) => ({
    beneficiaryId,
    percentage,
  }));
  if (normalized.length > 0) return normalized;
  return legacyBeneficiaryId ? [{ beneficiaryId: legacyBeneficiaryId, percentage: 100 }] : [];
}

export function getBeneficiaryAllocations(policy: BeneficiaryPolicy): BeneficiaryAllocation[] {
  return normalizeBeneficiaryAllocations(policy.beneficiaryAllocations, policy.beneficiaryId);
}

export function getBeneficiaryAllocationTotal(policy: BeneficiaryPolicy): number {
  return getBeneficiaryAllocations(policy).reduce((sum, allocation) => sum + allocation.percentage, 0);
}

export function allocatePercentage(amount: number, percentage: number): number {
  return amount * percentage / 100;
}
