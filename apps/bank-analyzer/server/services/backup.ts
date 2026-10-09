// 案件の JSON バックアップ（Django 版 views/export.py の export_json と
// TransactionService.import_from_json）。ファイルの形は Django 版と同じ version 1.1 で、
// どちらで書き出したものもどちらでも読める。
//
// Django 版との違い:
// - 読み込みを1つのトランザクションで行う。Django 版は案件だけ先に作っていたので、
//   途中で落ちると空の案件が残った（もう一度読み込むと「_復元1」の名前で作られる）
// - 読めない日付・金額は黙って「日付なし」にせず、何件目かを示して弾く
// - 取引の無い口座も作り直す。Django 版は取引から作った口座にしか通帳有無の内容を戻さず、
//   取引を消した後の口座（通帳有無一覧にだけ残っているもの）は黙って落としていた
// - 案件固有の分類パターンも書き出して戻す（case.custom_patterns）。Django 版は書き出して
//   いなかったので、戻した案件ではキーワードが消えていた。Django 版はこのキーを読み飛ばす

import { Prisma, type PrismaClient } from '@prisma/client';
import { UNCATEGORIZED } from '../lib/categories.js';
import { normalizeText } from '../lib/text.js';
import { isRecord, optionalText, parseAmountValue, parseDateValue, type Parsed } from '../input.js';
import { toDateString, toId } from '../json.js';
import { validateCaseName } from './cases.js';
import type { Tx } from './classificationHistory.js';
import { parsePatterns, readAllSettings, replaceAllSettings } from './settings.js';
import { getOrCreateAccount, UNKNOWN_ACCOUNT } from './transactions.js';

export const BACKUP_VERSION = '1.1';
const SUPPORTED_VERSIONS = ['1.0', '1.1'];

// ---------------------------------------------------------------------------
// 書き出し
// ---------------------------------------------------------------------------

// 取引が無ければ null（画面からの書き出しは Django 版と同じく何も出さない）。
// `allowEmpty` は夜間バックアップ用（Django の管理コマンドは取引0件の案件も1本書き出していた）
export async function exportCaseJson(
  db: PrismaClient,
  caseId: bigint,
  options: { allowEmpty?: boolean } = {},
) {
  const c = await db.case.findUnique({ where: { id: caseId } });
  if (!c) return null;
  const [transactions, accounts, totals, settings] = await Promise.all([
    db.transaction.findMany({
      where: { caseId },
      include: { account: true },
      orderBy: [{ date: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
    }),
    db.account.findMany({
      where: { caseId },
      orderBy: [
        { printOrder: 'asc' },
        { bankName: { sort: 'asc', nulls: 'last' } },
        { branchName: { sort: 'asc', nulls: 'last' } },
      ],
    }),
    db.transaction.aggregate({ where: { caseId }, _sum: { amountIn: true, amountOut: true } }),
    readAllSettings(db),
  ]);
  if (transactions.length === 0 && !options.allowEmpty) return null;

  return {
    name: c.name,
    data: {
      version: BACKUP_VERSION,
      exported_at: new Date().toISOString(),
      case: {
        name: c.name,
        created_at: c.createdAt.toISOString(),
        reference_date: toDateString(c.referenceDate),
        custom_patterns: c.customPatterns,
      },
      accounts: accounts.map((a) => ({
        account_number: a.accountNumber,
        bank_name: a.bankName,
        branch_name: a.branchName,
        account_type: a.accountType,
        holder: a.holder,
        passbook_balance: a.passbookBalance,
        certificate_balance: a.certificateBalance,
        has_accrued_interest: a.hasAccruedInterest,
        passbook_years: a.passbookYears,
        inventory_remarks: a.inventoryRemarks,
        print_order: a.printOrder,
      })),
      transactions: transactions.map((t) => ({
        date: toDateString(t.date),
        bank_name: t.account?.bankName ?? null,
        branch_name: t.account?.branchName ?? null,
        account_type: t.account?.accountType ?? null,
        account_number: t.account?.accountNumber ?? null,
        description: t.description,
        amount_out: t.amountOut,
        amount_in: t.amountIn,
        balance: t.balance,
        category: t.category,
        holder: t.account?.holder ?? null,
        is_large: t.isLarge,
        is_transfer: t.isTransfer,
        transfer_to: t.transferTo,
        is_flagged: t.isFlagged,
        memo: t.memo,
      })),
      statistics: {
        total_transactions: transactions.length,
        total_in: totals._sum.amountIn ?? 0,
        total_out: totals._sum.amountOut ?? 0,
      },
      settings,
    },
  };
}

// ---------------------------------------------------------------------------
// 読み込み
// ---------------------------------------------------------------------------

const DEFAULT_NAME = 'インポート案件';
const MAX_NAME_RETRIES = 100;

const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });
const failed = (error: string): Parsed<never> => ({ ok: false, error });

// 文字列の欄。空なら null、長すぎれば弾く
function text(value: unknown, label: string, max: number | null): Parsed<string | null> {
  const s = optionalText(value);
  if (s !== null && max !== null && s.length > max) return failed(`${label}は${max}文字以内にしてください`);
  return ok(s);
}

