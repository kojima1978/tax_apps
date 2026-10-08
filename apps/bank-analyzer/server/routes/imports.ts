// 取引の取込（Django: 取込ウィザードの parse_files / commit_wizard と、直接入力 direct_input）
//
// Django 版との違い:
// - 直接入力の読めない金額は 0 円で登録せず、行番号つきで弾く。残高の空欄は 0 円ではなく「残高なし」
// - 日付が無いのに他の欄が埋まっている行は、黙って捨てずに弾く（何も入っていない行だけ読み飛ばす）
// - 1ファイルの大きさに上限（10MB）を置く。Django 版はメモリ上の扱いだけが 10MB で、上限は無かった

import type { PrismaClient } from '@prisma/client';
import { buildExistingIndex } from '../lib/dedup.js';
import { StatementImportError } from '../lib/import/errors.js';
import { buildPreview, type CommitAccount, type CommitRow, type PreviewFile } from '../lib/wizard.js';
import { toDateString } from '../json.js';
import { isRecord, optionalText, parseAmountValue, parseDateValue, type Parsed } from '../input.js';
import { checkWizardDuplicates, commitRows, commitWizard, type ImportRow, type WizardFile } from '../services/imports.js';
import { fail, ok, readBody, type CaseRouter } from './common.js';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

// 摘要の列は varchar(255)
const MAX_DESCRIPTION = 255;

const okValue = <T>(value: T): Parsed<T> => ({ ok: true, value });
const failValue = (error: string): Parsed<never> => ({ ok: false, error });

function parseDescription(value: unknown): Parsed<string | null> {
  if (value === undefined || value === null) return okValue(null);
  const s = String(value);
  return s.length > MAX_DESCRIPTION ? failValue(`摘要は${MAX_DESCRIPTION}文字以内にしてください`) : okValue(s);
}

// 1行分の日付・摘要・金額。日付は必須
function parseRow(v: Record<string, unknown>): Parsed<CommitRow> {
  const date = parseDateValue(v.date);
  if (!date.ok) return date;
  if (!date.value) return failValue('日付を入力してください');
  const description = parseDescription(v.description);
  if (!description.ok) return description;
  const amountOut = parseAmountValue(v.amountOut, '出金額', 0);
  if (!amountOut.ok) return amountOut;
  const amountIn = parseAmountValue(v.amountIn, '入金額', 0);
  if (!amountIn.ok) return amountIn;
  const balance = parseAmountValue(v.balance, '残高', null);
  if (!balance.ok) return balance;
  return okValue({
    date: toDateString(date.value)!,
    description: description.value,
    amountOut: amountOut.value,
    amountIn: amountIn.value,
    balance: balance.value,
  });
}

const ACCOUNT_KEYS = ['bankName', 'branchName', 'accountType', 'accountNumber'] as const;

function parseWizardFiles(value: unknown): Parsed<WizardFile[]> {
  if (!Array.isArray(value)) return failValue('インポートデータがありません');
  const files: WizardFile[] = [];
  for (const [i, f] of value.entries()) {
    if (!isRecord(f) || !Array.isArray(f.rows)) return failValue(`ファイル${i + 1}: データが正しくありません`);
    const acc = isRecord(f.account) ? f.account : {};
    const account = Object.fromEntries(ACCOUNT_KEYS.map((k) => [k, optionalText(acc[k]) ?? ''])) as CommitAccount;
    const rows: CommitRow[] = [];
    for (const [j, r] of f.rows.entries()) {
      const row = isRecord(r) ? parseRow(r) : failValue('データが正しくありません');
      if (!row.ok) return failValue(`ファイル${i + 1} 行${j + 1}: ${row.error}`);
      rows.push(row.value);
    }
    files.push({ account, rows });
  }
  return files.some((f) => f.rows.length > 0) ? okValue(files) : failValue('インポートデータがありません');
}

const DIRECT_KEYS = ['date', 'description', 'amountOut', 'amountIn', 'balance', ...ACCOUNT_KEYS] as const;

