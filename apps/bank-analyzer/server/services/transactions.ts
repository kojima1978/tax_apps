// 取引1件の読み書きと、取引・口座をまとめて扱う操作（Django 版 TransactionService の CRUD・削除・一括置換）。
//
// 摘要を書くときは必ず description_search も作り直す（Django は save() で毎回やっている。
// update() で書く経路は自分で入れていた）。分類が変わる書き込みは必ず applyChanges を通して
// 履歴を残す（取り消しが効かなくなるため）。

import type { Prisma, PrismaClient } from '@prisma/client';
import { UNCATEGORIZED } from '../lib/categories.js';
import { normalizeText } from '../lib/text.js';
import { toDateString, toId } from '../json.js';
import { optionalText, parseAmountValue, parseDateValue } from '../input.js';
import { applyChanges, inTransaction, lockCase, type Tx } from './classificationHistory.js';

type Db = PrismaClient | Tx;

// ---------------------------------------------------------------------------
// 口座
// ---------------------------------------------------------------------------

export type AccountFields = {
  accountNumber?: string | null;
  bankName?: string | null;
  branchName?: string | null;
  accountType?: string | null;
  holder?: string | null;
};

export const UNKNOWN_ACCOUNT = 'unknown';

// 口座番号で探し、無ければ作る。あれば空の欄だけを埋める（Django の get_or_create_account）。
export async function getOrCreateAccount(db: Db, caseId: bigint, f: AccountFields) {
  const accountNumber = f.accountNumber || UNKNOWN_ACCOUNT;
  const account = await db.account.upsert({
    where: { caseId_accountNumber: { caseId, accountNumber } },
    create: {
      caseId,
      accountNumber,
      bankName: f.bankName ?? null,
      branchName: f.branchName ?? null,
      accountType: f.accountType ?? null,
      holder: f.holder ?? null,
    },
    update: {},
  });
  const fill: Prisma.AccountUpdateInput = {};
  if (f.bankName && !account.bankName) fill.bankName = f.bankName;
  if (f.branchName && !account.branchName) fill.branchName = f.branchName;
  if (f.accountType && !account.accountType) fill.accountType = f.accountType;
  if (f.holder && !account.holder) fill.holder = f.holder;
  if (Object.keys(fill).length === 0) return account;
  return db.account.update({ where: { id: account.id }, data: fill });
}

// ---------------------------------------------------------------------------
// 1件の読み書き
// ---------------------------------------------------------------------------

const withAccount = { account: true } as const;
type TxWithAccount = Prisma.TransactionGetPayload<{ include: typeof withAccount }>;

export type TransactionJson = {
  id: number;
  date: string | null;
  description: string;
  amountOut: number;
  amountIn: number;
  balance: number | null;
  category: string;
  memo: string;
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
  isFlagged: boolean;
};

// Django の serialize_transaction と同じ中身（キーは camelCase）
export function serializeTransaction(t: TxWithAccount): TransactionJson {
  return {
    id: toId(t.id),
    date: toDateString(t.date),
    description: t.description ?? '',
    amountOut: t.amountOut,
    amountIn: t.amountIn,
    balance: t.balance,
    category: t.category,
    memo: t.memo ?? '',
    bankName: t.account?.bankName ?? '',
    branchName: t.account?.branchName ?? '',
    accountType: t.account?.accountType ?? '',
    accountNumber: t.account?.accountNumber ?? '',
    isFlagged: t.isFlagged,
  };
}

export async function getTransaction(db: Db, caseId: bigint, txId: bigint): Promise<TransactionJson | null> {
  const t = await db.transaction.findFirst({ where: { id: txId, caseId }, include: withAccount });
  return t ? serializeTransaction(t) : null;
}

export type TransactionInput = {
  date?: unknown;
  description?: unknown;
  amountOut?: unknown;
  amountIn?: unknown;
  balance?: unknown;
  category?: unknown;
  memo?: unknown;
  bankName?: unknown;
  branchName?: unknown;
  accountType?: unknown;
  accountNumber?: unknown;
};

type Failure = { ok: false; status: 400 | 404 | 409; error: string };
export type WriteResult = { ok: true; transaction: TransactionJson } | Failure;

const notFound: Failure = { ok: false, status: 404, error: '取引が見つかりません' };
const badRequest = (error: string): Failure => ({ ok: false, status: 400, error });

const descriptionOf = (value: unknown) => (value === undefined || value === null ? null : String(value));

