// 分類の変更履歴の記録と取り消し（Django 版 services/classification_history.py）。
//
// 既存の履歴（analyzer_classificationchange）をそのまま引き継ぐので、書き方は Django と同じにする:
//   - 1回の操作で変わった行は同じ change_group（UUID）でまとめる
//   - 変わらなかった行（同じ分類・空の分類）は記録しない
//   - 取り消せるのは「まだ取り消していない一番新しい操作」だけ（作成日時 → id の新しい順）
//   - 取り消すときは、その後に分類が変わった取引が1件でもあれば何もしない
//
// 案件の行を FOR UPDATE で押さえてから読むのも同じ。同じ案件への分類操作を直列にして、
// 「直前の操作」の順番を確定させるため。

import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { parseId } from '../json.js';

export type Tx = Prisma.TransactionClient;

// 呼び出し元のトランザクションの中で使う形と、単独で使う形の両方を受ける。
export async function inTransaction<T>(db: PrismaClient | Tx, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return '$transaction' in db ? (db as PrismaClient).$transaction(fn) : fn(db);
}

export async function lockCase(tx: Tx, caseId: bigint): Promise<void> {
  await tx.$queryRaw`SELECT id FROM analyzer_case WHERE id = ${caseId} FOR UPDATE`;
}

export type ApplyResult = { count: number; changeGroup: string | null };

// {取引ID: 新しい分類} を当てて履歴を残す。ID が1つでも整数でなければ何もしない（Django と同じ）。
export async function applyChanges(
  db: PrismaClient | Tx,
  caseId: bigint,
  updates: Record<string, string | null | undefined> | Map<string | number, string>,
  source = 'manual',
): Promise<ApplyResult> {
  const entries = (updates instanceof Map ? [...updates] : Object.entries(updates))
    .map(([k, v]) => [String(k), v] as const)
    .filter((e): e is readonly [string, string] => typeof e[1] === 'string' && e[1] !== '');
  if (entries.length === 0) return { count: 0, changeGroup: null };
  const ids = entries.map(([k]) => parseId(k.trim()));
  if (ids.some((id) => id === null)) return { count: 0, changeGroup: null };
  const wanted = new Map(entries.map(([k, v]) => [String(parseId(k.trim())), v]));

  return inTransaction(db, async (tx) => {
    await lockCase(tx, caseId);
    const rows = await tx.$queryRaw<{ id: bigint; description: string | null; category: string }[]>`
      SELECT id, description, category FROM analyzer_transaction
      WHERE case_id = ${caseId} AND id = ANY(${ids as bigint[]}::bigint[])
      ORDER BY id
      FOR UPDATE`;
    const changed = rows.filter((r) => {
      const next = wanted.get(String(r.id));
      return next !== undefined && next !== r.category;
    });
    if (changed.length === 0) return { count: 0, changeGroup: null };

    const changeGroup = randomUUID();
    // 作成日時は DB の既定値（＝トランザクション開始時刻）に任せない。ロック待ちの間に
    // 後から始まった操作が先に記録されると、「直前の操作」の順番が実際と逆になる。
    const createdAt = new Date();
    await tx.classificationChange.createMany({
      data: changed.map((r) => ({
        caseId,
        transactionId: r.id,
        transactionIdentifier: r.id,
        transactionDescription: r.description ?? '',
        oldCategory: r.category,
        newCategory: wanted.get(String(r.id))!,
        changeGroup,
        source,
        createdAt,
      })),
    });
    // 新しい分類ごとにまとめて更新する（行ごとに UPDATE を投げない）
    const byCategory = new Map<string, bigint[]>();
    for (const r of changed) {
      const next = wanted.get(String(r.id))!;
      byCategory.set(next, [...(byCategory.get(next) ?? []), r.id]);
    }
    for (const [category, idList] of byCategory) {
      await tx.transaction.updateMany({ where: { id: { in: idList } }, data: { category } });
    }
    return { count: changed.length, changeGroup };
  });
}

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

