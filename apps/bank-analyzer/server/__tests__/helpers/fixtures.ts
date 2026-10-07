// DB テスト用の架空データ。値はすべて作り物（リポジトリは公開）。

import type { PrismaClient } from '@prisma/client';
import { normalizeText } from '../../lib/text.js';

export type TxSeed = {
  date?: string | null;
  description?: string | null;
  amountOut?: number;
  amountIn?: number;
  balance?: number | null;
  category?: string;
  accountNumber?: string;
  isFlagged?: boolean;
  memo?: string | null;
};

export async function seedCase(db: PrismaClient, name = '架空 太郎', txs: TxSeed[] = []) {
  const c = await db.case.create({ data: { name } });
  const accounts = new Map<string, bigint>();
  const ids: bigint[] = [];
  for (const t of txs) {
    const number = t.accountNumber ?? '1234567';
    let accountId = accounts.get(number);
    if (accountId === undefined) {
      const a = await db.account.create({
        data: { caseId: c.id, accountNumber: number, bankName: '架空銀行', branchName: '本店', accountType: '普通' },
      });
      accountId = a.id;
      accounts.set(number, accountId);
    }
    const row = await db.transaction.create({
      data: {
        caseId: c.id,
        accountId,
        date: t.date === null ? null : new Date(`${t.date ?? '2025-04-01'}T00:00:00Z`),
        description: t.description ?? null,
        descriptionSearch: normalizeText(t.description ?? ''),
        amountOut: t.amountOut ?? 0,
        amountIn: t.amountIn ?? 0,
        balance: t.balance ?? null,
        category: t.category ?? '未分類',
        isFlagged: t.isFlagged ?? false,
        memo: t.memo ?? null,
      },
    });
    ids.push(row.id);
  }
  return { caseId: c.id, ids, accounts };
}

export async function categoriesOf(db: PrismaClient, ids: bigint[]) {
  const rows = await db.transaction.findMany({ where: { id: { in: ids } }, orderBy: { id: 'asc' } });
  return rows.map((r) => r.category);
}
