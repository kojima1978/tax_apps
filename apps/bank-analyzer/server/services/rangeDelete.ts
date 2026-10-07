// ID 範囲の削除と、その控えからの復元（Django 版 TransactionService.delete_by_range ほか）。
//
// 控え（analyzer_deletionbackup.transaction_data）は Django が書いた既存の行も読むので、
// 形は Django の `values(...)` そのまま: キーは snake_case、日付は 'YYYY-MM-DD'、id は数値。
// 削除と控えの作成は同じトランザクション（控えだけ残る／控えなしで消える、を作らない）。

import type { PrismaClient } from '@prisma/client';
import { normalizeText } from '../lib/text.js';
import { toDateString, toId } from '../json.js';

// Django の values() の並び。jsonb はキーを並べ替えるので順番に意味は無いが、読みやすさのため同じにする
export type BackupRow = {
  id: number;
  account_id: number | null;
  date: string | null;
  description: string | null;
  amount_out: number;
  amount_in: number;
  balance: number | null;
  is_large: boolean;
  is_transfer: boolean;
  transfer_to: string | null;
  category: string;
  classification_score: number;
  is_flagged: boolean;
  memo: string | null;
};

const ordered = (a: number, b: number): [number, number] => (a > b ? [b, a] : [a, b]);

const rangeWhere = (caseId: bigint, start: number, end: number) => ({
  caseId,
  id: { gte: BigInt(start), lte: BigInt(end) },
});

export type RangePreview = {
  startId: number;
  endId: number;
  count: number;
  sample: { id: number; date: string; description: string; amountOut: number; amountIn: number }[];
};

export async function previewDeleteByRange(
  db: PrismaClient,
  caseId: bigint,
  startId: number,
  endId: number,
  sampleSize = 5,
): Promise<RangePreview> {
  const [start, end] = ordered(startId, endId);
  const where = rangeWhere(caseId, start, end);
  const [count, sample] = await Promise.all([
    db.transaction.count({ where }),
    db.transaction.findMany({ where, orderBy: { id: 'asc' }, take: sampleSize }),
  ]);
  return {
    startId: start,
    endId: end,
    count,
    sample: sample.map((t) => ({
      id: toId(t.id),
      date: toDateString(t.date) ?? '',
      description: t.description ?? '',
      amountOut: t.amountOut,
      amountIn: t.amountIn,
    })),
  };
}

export async function deleteByRange(db: PrismaClient, caseId: bigint, startId: number, endId: number): Promise<number> {
  const [start, end] = ordered(startId, endId);
  const where = rangeWhere(caseId, start, end);
  return db.$transaction(async (tx) => {
    const rows = await tx.transaction.findMany({ where, orderBy: { id: 'asc' } });
    if (rows.length === 0) return 0;
    const data: BackupRow[] = rows.map((t) => ({
      id: toId(t.id),
      account_id: t.accountId === null ? null : toId(t.accountId),
      date: toDateString(t.date),
      description: t.description,
      amount_out: t.amountOut,
      amount_in: t.amountIn,
      balance: t.balance,
      is_large: t.isLarge,
      is_transfer: t.isTransfer,
      transfer_to: t.transferTo,
      category: t.category,
      classification_score: t.classificationScore,
      is_flagged: t.isFlagged,
      memo: t.memo,
    }));
    await tx.deletionBackup.create({
      data: { caseId, startId: BigInt(start), endId: BigInt(end), transactionData: data, createdAt: new Date() },
    });
    const { count } = await tx.transaction.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
    return count;
  });
}

// まだ復元していない控えのうち一番新しいもの（Django の Meta.ordering = -created_at の first()）
export async function latestDeletionBackup(db: PrismaClient, caseId: bigint) {
  const b = await db.deletionBackup.findFirst({
    where: { caseId, restoredAt: null },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  if (!b) return null;
  return {
    id: toId(b.id),
    startId: toId(b.startId),
    endId: toId(b.endId),
    transactionCount: Array.isArray(b.transactionData) ? b.transactionData.length : 0,
    createdAt: b.createdAt.toISOString(),
  };
}

// 控えを戻す。同じ id の取引がすでにある行（どの案件であれ）は飛ばす。戻り値は [復元数, 飛ばした数]。
export async function restoreDeletionBackup(
  db: PrismaClient,
  caseId: bigint,
  backupId: bigint,
): Promise<[number, number]> {
  return db.$transaction(async (tx) => {
    // 同時に2回押されても二重に戻さないよう、控えの行を押さえてから読む
    const locked = await tx.$queryRaw<{ id: bigint }[]>`
      SELECT id FROM analyzer_deletionbackup
      WHERE id = ${backupId} AND case_id = ${caseId} AND restored_at IS NULL
      FOR UPDATE`;
    if (locked.length === 0) return [0, 0];
    const backup = await tx.deletionBackup.findUniqueOrThrow({ where: { id: backupId } });
    const rows = (Array.isArray(backup.transactionData) ? backup.transactionData : []) as unknown as BackupRow[];
    const ids = rows.map((r) => BigInt(r.id));
    const existing = new Set(
      (await tx.transaction.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((t) => toId(t.id)),
    );
    const restore = rows.filter((r) => !existing.has(r.id));
    if (restore.length > 0) {
      await tx.transaction.createMany({
        data: restore.map((r) => ({
          id: BigInt(r.id),
          caseId,
          accountId: r.account_id === null || r.account_id === undefined ? null : BigInt(r.account_id),
          date: r.date ? new Date(`${r.date}T00:00:00Z`) : null,
          description: r.description,
          descriptionSearch: normalizeText(r.description ?? ''),
          amountOut: r.amount_out,
          amountIn: r.amount_in,
          balance: r.balance,
          isLarge: r.is_large,
          isTransfer: r.is_transfer,
          transferTo: r.transfer_to,
          category: r.category,
          classificationScore: r.classification_score,
          isFlagged: r.is_flagged,
          memo: r.memo,
        })),
      });
    }
    await tx.deletionBackup.update({ where: { id: backupId }, data: { restoredAt: new Date() } });
    return [restore.length, rows.length - restore.length];
  });
}