// 取引の追加（Django の api_create_transaction）。口座は番号で探し、無ければ作る。
export async function createTransaction(db: PrismaClient, caseId: bigint, input: TransactionInput): Promise<WriteResult> {
  const date = parseDateValue(input.date);
  const amountOut = parseAmountValue(input.amountOut, '出金額', 0);
  const amountIn = parseAmountValue(input.amountIn, '入金額', 0);
  const balance = parseAmountValue(input.balance, '残高', null);
  if (!date.ok) return badRequest(date.error);
  if (!amountOut.ok) return badRequest(amountOut.error);
  if (!amountIn.ok) return badRequest(amountIn.error);
  if (!balance.ok) return badRequest(balance.error);

  return db.$transaction(async (tx) => {
    const exists = await tx.case.findUnique({ where: { id: caseId }, select: { id: true } });
    if (!exists) return { ok: false, status: 404, error: '案件が見つかりません' } satisfies Failure;
    const account = await getOrCreateAccount(tx, caseId, {
      accountNumber: optionalText(input.accountNumber),
      bankName: optionalText(input.bankName),
      branchName: optionalText(input.branchName),
      accountType: optionalText(input.accountType),
    });
    const description = descriptionOf(input.description);
    const created = await tx.transaction.create({
      data: {
        caseId,
        accountId: account.id,
        date: date.value,
        description,
        descriptionSearch: normalizeText(description ?? ''),
        amountOut: amountOut.value,
        amountIn: amountIn.value,
        balance: balance.value,
        category: optionalText(input.category) ?? UNCATEGORIZED,
        memo: optionalText(input.memo),
      },
      include: withAccount,
    });
    return { ok: true, transaction: serializeTransaction(created) } as const;
  });
}

const ACCOUNT_KEYS = ['bankName', 'branchName', 'accountNumber', 'accountType'] as const;

// 取引の編集（Django の update_transaction）。渡されたキーだけを書き換える。
//
// Django から直したところ:
//   - 日付・金額が読めなければ何も書かずに理由を返す（Django は「取引が見つかりません」と出していた）
//   - 日付・残高を空にすると消える（Django は空を「変更なし」と扱い、一度入れると消せなかった）
//   - 口座番号を空にする・他の口座の番号にする、は弾く（Django は 500 になっていた。
//     口座をまとめたいときは一括置換を使う）
//   - 口座を持たない取引に口座の欄を渡したら、その番号の口座につなぐ（Django は黙って捨てていた）
// 口座の欄は口座そのものを書き換えるので、同じ口座の他の取引にも効く（Django と同じ）。
export async function updateTransaction(
  db: PrismaClient,
  caseId: bigint,
  txId: bigint,
  input: TransactionInput,
): Promise<WriteResult> {
  const has = (key: keyof TransactionInput) => Object.prototype.hasOwnProperty.call(input, key);
  const data: Prisma.TransactionUncheckedUpdateInput = {};

  if (has('date')) {
    const date = parseDateValue(input.date);
    if (!date.ok) return badRequest(date.error);
    data.date = date.value;
  }
  if (has('description')) {
    const description = descriptionOf(input.description);
    data.description = description;
    data.descriptionSearch = normalizeText(description ?? '');
  }
  for (const [key, label] of [['amountOut', '出金額'], ['amountIn', '入金額']] as const) {
    if (!has(key)) continue;
    const amount = parseAmountValue(input[key], label, 0);
    if (!amount.ok) return badRequest(amount.error);
    data[key] = amount.value;
  }
  if (has('balance')) {
    const balance = parseAmountValue(input.balance, '残高', null);
    if (!balance.ok) return badRequest(balance.error);
    data.balance = balance.value;
  }
  if (has('memo')) data.memo = optionalText(input.memo);

  const accountData: Partial<Record<(typeof ACCOUNT_KEYS)[number], string | null>> = {};
  for (const key of ACCOUNT_KEYS) if (has(key)) accountData[key] = optionalText(input[key]);
  if ('accountNumber' in accountData && accountData.accountNumber === null) {
    return badRequest('口座番号は空にできません');
  }
  const newCategory = has('category') ? optionalText(input.category) : null;

  return db.$transaction(async (tx): Promise<WriteResult> => {
    await lockCase(tx, caseId);
    const current = await tx.transaction.findFirst({ where: { id: txId, caseId }, include: withAccount });
    if (!current) return notFound;

    if (Object.keys(accountData).length > 0) {
      if (current.account) {
        const account = current.account;
        const changes = Object.fromEntries(
          Object.entries(accountData).filter(([k, v]) => account[k as keyof typeof accountData] !== v),
        );
        if (changes.accountNumber) {
          const taken = await tx.account.findFirst({
            where: { caseId, accountNumber: changes.accountNumber, id: { not: current.account.id } },
            select: { id: true },
          });
          if (taken) {
            return {
              ok: false,
              status: 409,
              error: `口座番号「${changes.accountNumber}」は別の口座で使われています。口座をまとめるときは一括置換を使ってください`,
            };
          }
        }
        if (Object.keys(changes).length > 0) {
          await tx.account.update({ where: { id: current.account.id }, data: changes });
        }
      } else {
        const account = await getOrCreateAccount(tx, caseId, accountData);
        data.accountId = account.id;
      }
    }

    await tx.transaction.update({ where: { id: txId }, data });
    if (newCategory !== null && newCategory !== current.category) {
      await applyChanges(tx, caseId, { [String(txId)]: newCategory }, 'transaction_edit');
    }
    const updated = await tx.transaction.findUniqueOrThrow({ where: { id: txId }, include: withAccount });
    return { ok: true, transaction: serializeTransaction(updated) };
  });
}

