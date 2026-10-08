// 取引の取込（Django 版 TransactionService.commit_import と、それを呼ぶ取込ウィザード・直接入力）。
//
// 1回の取込でやること（Django 版と同じ順番）: 分類 → 多額の印 → 口座を探して/作って登録 →
// 案件の全取引で資金移動を判定し直す（印は付けるだけで外さない）。取込時の点数は保存しない。
//
// Django 版との違い:
// - ウィザードの複数ファイルを1つのトランザクションで入れる。Django 版はファイルごとに
//   commit_import を呼んでいて、3つ目で落ちると1〜2つ目だけ入った状態が残った（もう一度
//   取り込むと、入った分が重複として除外されるので気づきにくい）。
// - 重複の判定に使う既存の取引は案件のロックを取ってから読む。同じ案件へ同時に取り込むと、
//   どちらも相手の分を知らずに判定して二重に入ることがあった。
// - 「重複を除外」を外せば重複も入れる（#7。lib/wizard.ts）。

import type { PrismaClient } from '@prisma/client';
import { detectTransfers, isLargeAmount, type AnalysisSettings } from '../lib/analyze.js';
import { classifyTransactions } from '../lib/classify.js';
import { buildDuplicateWarning, buildExistingIndex, markDuplicates, type DedupFields, type DuplicateMark, type DuplicateWarning } from '../lib/dedup.js';
import { normalizeText } from '../lib/text.js';
import { selectRowsToCommit, type CommitAccount, type CommitRow } from '../lib/wizard.js';
import { toDateString, toId } from '../json.js';
import { lockCase, type Tx } from './classificationHistory.js';
import { getAppSettings, getClassifierSettings } from './settings.js';
import { getOrCreateAccount, UNKNOWN_ACCOUNT } from './transactions.js';

export type ImportRow = CommitRow & {
  accountNumber: string | null;
  bankName: string | null;
  branchName: string | null;
  accountType: string | null;
};

// 案件の取引（日付のあるもの）を、口座番号つきで読む
async function loadCaseRows(tx: Tx, caseId: bigint) {
  const rows = await tx.transaction.findMany({
    where: { caseId, date: { not: null } },
    select: {
      id: true,
      date: true,
      description: true,
      amountOut: true,
      amountIn: true,
      balance: true,
      account: { select: { accountNumber: true } },
    },
    orderBy: { id: 'asc' },
  });
  return rows.map((r) => ({
    id: toId(r.id),
    date: toDateString(r.date)!,
    description: r.description,
    amountOut: r.amountOut,
    amountIn: r.amountIn,
    balance: r.balance,
    accountNumber: r.account?.accountNumber ?? null,
  }));
}

// 案件の全取引で資金移動を判定し、見つかったものに印を付ける（外さない）
async function markTransfers(tx: Tx, caseId: bigint, settings: AnalysisSettings) {
  const rows = await loadCaseRows(tx, caseId);
  const matches = detectTransfers(
    rows.map((r) => ({ ...r, accountNumber: r.accountNumber ?? '' })),
    settings,
  );
  const byLabel = new Map<string, bigint[]>();
  for (const m of matches) byLabel.set(m.transferTo, [...(byLabel.get(m.transferTo) ?? []), BigInt(m.id)]);
  for (const [transferTo, ids] of byLabel) {
    await tx.transaction.updateMany({ where: { id: { in: ids } }, data: { isTransfer: true, transferTo } });
  }
}

// commit_import の1回分。分類の使い回し（同じ摘要は最初の行の結果）は1回の中だけで効く
async function insertRows(tx: Tx, caseId: bigint, rows: ImportRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const [classifier, settings] = await Promise.all([getClassifierSettings(tx, caseId), getAppSettings(tx)]);
  const classes = classifyTransactions(rows, classifier);

  const accounts = new Map<string, bigint>();
  const data = [];
  for (const [i, r] of rows.entries()) {
    const number = r.accountNumber || UNKNOWN_ACCOUNT;
    let accountId = accounts.get(number);
    if (accountId === undefined) {
      accountId = (await getOrCreateAccount(tx, caseId, { ...r, accountNumber: number })).id;
      accounts.set(number, accountId);
    }
    data.push({
      caseId,
      accountId,
      date: new Date(`${r.date}T00:00:00Z`),
      description: r.description,
      descriptionSearch: normalizeText(r.description ?? ''),
      amountOut: r.amountOut,
      amountIn: r.amountIn,
      balance: r.balance,
      isLarge: isLargeAmount(r.amountOut, r.amountIn, settings.largeAmountThreshold),
      category: classes[i]!.category,
    });
  }
  await tx.transaction.createMany({ data });
  await markTransfers(tx, caseId, settings);
  return rows.length;
}

// 数千件の取込は Prisma の既定（5秒）を超えうる
const IMPORT_TIMEOUT_MS = 120_000;

// 直接入力（1回の commit_import）
export async function commitRows(db: PrismaClient, caseId: bigint, rows: ImportRow[]): Promise<number> {
  return db.$transaction(
    async (tx) => {
      await lockCase(tx, caseId);
      return insertRows(tx, caseId, rows);
    },
    { timeout: IMPORT_TIMEOUT_MS },
  );
}

export type WizardFile = { account: CommitAccount; rows: CommitRow[] };

// 取込ウィザードの確定。ファイルごとに DB の最新の状態で重複を判定し直してから入れる
// （ファイルごとに commit_import を呼ぶのは Django 版と同じ。分類の使い回しと資金移動の
// 判定がファイル単位で効くので、まとめて1回にすると結果が変わる）。
export async function commitWizard(
  db: PrismaClient,
  caseId: bigint,
  files: WizardFile[],
  skipDuplicates: boolean,
): Promise<{ imported: number; skipped: number }> {
  return db.$transaction(
    async (tx) => {
      await lockCase(tx, caseId);
      const index = buildExistingIndex((await loadCaseRows(tx, caseId)) satisfies DedupFields[]);
      let imported = 0;
      let skipped = 0;
      for (const f of files) {
        const selected = selectRowsToCommit(f.rows, f.account, index, skipDuplicates);
        skipped += selected.skipped;
        imported += await insertRows(tx, caseId, selected.rows);
      }
      return { imported, skipped };
    },
    { timeout: IMPORT_TIMEOUT_MS },
  );
}

// 取込ウィザードの手順3に入るときの重複の判定し直し（書き込まない）。
// プレビューの判定はファイルから読めた口座番号で行うので、ファイル名にも中身にも口座番号が無い・
// 手順2で別の口座を選んだファイルは、取込済みの取引と同じ行でも「重複 0件」と出ていた
// （確定時はサーバが判定し直すので入り方は正しいが、画面の見込みの件数が食い違う。Django 版も同じ）。
// 確定（commitWizard）と同じく、画面で決めた口座で・全ファイルで1つの索引を取り合って判定する。
export async function checkWizardDuplicates(
  db: PrismaClient,
  caseId: bigint,
  files: WizardFile[],
): Promise<{ marks: DuplicateMark[]; warning: DuplicateWarning | null }[]> {
  const index = buildExistingIndex((await loadCaseRows(db, caseId)) satisfies DedupFields[]);
  return files.map((f) => {
    const marked = markDuplicates(f.rows, index, f.account.accountNumber);
    return {
      marks: marked.rows.map(({ isDuplicate, dupConfidence }) => ({ isDuplicate, dupConfidence })),
      warning: buildDuplicateWarning(marked.rows, marked.duplicateCount, f.rows.length),
    };
  });
}
