import { prisma } from '@/lib/prisma';

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

export interface MergeResult {
  sourceCompany: string;
  targetCompany: string;
  branchesMoved: number;
  branchesMerged: number;
  referrersMoved: number;
  casesReassigned: number;
}

export async function mergeCompanies(sourceId: number, targetId: number): Promise<MergeResult> {
  if (sourceId === targetId) {
    throw new Error('同じ会社同士はマージできません');
  }

  return prisma.$transaction(async (tx: TxClient) => {
    const source = await tx.company.findUnique({ where: { id: sourceId } });
    const target = await tx.company.findUnique({ where: { id: targetId } });
    if (!source) throw new Error('マージ元の会社が見つかりません');
    if (!target) throw new Error('マージ先の会社が見つかりません');

    const sourceBranches = await tx.companyBranch.findMany({ where: { companyId: sourceId } });
    const targetBranches = await tx.companyBranch.findMany({ where: { companyId: targetId } });

    const branchIdMap = new Map<number, number>();
    let branchesMerged = 0;

    for (const sb of sourceBranches) {
      const existing = targetBranches.find(tb => tb.name === sb.name && tb.active);
      if (existing) {
        branchIdMap.set(sb.id, existing.id);
        branchesMerged++;
      } else {
        await tx.companyBranch.update({
          where: { id: sb.id },
          data: { companyId: targetId },
        });
      }
    }

    const sourceReferrers = await tx.referrer.findMany({ where: { companyId: sourceId } });
    const targetReferrers = await tx.referrer.findMany({ where: { companyId: targetId } });

    let casesReassigned = 0;
    let referrersMoved = 0;

    for (const sr of sourceReferrers) {
      const newBranchId = sr.branchId !== null ? (branchIdMap.get(sr.branchId) ?? sr.branchId) : null;

      const existingTarget = targetReferrers.find(tr =>
        (newBranchId === null && tr.branchId === null) ||
        (newBranchId !== null && tr.branchId === newBranchId)
      );

      if (existingTarget) {
        const result = await tx.inheritanceCase.updateMany({
          where: { referrerId: sr.id },
          data: { referrerId: existingTarget.id },
        });
        casesReassigned += result.count;
        await tx.referrer.delete({ where: { id: sr.id } });
      } else {
        await tx.referrer.update({
          where: { id: sr.id },
          data: { companyId: targetId, branchId: newBranchId },
        });
      }
      referrersMoved++;
    }

    for (const [sourceBranchId] of branchIdMap) {
      await tx.companyBranch.delete({ where: { id: sourceBranchId } });
    }

    await tx.company.update({
      where: { id: sourceId },
      data: { active: false },
    });

    return {
      sourceCompany: source.name,
      targetCompany: target.name,
      branchesMoved: sourceBranches.length - branchesMerged,
      branchesMerged,
      referrersMoved,
      casesReassigned,
    };
  });
}
