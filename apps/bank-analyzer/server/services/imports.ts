// 取引の取込（Django 版 TransactionService.commit_import と、それを呼ぶ取込ウィザード・直接入力）。
//
// 1回の取込でやること（Django 版と同じ順番）: 分類 → 多額の印 → 口座を探して/作って登録 →
// 案件の全取引で資金移動を判定し直す（印は付けるだけで外さない）。取込時の点数は保存しない。
//
// CSV の「分類」の列（依頼24）: 分類が書かれた行はその分類で入れ、自動分類にかけるのは
// 書かれていない行だけ。点数は自動分類と同じく保存しない（0 のまま ＝ 取込時に付いた分類）。
// 分類の変更履歴（ClassificationChange）にも積まない ── 履歴は「取込後に人が変えた操作」を
// 戻すためのもので、取込で付く分類は自動分類と同じく最初の状態だから。
// 贈与・多額・資金移動の判定は CSV の分類があっても今までどおり走る。
//
// Django 版との違い:
// - ウィザードの複数ファイルを1つのトランザクションで入れる。Django 版はファイルごとに
//   commit_import を呼んでいて、3つ目で落ちると1〜2つ目だけ入った状態が残った（もう一度
//   取り込むと、入った分が重複として除外されるので気づきにくい）。
// - 重複の判定に使う既存の取引は案件のロックを取ってから読む。同じ案件へ同時に取り込むと、
//   どちらも相手の分を知らずに判定して二重に入ることがあった。
// - 「重複を除外」を外せば重複も入れる（#7。lib/wizard.ts）。

import type { PrismaClient } from '@prisma/client';
import { accountIdentity, accountLabel } from '../lib/accountIdentity.js';
import { detectTransfers, isLargeAmount, type AnalysisSettings } from '../lib/analyze.js';
import { STANDARD_CATEGORIES, normalizePatterns, sortCategories } from '../lib/categories.js';
import { type ClassifierSettings } from '../lib/classify.js';
import { decideCategories } from '../lib/import/csvCategory.js';
import {
  buildImportSummary,
  type CategorySource,
  type ImportReview,
  type ImportSummary,
  type InsertedRow,
} from '../lib/import/summary.js';
import { buildDuplicateWarning, buildExistingIndex, markDuplicates, type DedupFields, type DuplicateMark, type DuplicateWarning } from '../lib/dedup.js';
import { normalizeText } from '../lib/text.js';
import { selectRowsToCommit, type CommitAccount, type CommitRow } from '../lib/wizard.js';
import { toDateString, toId } from '../json.js';
import { lockCase, type Tx } from './classificationHistory.js';
import { getAppSettings, getClassifierSettings, mergePatterns } from './settings.js';
import { getOrCreateAccount } from './transactions.js';

export type ImportRow = CommitRow & {
  accountNumber: string | null;
  bankName: string | null;
  branchName: string | null;
  accountType: string | null;
};

// 案件の取引（日付のあるもの）を、口座つきで読む。
// 口座は主キーと同一性の3欄（銀行名・支店名・口座番号）をまとめて読む ──
// 資金移動の判定も重複の判定も、番号だけでは別の銀行の口座を同じ口座として扱ってしまう
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
      account: { select: { id: true, bankName: true, branchName: true, accountNumber: true } },
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
    accountId: r.account ? toId(r.account.id) : null,
    bankName: r.account?.bankName ?? null,
    branchName: r.account?.branchName ?? null,
    accountNumber: r.account?.accountNumber ?? null,
  }));
}

// 案件の全取引で資金移動を判定し、見つかったものに印を付ける（外さない）
async function markTransfers(tx: Tx, caseId: bigint, settings: AnalysisSettings) {
  const rows = await loadCaseRows(tx, caseId);
  const matches = detectTransfers(
    rows.map((r) => ({ ...r, accountLabel: accountLabel(r) })),
    settings,
  );
  const byLabel = new Map<string, bigint[]>();
  for (const m of matches) byLabel.set(m.transferTo, [...(byLabel.get(m.transferTo) ?? []), BigInt(m.id)]);
  for (const [transferTo, ids] of byLabel) {
    await tx.transaction.updateMany({ where: { id: { in: ids } }, data: { isTransfer: true, transferTo } });
  }
}

// 取込で使える分類（標準＋設定で足したもの）。CSV の分類名の照合と、AI に渡す指示文の分類の一覧の元。
// 並びは画面の分類と同じ（sortCategories）。キーワードは全体 → 案件固有の順
export function importCategories(classifier: Pick<ClassifierSettings, 'globalPatterns' | 'casePatterns'>) {
  const keywords = mergePatterns(normalizePatterns(classifier.globalPatterns), normalizePatterns(classifier.casePatterns));
  return sortCategories([...STANDARD_CATEGORIES, ...keywords.keys()]).map((name) => ({
    name,
    keywords: keywords.get(name) ?? [],
  }));
}