// 直接入力の行。何も入っていない行は読み飛ばす
function parseDirectRows(value: unknown): Parsed<ImportRow[]> {
  if (!Array.isArray(value)) return okValue([]);
  const rows: ImportRow[] = [];
  for (const [i, r] of value.entries()) {
    if (!isRecord(r) || DIRECT_KEYS.every((k) => optionalText(r[k]) === null)) continue;
    const row = parseRow(r);
    if (!row.ok) return failValue(`行${i + 1}: ${row.error}`);
    rows.push({
      ...row.value,
      bankName: optionalText(r.bankName),
      branchName: optionalText(r.branchName),
      accountType: optionalText(r.accountType),
      accountNumber: optionalText(r.accountNumber),
    });
  }
  return okValue(rows);
}

// 送られてきたファイル。Django と同じ file_0, file_1, … と、まとめて送る files の両方を受ける
function uploadedFiles(body: Record<string, unknown>): File[] {
  const numbered = Object.keys(body)
    .map((k) => /^file_(\d+)$/.exec(k))
    .filter((m): m is RegExpExecArray => m !== null)
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map((m) => body[m[0]]);
  const listed = Array.isArray(body.files) ? body.files : body.files === undefined ? [] : [body.files];
  return [...numbered, ...listed].flat().filter((f): f is File => f instanceof File);
}

export function importRoutes(r: CaseRouter, db: PrismaClient) {
  // プレビュー（書き込まない）。既存の取引との重複は全ファイルで1つの索引を取り合う
  r.post('/:caseId/import/parse', async (c) => {
    let body: Record<string, unknown>;
    try {
      body = (await c.req.parseBody({ all: true })) as Record<string, unknown>;
    } catch {
      return fail(c, 'ファイルが見つかりません');
    }
    const files = uploadedFiles(body);
    if (files.length === 0) return fail(c, 'ファイルが見つかりません');
    const tooLarge = files.find((f) => f.size > MAX_FILE_BYTES);
    if (tooLarge) return fail(c, `ファイル '${tooLarge.name}' が大きすぎます（10MBまで）`);

    const caseId = c.get('caseId');
    const existing = await db.transaction.findMany({
      where: { caseId, date: { not: null } },
      select: { date: true, description: true, amountOut: true, amountIn: true, balance: true, account: { select: { accountNumber: true } } },
    });
    const index = buildExistingIndex(
      existing.map((t) => ({ ...t, date: toDateString(t.date)!, accountNumber: t.account?.accountNumber ?? null })),
    );

    const previews: PreviewFile[] = [];
    for (const file of files) {
      try {
        previews.push(...buildPreview(file.name, new Uint8Array(await file.arrayBuffer()), index));
      } catch (e) {
        if (!(e instanceof StatementImportError)) throw e;
        return c.json({ success: false, error: `ファイル '${file.name}' のエラー: ${e.message}`, details: e.toDict() }, 400);
      }
    }
    if (previews.length === 0) return fail(c, 'ファイルが見つかりません');
    return ok(c, { files: previews });
  });

  // 手順3に入るときに、画面で決めた口座で重複を判定し直す（書き込まない）。送る形は確定と同じ
  r.post('/:caseId/import/check', async (c) => {
    const files = parseWizardFiles((await readBody(c)).files);
    if (!files.ok) return fail(c, files.error);
    return ok(c, { files: await checkWizardDuplicates(db, c.get('caseId'), files.value) });
  });

  // 確定。skipDuplicates を省けば重複は除外する（Django 版は常に除外していた）
  r.post('/:caseId/import/commit', async (c) => {
    const body = await readBody(c);
    const files = parseWizardFiles(body.files);
    if (!files.ok) return fail(c, files.error);
    const { imported, skipped } = await commitWizard(db, c.get('caseId'), files.value, body.skipDuplicates !== false);
    return ok(c, {
      imported,
      skipped,
      message:
        skipped > 0
          ? `${imported}件の取引を取り込みました（${skipped}件の重複をスキップ）`
          : `${imported}件の取引を取り込みました`,
    });
  });

  r.post('/:caseId/import/direct', async (c) => {
    const rows = parseDirectRows((await readBody(c)).rows);
    if (!rows.ok) return fail(c, rows.error);
    if (rows.value.length === 0) return fail(c, '登録するデータがありません。');
    const count = await commitRows(db, c.get('caseId'), rows.value);
    return ok(c, { count, message: `${count}件の取引を登録しました。` });
  });
}