// Python の uuid.UUID() が受ける形（ハイフン有無・波括弧・urn:uuid:）を正規の書き方へ。
export function parseUuid(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let s = value.trim();
  s = s.replace(/^urn:uuid:/i, '').replace(/^\{(.*)\}$/, '$1');
  if (!UUID_RE.test(s)) return null;
  const hex = s.replaceAll('-', '').toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type UndoResult =
  | { success: true; count: number; restoredCategories: string[]; revertedAt: Date }
  | { success: false; error: string; status: 400 | 404 | 409 };

export async function undoLatest(db: PrismaClient, caseId: bigint, changeGroup: unknown): Promise<UndoResult> {
  const group = parseUuid(changeGroup);
  if (!group) return { success: false, error: '変更履歴IDが正しくありません。', status: 400 };

  return db.$transaction(async (tx) => {
    await lockCase(tx, caseId);
    const latest = await tx.$queryRaw<{ change_group: string }[]>`
      SELECT change_group::text FROM analyzer_classificationchange
      WHERE case_id = ${caseId} AND reverted_at IS NULL
      ORDER BY created_at DESC, id DESC LIMIT 1
      FOR UPDATE`;
    if (latest[0]?.change_group !== group) {
      return {
        success: false as const,
        error: '直前の分類変更ではないため取り消せません。画面を再読み込みしてください。',
        status: 409 as const,
      };
    }

    const changes = await tx.$queryRaw<{ transaction_identifier: bigint; old_category: string; new_category: string }[]>`
      SELECT transaction_identifier, old_category, new_category FROM analyzer_classificationchange
      WHERE case_id = ${caseId} AND change_group = ${group}::uuid AND reverted_at IS NULL
      ORDER BY id
      FOR UPDATE`;
    if (changes.length === 0) return { success: false as const, error: '取り消せる分類変更がありません。', status: 404 as const };

    const ids = [...new Set(changes.map((c) => c.transaction_identifier))];
    const txs = await tx.$queryRaw<{ id: bigint; category: string }[]>`
      SELECT id, category FROM analyzer_transaction
      WHERE case_id = ${caseId} AND id = ANY(${ids}::bigint[])
      FOR UPDATE`;
    const current = new Map(txs.map((t) => [t.id, t.category]));
    if (current.size !== ids.length) {
      return { success: false as const, error: '対象取引が削除されているため取り消せません。', status: 409 as const };
    }
    for (const c of changes) {
      if (current.get(c.transaction_identifier) !== c.new_category) {
        return {
          success: false as const,
          error: `取引ID ${c.transaction_identifier} はその後分類が変更されているため、安全に取り消せません。`,
          status: 409 as const,
        };
      }
    }

    // 同じ取引が同じ組に2回出ることは apply_changes の作りでは無いが、出たら Django と同じく後勝ち
    const restore = new Map<bigint, string>();
    for (const c of changes) restore.set(c.transaction_identifier, c.old_category);
    const byCategory = new Map<string, bigint[]>();
    for (const [id, category] of restore) byCategory.set(category, [...(byCategory.get(category) ?? []), id]);
    for (const [category, idList] of byCategory) {
      await tx.transaction.updateMany({ where: { id: { in: idList } }, data: { category } });
    }
    const revertedAt = new Date();
    await tx.classificationChange.updateMany({
      where: { caseId, changeGroup: group, revertedAt: null },
      data: { revertedAt },
    });
    return {
      success: true as const,
      count: changes.length,
      restoredCategories: [...new Set(changes.map((c) => c.old_category))].sort(),
      revertedAt,
    };
  });
}

export type LatestSummary = {
  changeGroup: string;
  count: number;
  oldCategory: string;
  newCategory: string;
  createdAt: string;
  description: string;
  source: string;
};

const MULTIPLE = '複数分類';

export async function latestSummary(db: PrismaClient | Tx, caseId: bigint): Promise<LatestSummary | null> {
  const latest = await db.classificationChange.findFirst({
    where: { caseId, revertedAt: null },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { changeGroup: true },
  });
  if (!latest) return null;
  const changes = await db.classificationChange.findMany({
    where: { caseId, changeGroup: latest.changeGroup, revertedAt: null },
    orderBy: { id: 'asc' },
  });
  const first = changes[0];
  if (!first) return null;
  const one = (values: string[]) => {
    const set = [...new Set(values)].sort();
    return set.length === 1 ? set[0]! : MULTIPLE;
  };
  return {
    changeGroup: latest.changeGroup,
    count: changes.length,
    oldCategory: one(changes.map((c) => c.oldCategory)),
    newCategory: one(changes.map((c) => c.newCategory)),
    createdAt: first.createdAt.toISOString(),
    description: first.transactionDescription,
    source: first.source,
  };
}