// 日付は 'YYYY-MM-DD'。Django 版の isoformat() で時刻が付いていても日付の部分だけを読む
function jsonDate(value: unknown): Parsed<Date | null> {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return parseDateValue(value.slice(0, 10));
  return parseDateValue(value);
}

type AccountKey = { accountNumber: string; bankName: string | null; branchName: string | null; accountType: string | null; holder: string | null };

function parseAccountKey(v: Record<string, unknown>): Parsed<AccountKey> {
  const accountNumber = text(v.account_number, '口座番号', 255);
  const bankName = text(v.bank_name, '銀行名', 255);
  const branchName = text(v.branch_name, '支店名', 255);
  const accountType = text(v.account_type, '種別', 50);
  const holder = text(v.holder, '名義', 255);
  for (const p of [accountNumber, bankName, branchName, accountType, holder]) if (!p.ok) return p;
  return ok({
    accountNumber: (accountNumber.ok && accountNumber.value) || UNKNOWN_ACCOUNT,
    bankName: bankName.ok ? bankName.value : null,
    branchName: branchName.ok ? branchName.value : null,
    accountType: accountType.ok ? accountType.value : null,
    holder: holder.ok ? holder.value : null,
  });
}

type ImportTx = AccountKey & Omit<Prisma.TransactionCreateManyInput, 'caseId' | 'accountId' | 'descriptionSearch'>;

function parseTransaction(v: Record<string, unknown>): Parsed<ImportTx> {
  const account = parseAccountKey(v);
  if (!account.ok) return account;
  const date = jsonDate(v.date);
  if (!date.ok) return date;
  const description = text(v.description, '摘要', 255);
  if (!description.ok) return description;
  const amountOut = parseAmountValue(v.amount_out, '出金額', 0);
  if (!amountOut.ok) return amountOut;
  const amountIn = parseAmountValue(v.amount_in, '入金額', 0);
  if (!amountIn.ok) return amountIn;
  const balance = parseAmountValue(v.balance, '残高', null);
  if (!balance.ok) return balance;
  const category = text(v.category, '分類', 100);
  if (!category.ok) return category;
  const transferTo = text(v.transfer_to, '資金移動先', 255);
  if (!transferTo.ok) return transferTo;
  return ok({
    ...account.value,
    date: date.value,
    // 摘要は前後の空白も含めて元のまま戻す
    description: typeof v.description === 'string' && v.description !== '' ? v.description : description.value,
    amountOut: amountOut.value,
    amountIn: amountIn.value,
    balance: balance.value,
    category: category.value ?? UNCATEGORIZED,
    isLarge: v.is_large === true,
    isTransfer: v.is_transfer === true,
    transferTo: transferTo.value,
    isFlagged: v.is_flagged === true,
    memo: typeof v.memo === 'string' && v.memo !== '' ? v.memo : null,
  });
}

type AccountInventory = {
  key: AccountKey;
  data: Prisma.AccountUpdateInput;
};

// 通帳有無一覧の内容。Django 版と同じく、値のあるものだけを上書きする（入金利息の有無は常に）
function parseAccountInventory(v: Record<string, unknown>): Parsed<AccountInventory> {
  const key = parseAccountKey(v);
  if (!key.ok) return key;
  const passbook = parseAmountValue(v.passbook_balance, '通帳残高', null);
  if (!passbook.ok) return passbook;
  const certificate = parseAmountValue(v.certificate_balance, '証書残高', null);
  if (!certificate.ok) return certificate;
  const printOrder = parseAmountValue(v.print_order, '印刷順', null);
  if (!printOrder.ok) return printOrder;
  const data: Prisma.AccountUpdateInput = { hasAccruedInterest: v.has_accrued_interest === true };
  if (passbook.value !== null) data.passbookBalance = passbook.value;
  if (certificate.value !== null) data.certificateBalance = certificate.value;
  if (isRecord(v.passbook_years) && Object.keys(v.passbook_years).length > 0) {
    data.passbookYears = v.passbook_years as Prisma.InputJsonObject;
  }
  if (typeof v.inventory_remarks === 'string' && v.inventory_remarks !== '') data.inventoryRemarks = v.inventory_remarks;
  if (printOrder.value !== null) data.printOrder = printOrder.value;
  return ok({ key: key.value, data });
}

type Backup = {
  name: string;
  referenceDate: Date | null;
  customPatterns: Prisma.InputJsonObject | null;
  accounts: AccountInventory[];
  transactions: ImportTx[];
  settings: unknown;
};

