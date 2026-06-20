import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACCEPTED_STATUSES = new Set(['受託', '手続中', '最終確認', '申告済', '請求済', '入金済']);
const COMPLETED_STATUSES = new Set(['申告済', '請求済', '入金済']);
const BILLED_STATUSES = new Set(['請求済', '入金済']);

function calculatedReferralFee(baseAmount: number | null, rate: number | null): number {
  return Math.floor((baseAmount ?? 0) * ((rate ?? 0) / 100));
}

async function main() {
  const [cases, constraints] = await Promise.all([
    prisma.inheritanceCase.findMany({
      include: { _count: { select: { heirs: true } } },
    }),
    prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = '"InheritanceCase"'::regclass
        AND conname IN (
          'InheritanceCase_caseAddedDate_status_check',
          'InheritanceCase_caseCompletedDate_status_check',
          'InheritanceCase_billedDate_status_check',
          'InheritanceCase_paidDate_status_check',
          'InheritanceCase_referralFee_auto_amount_check',
          'InheritanceCase_estimateReferralFee_auto_amount_check'
        )
    `,
  ]);

  const autoFeeMismatch = cases.filter(c =>
    !c.isReferralFeeManual
    && c.referralFeeAmount !== calculatedReferralFee(c.feeAmount, c.referralFeeRate)
  );
  const autoEstimateMismatch = cases.filter(c =>
    !c.isEstimateReferralFeeManual
    && c.estimateReferralFeeAmount !== calculatedReferralFee(c.estimateAmount, c.referralFeeRate)
  );
  const milestoneMismatch = cases.filter(c =>
    ACCEPTED_STATUSES.has(c.status) !== Boolean(c.caseAddedDate)
    || COMPLETED_STATUSES.has(c.status) !== Boolean(c.caseCompletedDate)
    || BILLED_STATUSES.has(c.status) !== Boolean(c.billedDate)
    || (c.status === '入金済') !== Boolean(c.paidDate)
  );

  const result = {
    cases: cases.length,
    manualConfirmedReferralFees: cases.filter(c => c.isReferralFeeManual).length,
    manualEstimateReferralFees: cases.filter(c => c.isEstimateReferralFeeManual).length,
    autoFeeMismatch: autoFeeMismatch.length,
    autoEstimateMismatch: autoEstimateMismatch.length,
    milestoneMismatch: milestoneMismatch.length,
    normalizationConstraints: constraints.length,
    feeCountDifferentFromLinkedHeirs: cases.filter(
      c => (c.feeCalculationHeirCount ?? 0) !== c._count.heirs
    ).length,
  };

  console.log(JSON.stringify(result, null, 2));

  if (autoFeeMismatch.length || autoEstimateMismatch.length || milestoneMismatch.length || constraints.length !== 6) {
    throw new Error('正規化整合性チェックに失敗しました');
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
