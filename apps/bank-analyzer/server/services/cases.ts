// 案件の一覧・作成・名前の変更・削除・基準日（Django 版 views/case.py と api の案件名・基準日）。

import { Prisma, type PrismaClient } from '@prisma/client';
import { UNCATEGORIZED } from '../lib/categories.js';
import { toDateString, toId } from '../json.js';
import type { Parsed } from '../input.js';

/** 担当者。staffId は社員台帳の ID、name は選んだ時点の写し */
export type CaseAssignee = { staffId: number; name: string };

const assigneeOf = (c: { assigneeStaffId: number | null; assigneeName: string }): CaseAssignee | null =>
  c.assigneeStaffId === null ? null : { staffId: c.assigneeStaffId, name: c.assigneeName };

export type CaseSummary = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  referenceDate: string | null;
  assignee: CaseAssignee | null;
  transactionCount: number;
  unclassifiedCount: number;
  accountCount: number;
};

// 並びは Django と同じ作成日時の新しい順。件数は一覧に出す3つ。
export async function listCases(db: PrismaClient): Promise<CaseSummary[]> {
  const [cases, unclassified] = await Promise.all([
    db.case.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { _count: { select: { transactions: true, accounts: true } } },
    }),
    db.transaction.groupBy({ by: ['caseId'], where: { category: UNCATEGORIZED }, _count: { _all: true } }),
  ]);
  const unclassifiedByCase = new Map(unclassified.map((r) => [r.caseId, r._count._all]));
  return cases.map((c) => ({
    id: toId(c.id),
    name: c.name,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    referenceDate: toDateString(c.referenceDate),
    assignee: assigneeOf(c),
    transactionCount: c._count.transactions,
    unclassifiedCount: unclassifiedByCase.get(c.id) ?? 0,
    accountCount: c._count.accounts,
  }));
}

// 口座は取込ウィザード・直接入力の「既存の口座から選ぶ」に使う（通帳有無一覧と同じ並び）
export async function getCase(db: PrismaClient, caseId: bigint) {
  const c = await db.case.findUnique({
    where: { id: caseId },
    include: {
      accounts: {
        select: { bankName: true, branchName: true, accountType: true, accountNumber: true },
        orderBy: [{ printOrder: 'asc' }, { bankName: 'asc' }, { branchName: 'asc' }, { accountNumber: 'asc' }],
      },
    },
  });
  if (!c) return null;
  return {
    id: toId(c.id),
    name: c.name,
    referenceDate: toDateString(c.referenceDate),
    assignee: assigneeOf(c),
    accounts: c.accounts.map((a) => ({
      bankName: a.bankName ?? '',
      branchName: a.branchName ?? '',
      accountType: a.accountType ?? '',
      accountNumber: a.accountNumber,
    })),
  };
}

const NAME_MAX = 255;
export const DUPLICATE_NAME_ERROR = 'この案件名はすでに使われています。';

// Django の CaseForm と同じ: 前後の空白を落として必須・255文字まで・重複不可
export function validateCaseName(value: unknown): Parsed<string> {
  const name = typeof value === 'string' ? value.trim() : '';
  if (name === '') return { ok: false, error: '案件名を入力してください。' };
  if (name.length > NAME_MAX) return { ok: false, error: `案件名は${NAME_MAX}文字以内で入力してください。` };
  return { ok: true, value: name };
}

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

// 担当者は作成と同時に付けられる（省略・null は担当者なし）。形は PUT /assignee と同じ
export async function createCase(db: PrismaClient, rawName: unknown, rawAssignee?: unknown): Promise<Parsed<{ id: number; name: string }>> {
  const name = validateCaseName(rawName);
  if (!name.ok) return name;
  const assignee =
    rawAssignee === undefined || rawAssignee === null
      ? ({ ok: true, value: null } as const)
      : typeof rawAssignee === 'object'
        ? parseAssignee(rawAssignee as Record<string, unknown>)
        : ({ ok: false, error: '担当者が正しくありません。' } as const);
  if (!assignee.ok) return assignee;
  try {
    const c = await db.case.create({
      data: { name: name.value, assigneeStaffId: assignee.value?.staffId ?? null, assigneeName: assignee.value?.name ?? '' },
    });
    return { ok: true, value: { id: toId(c.id), name: c.name } };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: DUPLICATE_NAME_ERROR };
    throw error;
  }
}

// 戻り値 null は案件が無い
export async function renameCase(db: PrismaClient, caseId: bigint, rawName: unknown): Promise<Parsed<string> | null> {
  const name = validateCaseName(rawName);
  if (!name.ok) return name;
  try {
    const { count } = await db.case.updateMany({ where: { id: caseId }, data: { name: name.value } });
    return count === 0 ? null : name;
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: DUPLICATE_NAME_ERROR };
    throw error;
  }
}

// 口座・取引・履歴・削除の控えは DB の ON DELETE CASCADE で一緒に消える
export async function deleteCase(db: PrismaClient, caseId: bigint): Promise<boolean> {
  const { count } = await db.case.deleteMany({ where: { id: caseId } });
  return count > 0;
}

export async function setReferenceDate(db: PrismaClient, caseId: bigint, date: Date | null): Promise<boolean> {
  const { count } = await db.case.updateMany({ where: { id: caseId }, data: { referenceDate: date } });
  return count > 0;
}

const ASSIGNEE_NAME_MAX = 100;

// { staffId: null } で外す。名前は台帳の氏名を画面が写して送る（台帳を引き直さない）
export function parseAssignee(body: Record<string, unknown>): Parsed<CaseAssignee | null> {
  if (body.staffId === null) return { ok: true, value: null };
  if (!Number.isInteger(body.staffId) || (body.staffId as number) <= 0) return { ok: false, error: '担当者が正しくありません。' };
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name === '') return { ok: false, error: '担当者の名前がありません。' };
  return { ok: true, value: { staffId: body.staffId as number, name: name.slice(0, ASSIGNEE_NAME_MAX) } };
}

// 担当の付け替えは分析の中身を変えないので、一覧の「更新日」は動かさない。
// Prisma は updateMany でも @updatedAt を書き換えるため、ここだけ素の SQL で書く
export async function setAssignee(db: PrismaClient, caseId: bigint, assignee: CaseAssignee | null): Promise<boolean> {
  const count = await db.$executeRaw`
    UPDATE analyzer_case
       SET assignee_staff_id = ${assignee?.staffId ?? null}, assignee_name = ${assignee?.name ?? ''}
     WHERE id = ${caseId}`;
  return count > 0;
}
