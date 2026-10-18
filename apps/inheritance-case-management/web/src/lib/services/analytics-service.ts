import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { serializeCase } from '@/lib/prisma-includes';

// Analytics needs financial values and attribution, not heirs, addresses,
// progress, expense rows, document snapshots, or case memos.
export const ANALYTICS_CASE_SELECT = {
  id: true,
  deceasedName: true,
  dateOfDeath: true,
  status: true,
  fiscalYear: true,
  taxAmount: true,
  propertyValue: true,
  feeAmount: true,
  estimateAmount: true,
  referralFeeRate: true,
  referralFeeAmount: true,
  estimateReferralFeeAmount: true,
  internalReferrerId: true,
  paidDate: true,
  assignee: { include: { department: true } },
  internalReferrer: { include: { department: true } },
  referrer: { include: { company: true, branch: true } },
} satisfies Prisma.InheritanceCaseSelect;

export async function getAnalyticsCases() {
  const cases = await prisma.inheritanceCase.findMany({
    select: ANALYTICS_CASE_SELECT,
    orderBy: [{ fiscalYear: 'desc' }, { dateOfDeath: 'asc' }],
  });
  return cases.map(serializeCase);
}