export async function deleteTransaction(db: PrismaClient, caseId: bigint, txId: bigint): Promise<boolean> {
  const { count } = await db.transaction.deleteMany({ where: { id: txId, caseId } });
  return count > 0;
}

// 付箋の付け外し。新しい状態を返す（取引が無ければ null）。
export async function toggleFlag(db: PrismaClient, caseId: bigint, txId: bigint): Promise<boolean | null> {
  // 読んでから反転すると、同時に2回押されたとき両方が同じ値を書く。1文で反転させる
  const rows = await db.$queryRaw<{ is_flagged: boolean }[]>`
    UPDATE analyzer_transaction SET is_flagged = NOT is_flagged
    WHERE id = ${txId} AND case_id = ${caseId}
    RETURNING is_flagged`;
  return rows[0]?.is_flagged ?? null;
}

export async function updateMemo(db: PrismaClient, caseId: bigint, txId: bigint, memo: unknown): Promise<boolean> {
  const { count } = await db.transaction.updateMany({ where: { id: txId, caseId }, data: { memo: optionalText(memo) } });
  return count > 0;
}

// ---------------------------------------------------------------------------
// まとめて消す
// ---------------------------------------------------------------------------

// 口座ごと消す（取引も）。消した取引の件数を返す。
export async function deleteAccountTransactions(db: PrismaClient, caseId: bigint, accountNumber: string): Promise<number> {
  return db.$transaction(async (tx) => {
    const account = await tx.account.findFirst({ where: { caseId, accountNumber } });
    if (!account) return 0;
    const { count } = await tx.transaction.deleteMany({ where: { accountId: account.id } });
    await tx.account.delete({ where: { id: account.id } });
    return count;
  });
}

export async function deleteDuplicates(db: PrismaClient, caseId: bigint, ids: bigint[]): Promise<number> {
  if (ids.length === 0) return 0;
  const { count } = await db.transaction.deleteMany({ where: { caseId, id: { in: ids } } });
  return count;
}

// 未分類のものだけを消す。分類済みの id が混じっていても、それは残す。
export async function deleteUnclassified(
  db: PrismaClient,
  caseId: bigint,
  ids: bigint[],
): Promise<{ count: number; deletedIds: number[] }> {
  if (ids.length === 0) return { count: 0, deletedIds: [] };
  return db.$transaction(async (tx) => {
    const where = { caseId, id: { in: ids }, category: UNCATEGORIZED };
    const targets = await tx.transaction.findMany({ where, select: { id: true }, orderBy: { id: 'asc' } });
    if (targets.length === 0) return { count: 0, deletedIds: [] };
    const { count } = await tx.transaction.deleteMany({ where: { ...where, id: { in: targets.map((t) => t.id) } } });
    return { count, deletedIds: targets.map((t) => toId(t.id)) };
  });
}

// ---------------------------------------------------------------------------
// 分類の変更（1件 / 同じ摘要すべて）
// ---------------------------------------------------------------------------

// applyAll なら同じ摘要の取引すべて（摘要なし同士も同じ扱い）。
// Django は「同じ摘要」の一覧を案件のロックの外で読んでいたので、読んでから書くまでの間に
// 取り込まれた行が漏れることがあった。ここではロックを取ってから読む。
export async function updateCategory(
  db: PrismaClient,
  caseId: bigint,
  txId: bigint,
  category: string,
  applyAll: boolean,
) {
  return db.$transaction(async (tx) => {
    await lockCase(tx, caseId);
    const target = await tx.transaction.findFirst({ where: { id: txId, caseId }, select: { description: true } });
    if (!target) return { count: 0, changeGroup: null };
    if (!applyAll) return applyChanges(tx, caseId, new Map([[String(txId), category]]), 'manual');
    const related = await tx.transaction.findMany({
      where: { caseId, description: target.description },
      select: { id: true },
    });
    return applyChanges(tx, caseId, new Map(related.map((r) => [String(r.id), category])), 'manual_same_description');
  });
}