// commit_import の1回分。分類の使い回し（同じ摘要は最初の行の結果）は1回の中だけで効く。
// 戻り値は入れた取引の ID（送られた並び）と、行ごとの分類の出どころ（取込の結果の内訳用）
async function insertRows(tx: Tx, caseId: bigint, rows: ImportRow[]): Promise<{ ids: bigint[]; sources: CategorySource[] }> {
  if (rows.length === 0) return { ids: [], sources: [] };
  const [classifier, settings] = await Promise.all([getClassifierSettings(tx, caseId), getAppSettings(tx)]);
  const decided = decideCategories(rows, importCategories(classifier).map((c) => c.name), classifier);

  // 同じ口座を2度探さないための覚え書き。キーは同一性（番号だけだと、同じ番号の
  // 別の銀行の行が最初の口座へ流れ込む）
  const accounts = new Map<string, bigint>();
  const data = [];
  for (const [i, r] of rows.entries()) {
    const key = accountIdentity(r);
    let accountId = accounts.get(key);
    if (accountId === undefined) {
      accountId = (await getOrCreateAccount(tx, caseId, r)).id;
      accounts.set(key, accountId);
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
      category: decided[i]!.category,
      memo: r.memo || null,
      isFlagged: r.flagged === true,
    });
  }
  // createManyAndReturn は送った並びで返す（PostgreSQL の INSERT … RETURNING）
  const created = await tx.transaction.createManyAndReturn({ data, select: { id: true } });
  await markTransfers(tx, caseId, settings);
  return {
    ids: created.map((t) => t.id),
    // 使える分類名で入った行は画面の申告（無ければ CSV）、自動分類へ回った行は auto
    sources: decided.map((d, i) => (d.source === 'csv' ? (rows[i]!.categorySource ?? 'csv') : 'auto')),
  };
}

// 入れた取引を読み直す（資金移動の印は全部入れ終えた後の状態で見る）
async function loadInserted(tx: Tx, ids: bigint[]) {
  const rows = await tx.transaction.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      accountId: true,
      date: true,
      amountOut: true,
      amountIn: true,
      balance: true,
      category: true,
      memo: true,
      isFlagged: true,
      isLarge: true,
      isTransfer: true,
    },
  });
  return new Map(rows.map((r) => [r.id, r]));
}

// 数千件の取込は Prisma の既定（5秒）を超えうる
const IMPORT_TIMEOUT_MS = 120_000;

// 直接入力（1回の commit_import）
export async function commitRows(db: PrismaClient, caseId: bigint, rows: ImportRow[]): Promise<number> {
  return db.$transaction(
    async (tx) => {
      await lockCase(tx, caseId);
      return (await insertRows(tx, caseId, rows)).ids.length;
    },
    { timeout: IMPORT_TIMEOUT_MS },
  );
}

// openingBalance: 繰越の行の残高（依頼26。取込の結果の残高のつながりの出発点。取込の中身には使わない）
export type WizardFile = { account: CommitAccount; rows: CommitRow[]; openingBalance?: number | null };

// 取込ウィザードの確定。ファイルごとに DB の最新の状態で重複を判定し直してから入れる
// （ファイルごとに commit_import を呼ぶのは Django 版と同じ。分類の使い回しと資金移動の
// 判定がファイル単位で効くので、まとめて1回にすると結果が変わる）。
// 戻り値は取込の結果（依頼25。lib/import/summary.ts）。相手の見つからない通帳間移動は
// 後のファイルで相手が入ることがあるので、全部入れ終えてから数える（食い違いは直さず数を知らせるだけ）
export async function commitWizard(
  db: PrismaClient,
  caseId: bigint,
  files: WizardFile[],
  skipDuplicates: boolean,
  review?: ImportReview,
): Promise<ImportSummary> {
  return db.$transaction(
    async (tx) => {
      await lockCase(tx, caseId);
      const before = await loadCaseRows(tx, caseId);
      const index = buildExistingIndex(before satisfies DedupFields[]);
      let skipped = 0;
      const inserted: { ids: bigint[]; sources: CategorySource[] }[] = [];
      const openings: (number | null)[] = [];
      for (const f of files) {
        const selected = selectRowsToCommit(f.rows, f.account, index, skipDuplicates);
        skipped += selected.skipped;
        inserted.push(await insertRows(tx, caseId, selected.rows));
        openings.push(selected.firstKept ? (f.openingBalance ?? null) : null);
      }
      const byId = await loadInserted(
        tx,
        inserted.flatMap((f) => f.ids),
      );
      const accountIds = [...new Set([...byId.values()].flatMap((r) => (r.accountId === null ? [] : [r.accountId])))];
      const accounts = await tx.account.findMany({
        where: { id: { in: accountIds } },
        select: { id: true, bankName: true, branchName: true, accountNumber: true, accountType: true },
      });
      return buildImportSummary({
        files: inserted.map((f) =>
          f.ids.map((id, i): InsertedRow => {
            const r = byId.get(id)!;
            return {
              id: toId(r.id),
              accountId: r.accountId === null ? 0 : toId(r.accountId),
              date: toDateString(r.date)!,
              amountOut: r.amountOut,
              amountIn: r.amountIn,
              balance: r.balance,
              category: r.category,
              categorySource: f.sources[i]!,
              memo: r.memo,
              isFlagged: r.isFlagged,
              isLarge: r.isLarge,
              isTransfer: r.isTransfer,
            };
          }),
        ),
        openings,
        ...(review ? { review } : {}),
        fileCount: files.length,
        skipped,
        accounts: accounts.map((a) => ({ ...a, id: toId(a.id) })),
        existing: before,
      });
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
    const marked = markDuplicates(f.rows, index, f.account);
    return {
      marks: marked.rows.map(({ isDuplicate, dupConfidence }) => ({ isDuplicate, dupConfidence })),
      warning: buildDuplicateWarning(marked.rows, marked.duplicateCount, f.rows.length),
    };
  });
}