// ファイルの中身を全部読んでから書き始める（途中で弾いて半端に入るのを避ける）
export function parseBackup(data: unknown): Parsed<Backup> {
  if (!isRecord(data)) return failed('バックアップファイルの形式が正しくありません');
  const version = data.version ?? '1.0';
  if (typeof version !== 'string' || !SUPPORTED_VERSIONS.includes(version)) return failed(`未対応のバージョン: ${String(version)}`);

  const c = isRecord(data.case) ? data.case : {};
  const referenceDate = jsonDate(c.reference_date);
  if (!referenceDate.ok) return failed(`基準日: ${referenceDate.error}`);
  let customPatterns: Prisma.InputJsonObject | null = null;
  if (c.custom_patterns !== undefined && c.custom_patterns !== null) {
    const p = parsePatterns(c.custom_patterns);
    if (!p) return failed('案件固有の分類パターンが正しくありません');
    customPatterns = p as Prisma.InputJsonObject;
  }

  const accounts: AccountInventory[] = [];
  const rawAccounts = data.accounts ?? [];
  if (!Array.isArray(rawAccounts)) return failed('口座データが正しくありません');
  for (const [i, a] of rawAccounts.entries()) {
    const parsed = isRecord(a) ? parseAccountInventory(a) : failed('データが正しくありません');
    if (!parsed.ok) return failed(`口座${i + 1}: ${parsed.error}`);
    accounts.push(parsed.value);
  }

  // 取引の無いファイルは弾く。画面からの書き出しは取引0件の案件には何も出さないので、
  // ここに来るのは別物のJSON ── Django 版は `?? []` で受け、エラー応答 `{"success":false,…}` まで
  // 「インポート案件として0件を復元」の空案件にしていた
  // （夜間バックアップは Django 版と同じく取引0件の案件も書き出すが、それを戻す意味は無い）
  const transactions: ImportTx[] = [];
  const rawTransactions = data.transactions;
  if (rawTransactions === undefined) return failed('取引データが含まれていません。書き出したバックアップファイルを選んでください');
  if (!Array.isArray(rawTransactions)) return failed('取引データが正しくありません');
  if (rawTransactions.length === 0) return failed('取引データが0件です');
  for (const [i, t] of rawTransactions.entries()) {
    const parsed = isRecord(t) ? parseTransaction(t) : failed('データが正しくありません');
    if (!parsed.ok) return failed(`取引${i + 1}件目: ${parsed.error}`);
    transactions.push(parsed.value);
  }

  return ok({
    name: optionalText(c.name) ?? DEFAULT_NAME,
    referenceDate: referenceDate.value,
    customPatterns,
    accounts,
    transactions,
    settings: data.settings,
  });
}

// 同じ名前があれば「名前_復元1」「名前_復元2」…の空いているもの
async function freeCaseName(tx: Tx, original: string): Promise<Parsed<string>> {
  const candidates = [original, ...Array.from({ length: MAX_NAME_RETRIES }, (_, i) => `${original}_復元${i + 1}`)];
  const taken = new Set((await tx.case.findMany({ where: { name: { in: candidates } }, select: { name: true } })).map((r) => r.name));
  const name = candidates.find((n) => !taken.has(n));
  if (!name) return failed('案件名の生成に失敗しました。別の名前でインポートしてください。');
  return validateCaseName(name);
}

const IMPORT_TIMEOUT_MS = 120_000;

export class BackupImportError extends Error {}

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

export async function importCaseJson(
  db: PrismaClient,
  backup: Backup,
  restoreSettings: boolean,
): Promise<{ caseId: number; name: string; count: number }> {
  // 名前を選んでから作るまでの間に同じ名前が作られたら、選び直して最初からやり直す
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction((tx) => importInto(tx, backup, restoreSettings), { timeout: IMPORT_TIMEOUT_MS });
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= 2) throw error;
    }
  }
}

async function importInto(tx: Tx, backup: Backup, restoreSettings: boolean) {
  const name = await freeCaseName(tx, backup.name);
  if (!name.ok) throw new BackupImportError(name.error);
  const c = await tx.case.create({
    data: { name: name.value, referenceDate: backup.referenceDate, customPatterns: backup.customPatterns ?? {} },
  });

  // 口座は取引に出てくる順に作り、そのあと取引の無い口座も作る
  const accountIds = new Map<string, bigint>();
  const accountOf = async (key: AccountKey) => {
    let id = accountIds.get(key.accountNumber);
    if (id === undefined) {
      id = (await getOrCreateAccount(tx, c.id, key)).id;
      accountIds.set(key.accountNumber, id);
    }
    return id;
  };

  const rows: Prisma.TransactionCreateManyInput[] = [];
  for (const t of backup.transactions) {
    const { accountNumber, bankName, branchName, accountType, holder, ...fields } = t;
    rows.push({
      ...fields,
      caseId: c.id,
      accountId: await accountOf({ accountNumber, bankName, branchName, accountType, holder }),
      descriptionSearch: normalizeText(fields.description ?? ''),
    });
  }
  if (rows.length > 0) await tx.transaction.createMany({ data: rows });

  for (const a of backup.accounts) {
    await tx.account.update({ where: { id: await accountOf(a.key) }, data: a.data });
  }

  if (restoreSettings && backup.settings !== undefined) {
    const error = await replaceAllSettings(tx, backup.settings);
    if (error) throw new BackupImportError(error);
  }
  return { caseId: toId(c.id), name: c.name, count: rows.length };
}