// ---------------------------------------------------------------------------
// 一括置換
// ---------------------------------------------------------------------------

export const REPLACEABLE_FIELDS = {
  bankName: '銀行名',
  branchName: '支店名',
  accountNumber: '口座番号',
  description: '摘要',
} as const;
export type ReplaceableField = keyof typeof REPLACEABLE_FIELDS;

export const isReplaceableField = (value: unknown): value is ReplaceableField =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(REPLACEABLE_FIELDS, value);

// 画面の候補（値と件数、多い順）。摘要は取引、それ以外は口座で数える。空の値は出さない。
export async function fieldValues(db: PrismaClient, caseId: bigint, field: ReplaceableField) {
  let rows: { value: string | null; count: number }[];
  if (field === 'description') {
    const g = await db.transaction.groupBy({ by: ['description'], where: { caseId }, _count: { _all: true } });
    rows = g.map((r) => ({ value: r.description, count: r._count._all }));
  } else {
    const g = await db.account.groupBy({ by: [field], where: { caseId }, _count: { _all: true } });
    rows = g.map((r) => ({ value: r[field], count: r._count._all }));
  }
  return rows
    .filter((r): r is { value: string; count: number } => !!r.value)
    .sort((a, b) => b.count - a.count || (a.value < b.value ? -1 : a.value > b.value ? 1 : 0));
}

export function validateReplace(field: unknown, oldValue: string, newValue: string): string | null {
  if (!isReplaceableField(field)) return '不正なフィールドが指定されました。';
  if (!oldValue) return '置換前の値を選択してください。';
  if (!newValue) return '置換後の値を入力してください。';
  if (oldValue === newValue) return '置換前と置換後の値が同じです。';
  return null;
}

// 値の一括置換。件数は摘要なら取引の数、口座の欄なら口座の数（口座番号は1か0）。
//
// 口座番号を既にある番号へ置き換えると、2つの口座を1つにまとめる（Django と同じ）:
// 移し先の空いている欄を移し元で埋め、取引を移し先へ付け替えて、移し元を消す。
export async function bulkReplaceField(
  db: PrismaClient,
  caseId: bigint,
  field: ReplaceableField,
  oldValue: string,
  newValue: string,
): Promise<number> {
  if (!oldValue || oldValue === newValue) return 0;
  if (field === 'description') {
    const { count } = await db.transaction.updateMany({
      where: { caseId, description: oldValue },
      data: { description: newValue, descriptionSearch: normalizeText(newValue) },
    });
    return count;
  }
  if (field !== 'accountNumber') {
    const { count } = await db.account.updateMany({ where: { caseId, [field]: oldValue }, data: { [field]: newValue } });
    return count;
  }

  return inTransaction(db, async (tx) => {
    const locked = await tx.$queryRaw<{ id: bigint; account_number: string }[]>`
      SELECT id, account_number FROM analyzer_account
      WHERE case_id = ${caseId} AND account_number IN (${oldValue}, ${newValue})
      ORDER BY id
      FOR UPDATE`;
    const sourceRow = locked.find((r) => r.account_number === oldValue);
    if (!sourceRow) return 0;
    const targetRow = locked.find((r) => r.account_number === newValue);
    if (!targetRow) {
      await tx.account.update({ where: { id: sourceRow.id }, data: { accountNumber: newValue } });
      return 1;
    }

    const [source, target] = await Promise.all([
      tx.account.findUniqueOrThrow({ where: { id: sourceRow.id } }),
      tx.account.findUniqueOrThrow({ where: { id: targetRow.id } }),
    ]);
    const fill: Prisma.AccountUpdateInput = {};
    for (const key of ['bankName', 'branchName', 'accountType', 'holder', 'inventoryRemarks'] as const) {
      if (!target[key] && source[key]) fill[key] = source[key];
    }
    for (const key of ['passbookBalance', 'certificateBalance'] as const) {
      if (target[key] === null && source[key] !== null) fill[key] = source[key];
    }
    if (source.hasAccruedInterest && !target.hasAccruedInterest) fill.hasAccruedInterest = true;
    const asObject = (v: Prisma.JsonValue) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
    const targetYears = asObject(target.passbookYears);
    const mergedYears = { ...asObject(source.passbookYears), ...targetYears };
    if (JSON.stringify(Object.entries(mergedYears).sort()) !== JSON.stringify(Object.entries(targetYears).sort())) {
      fill.passbookYears = mergedYears;
    }
    if (Object.keys(fill).length > 0) await tx.account.update({ where: { id: target.id }, data: fill });
    await tx.transaction.updateMany({ where: { accountId: source.id }, data: { accountId: target.id } });
    await tx.account.delete({ where: { id: source.id } });
    return 1;
  });
}
