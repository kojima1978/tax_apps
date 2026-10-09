// 通帳有無一覧表（Django 版 views/passbook_inventory.py）。口座ごとに、年ごとの通帳の有無・
// 通帳残高・残高証明書の残高・既経過利息・備考を持ち、Excel の一覧表にする。
//
// Django 版との違い:
// - 口座を残高証明書から足す・取り込むとき、既にある口座の備考を「取引履歴なし・残高証明書あり」で
//   上書きしていた（備考が空なら既定の文言を入れる処理が、新規と更新の両方に掛かっていた）。
//   既定の文言は新しく作る口座にだけ入れる
// - 取込ファイルに既経過利息の列が無いと、既にある口座の既経過利息を「無」に戻していた。
//   列があるときだけ書く
// - 読めない金額で 500 になり、取込は途中まで書いた状態で止まっていた。行番号つきで弾き、
//   取込は1件も書かない（全部書くか何も書かないか）
// - 年の通帳有無は「読んで書き戻す」だったので、2つの年を続けて切り替えると片方が消えることがあった。
//   JSON の1キーだけを書き換える
// - 並び替えは1件ずつ書いていた（途中で落ちると並びが混ざる）。まとめて書き、他の案件の口座や
//   重複した ID が混ざっていれば何も書かない
// - 相続開始日が無い案件の通帳残高（自動）は、日付の無い取引の残高を最新として拾っていた
//   （PostgreSQL の降順は NULL が先頭）。日付のある取引を先に見る
// - 通帳残高が「自動（取引から拾った残高）」なのか「手で入れた値」なのか区別できなかった
//   （Django 版は欄に自動の値を入れて出すので、消すと数字が消えたように見えた）。手で入れた値を
//   `manualBalance` として別に返す
// - 口座リストの CSV は1行目を見出しとして読む（取引の取込と同じ読み方だと、見出しに「銀行名」
//   「支店名」が無い「金融機関,店舗名,…」のようなファイルを読めない。Django 版の pandas.read_csv と同じ）

import ExcelJS from 'exceljs';
import { Prisma, type PrismaClient } from '@prisma/client';
import { parseAmountValue, type Parsed } from '../input.js';
import { toId, toDateString } from '../json.js';
import { warekiFull, warekiYearAbbr } from '../lib/dates.js';
import { exportFileName } from '../lib/exportFileName.js';
import { FormatError } from '../lib/import/errors.js';
import { fileHeaderHex, parseCsv, readTable, type Cell } from '../lib/import/readTable.js';
import { blankToNull, xlsxFile, type ExportFile } from './exports.js';

export const DEFAULT_REMARKS = '取引履歴なし・残高証明書あり';

export type BalanceMatch = '○' | '×' | '証明のみ' | '残高証明なし';

export function balanceMatch(passbook: number | null, certificate: number | null): BalanceMatch {
  if (certificate === null) return '残高証明なし';
  if (passbook === null) return '証明のみ';
  return passbook === certificate ? '○' : '×';
}

// ---------------------------------------------------------------------------
// 一覧
// ---------------------------------------------------------------------------

export type InventoryRow = {
  id: number;
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
  years: { year: number; has: boolean }[];
  // 手で入れた値（入れていなければ null）。画面はこれで「自動」かどうかを見分ける
  manualBalance: number | null;
  // 手で入れた値が無ければ自動（相続開始日以前で最後の残高）
  passbookBalance: number | null;
  autoBalance: number | null;
  certificateBalance: number | null;
  balanceMatch: BalanceMatch;
  hasAccruedInterest: boolean;
  inventoryRemarks: string;
};

export type Inventory = {
  caseName: string;
  referenceDate: string | null;
  years: { year: number; wareki: string }[];
  rows: InventoryRow[];
  totalPassbook: number;
  totalCertificate: number;
};

const savedYears = (value: Prisma.JsonValue): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};

// 相続開始日以前で最後の残高（口座ごと）。日付の無い取引は日付のあるものが無いときだけ使う
async function autoBalances(db: PrismaClient, caseId: bigint, referenceDate: Date | null, accountId?: bigint) {
  const rows = await db.transaction.findMany({
    where: {
      caseId,
      balance: { not: null },
      accountId: accountId ?? { not: null },
      ...(referenceDate ? { date: { lte: referenceDate } } : {}),
    },
    select: { accountId: true, balance: true },
    orderBy: [{ accountId: 'asc' }, { date: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
  });
  const latest = new Map<bigint, number>();
  for (const r of rows) if (!latest.has(r.accountId!)) latest.set(r.accountId!, r.balance!);
  return latest;
}

// 取引のある年（口座ごと）と、案件全体の最初と最後の年
async function transactionYears(db: PrismaClient, caseId: bigint) {
  const rows = await db.$queryRaw<{ accountId: bigint | null; year: number }[]>`
    SELECT account_id AS "accountId", EXTRACT(YEAR FROM date)::int AS year
    FROM analyzer_transaction WHERE case_id = ${caseId} AND date IS NOT NULL
    GROUP BY 1, 2`;
  const byAccount = new Map<bigint, Set<number>>();
  for (const r of rows) {
    if (r.accountId === null) continue;
    byAccount.set(r.accountId, (byAccount.get(r.accountId) ?? new Set()).add(r.year));
  }
  const all = rows.map((r) => r.year);
  const years = all.length === 0 ? [] : range(Math.min(...all), Math.max(...all));
  return { years, byAccount };
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export async function getInventory(db: PrismaClient, caseId: bigint): Promise<Inventory> {
  const c = await db.case.findUniqueOrThrow({ where: { id: caseId }, select: { name: true, referenceDate: true } });
  const [accounts, auto, { years, byAccount }] = await Promise.all([
    db.account.findMany({
      where: { caseId },
      orderBy: [{ printOrder: 'asc' }, { bankName: 'asc' }, { branchName: 'asc' }, { accountNumber: 'asc' }],
    }),
    autoBalances(db, caseId, c.referenceDate),
    transactionYears(db, caseId),
  ]);

  const rows = accounts.map((a): InventoryRow => {
    const autoBalance = auto.get(a.id) ?? null;
    const passbookBalance = a.passbookBalance ?? autoBalance;
    const saved = savedYears(a.passbookYears);
    const txYears = byAccount.get(a.id);
    return {
      id: toId(a.id),
      bankName: a.bankName ?? '',
      branchName: a.branchName ?? '',
      accountType: a.accountType ?? '',
      accountNumber: a.accountNumber,
      years: years.map((year) => {
        const s = saved[String(year)];
        return { year, has: s === undefined || s === null ? Boolean(txYears?.has(year)) : Boolean(s) };
      }),
      manualBalance: a.passbookBalance,
      passbookBalance,
      autoBalance,
      certificateBalance: a.certificateBalance,
      balanceMatch: balanceMatch(passbookBalance, a.certificateBalance),
      hasAccruedInterest: a.hasAccruedInterest,
      inventoryRemarks: a.inventoryRemarks,
    };
  });

  return {
    caseName: c.name,
    referenceDate: toDateString(c.referenceDate),
    years: years.map((year) => ({ year, wareki: warekiYearAbbr(year) })),
    rows,
    totalPassbook: rows.reduce((sum, r) => sum + (r.passbookBalance ?? 0), 0),
    totalCertificate: rows.reduce((sum, r) => sum + (r.certificateBalance ?? 0), 0),
  };
}

// ---------------------------------------------------------------------------
// 残高証明書の口座を足す（1件・取込）
// ---------------------------------------------------------------------------

// undefined の欄は既にある口座では触らない
export type CertificateAccount = {
  accountNumber: string;
  bankName?: string;
  branchName?: string;
  accountType?: string;
  certificateBalance?: number | null;
  passbookBalance?: number | null;
  hasAccruedInterest?: boolean;
  inventoryRemarks?: string;
};

type Tx = Prisma.TransactionClient;

const filled = <T>(v: T | undefined): v is T => v !== undefined && v !== null && v !== '';

async function upsertCertificateAccount(tx: Tx, caseId: bigint, data: CertificateAccount): Promise<'created' | 'updated'> {
  const existing = await tx.account.findUnique({ where: { caseId_accountNumber: { caseId, accountNumber: data.accountNumber } } });
  if (!existing) {
    const { _max } = await tx.account.aggregate({ where: { caseId }, _max: { printOrder: true } });
    await tx.account.create({
      data: {
        caseId,
        accountNumber: data.accountNumber,
        bankName: data.bankName ?? '',
        branchName: data.branchName ?? '',
        accountType: data.accountType ?? '',
        certificateBalance: data.certificateBalance ?? null,
        passbookBalance: data.passbookBalance ?? null,
        hasAccruedInterest: data.hasAccruedInterest ?? false,
        inventoryRemarks: filled(data.inventoryRemarks) ? data.inventoryRemarks : DEFAULT_REMARKS,
        printOrder: (_max.printOrder ?? 0) + 1,
      },
    });
    return 'created';
  }
  const update: Prisma.AccountUpdateInput = {};
  for (const key of ['bankName', 'branchName', 'accountType', 'certificateBalance', 'passbookBalance', 'inventoryRemarks'] as const) {
    if (filled(data[key])) Object.assign(update, { [key]: data[key] });
  }
  if (data.hasAccruedInterest !== undefined) update.hasAccruedInterest = data.hasAccruedInterest;
  await tx.account.update({ where: { id: existing.id }, data: update });
  return 'updated';
}

// 口座の欄の長さ（varchar）。超えると 500 になるので先に弾く
const TEXT_LIMITS = { accountNumber: 255, bankName: 255, branchName: 255, accountType: 50 } as const;
const TEXT_LABELS = { accountNumber: '口座番号', bankName: '銀行名', branchName: '支店名', accountType: '種類' } as const;

export function checkLengths(data: CertificateAccount): string | null {
  for (const key of Object.keys(TEXT_LIMITS) as (keyof typeof TEXT_LIMITS)[]) {
    if ((data[key]?.length ?? 0) > TEXT_LIMITS[key]) return `${TEXT_LABELS[key]}は${TEXT_LIMITS[key]}文字以内にしてください`;
  }
  return null;
}

export async function addCertificateAccount(db: PrismaClient, caseId: bigint, data: CertificateAccount) {
  return db.$transaction((tx) => upsertCertificateAccount(tx, caseId, data));
}

// 取込ファイルの列名（別名のどれでもよい。Django 版の CERTIFICATE_IMPORT_COLUMNS）
const IMPORT_COLUMNS = {
  bankName: ['銀行名', '銀行', '金融機関', '金融機関名'],
  branchName: ['支店名', '支店', '店舗名'],
  accountType: ['種類', '種別', '口座種別'],
  accountNumber: ['口座番号', '口座No', '口座No.', '口座'],
  certificateBalance: ['残証残高', '残高証明残高', '残高証明書残高', '証明残高', '残高証明書'],
  passbookBalance: ['通帳残高', '帳簿残高'],
  hasAccruedInterest: ['既経過利息', '既経過利息計算'],
  inventoryRemarks: ['備考', 'メモ', '摘要'],
} as const;

type ImportField = keyof typeof IMPORT_COLUMNS;

const TRUTHY = new Set(['1', 'true', 'yes', 'y', '有', 'あり', '○', '〇', '済']);

type Sheet = { header: string[]; rows: { line: number; cells: Cell[] }[] };

// xlsx は1枚目のシートの1行目、CSV は最初の空でない行を見出しにする。
// CSV の文字コードは UTF-8 → Shift_JIS → 置換しながら Shift_JIS の順に試す
export function readCertificateSheet(bytes: Uint8Array): Sheet {
  const hex = fileHeaderHex(bytes);
  if (hex.startsWith('D0CF11E0') || (bytes[0] === 0x50 && bytes[1] === 0x4b)) return readTable(bytes);
  const text =
    decode(bytes, 'utf-8', true) ?? decode(bytes, 'shift_jis', true) ?? decode(bytes, 'shift_jis', false)!;
  const records = parseCsv(text).filter((r) => r.fields.some((f) => f.trim() !== ''));
  const [head, ...body] = records;
  if (!head) throw new FormatError('ファイルに見出しの行がありません。');
  const header = head.fields.map((h) => h.trim());
  return { header, rows: body.map((r) => ({ line: r.line, cells: header.map((_, i) => r.fields[i] ?? null) })) };
}

function decode(bytes: Uint8Array, encoding: string, fatal: boolean): string | null {
  try {
    return new TextDecoder(encoding, { fatal }).decode(bytes);
  } catch {
    return null;
  }
}

const cellText = (cell: Cell | undefined) => (cell === null || cell === undefined ? '' : String(cell).trim());

// 表の行を口座の欄にする。口座番号の無い行は null（読み飛ばして数える）
function rowToAccount(header: string[], cells: Cell[]): Parsed<CertificateAccount | null> {
  // 別名のうち、列があって値の入っているもの。列そのものが無ければ undefined
  const get = (field: ImportField): string | undefined => {
    const indexes = IMPORT_COLUMNS[field].map((name) => header.indexOf(name)).filter((i) => i >= 0);
    if (indexes.length === 0) return undefined;
    return indexes.map((i) => cellText(cells[i])).find((v) => v !== '') ?? '';
  };
  const accountNumber = get('accountNumber') ?? '';
  if (accountNumber === '') return { ok: true, value: null };

  const amount = (field: 'certificateBalance' | 'passbookBalance', label: string): Parsed<number | null> => {
    const raw = get(field);
    // Excel の数値セルは `1234` のほかに `1234.0` の形で来ることがある
    const value = raw !== undefined && /^-?\d+\.0+$/.test(raw) ? raw.replace(/\.0+$/, '') : raw;
    return parseAmountValue(value, label, null);
  };
  const certificateBalance = amount('certificateBalance', '残証残高');
  if (!certificateBalance.ok) return certificateBalance;
  const passbookBalance = amount('passbookBalance', '通帳残高');
  if (!passbookBalance.ok) return passbookBalance;
  const interest = get('hasAccruedInterest');

  const data: CertificateAccount = {
    accountNumber,
    bankName: get('bankName'),
    branchName: get('branchName'),
    accountType: get('accountType'),
    certificateBalance: certificateBalance.value,
    passbookBalance: passbookBalance.value,
    hasAccruedInterest: interest === undefined ? undefined : TRUTHY.has(interest.toLowerCase()),
    inventoryRemarks: get('inventoryRemarks'),
  };
  const tooLong = checkLengths(data);
  return tooLong ? { ok: false, error: tooLong } : { ok: true, value: data };
}

export type ImportCounts = { created: number; updated: number; skipped: number };

// 取込。1行でも読めなければ何も書かない
export async function importCertificateAccounts(db: PrismaClient, caseId: bigint, sheet: Sheet): Promise<Parsed<ImportCounts>> {
  if (!IMPORT_COLUMNS.accountNumber.some((name) => sheet.header.includes(name))) {
    return { ok: false, error: `口座番号の列が見つかりません（${IMPORT_COLUMNS.accountNumber.join(' / ')}）` };
  }
  const accounts: CertificateAccount[] = [];
  let skipped = 0;
  for (const row of sheet.rows) {
    if (row.cells.every((cell) => cellText(cell) === '')) continue;
    const parsed = rowToAccount(sheet.header, row.cells);
    if (!parsed.ok) return { ok: false, error: `行${row.line}: ${parsed.error}` };
    if (parsed.value) accounts.push(parsed.value);
    else skipped++;
  }
  const counts = await db.$transaction(async (tx) => {
    const result = { created: 0, updated: 0, skipped };
    for (const a of accounts) result[await upsertCertificateAccount(tx, caseId, a)]++;
    return result;
  });
  return { ok: true, value: counts };
}

// ---------------------------------------------------------------------------
// 1つの欄を書く・並び替え
// ---------------------------------------------------------------------------

export type FieldUpdate =
  | { field: 'passbookBalance' | 'certificateBalance'; value: number | null }
  | { field: 'hasAccruedInterest'; value: boolean }
  | { field: 'inventoryRemarks'; value: string }
  | { field: 'passbookYear'; year: number; value: boolean };

// 書いた後の通帳残高（手入力が無ければ自動）と残高一致。口座が案件に無ければ null
export async function updateField(db: PrismaClient, caseId: bigint, accountId: bigint, update: FieldUpdate) {
  const account = await db.account.findFirst({ where: { id: accountId, caseId }, select: { id: true } });
  if (!account) return null;
  if (update.field === 'passbookYear') {
    // 1キーだけ書き換える（読んで書き戻すと、続けて切り替えた別の年が消えることがある）
    await db.$executeRaw`
      UPDATE analyzer_account
      SET passbook_years = passbook_years || jsonb_build_object(${String(update.year)}::text, ${update.value}::boolean)
      WHERE id = ${accountId}`;
  } else {
    await db.account.update({ where: { id: accountId }, data: { [update.field]: update.value } });
  }
  const [saved, c] = await Promise.all([
    db.account.findUniqueOrThrow({ where: { id: accountId } }),
    db.case.findUniqueOrThrow({ where: { id: caseId }, select: { referenceDate: true } }),
  ]);
  const autoBalance = (await autoBalances(db, caseId, c.referenceDate, accountId)).get(accountId) ?? null;
  const passbookBalance = saved.passbookBalance ?? autoBalance;
  return {
    manualBalance: saved.passbookBalance,
    passbookBalance,
    autoBalance,
    balanceMatch: balanceMatch(passbookBalance, saved.certificateBalance),
  };
}

// 並び順を書く。案件に無い口座・重複した ID があれば何も書かず false
export async function reorderAccounts(db: PrismaClient, caseId: bigint, order: bigint[]): Promise<boolean> {
  if (new Set(order).size !== order.length) return false;
  const found = await db.account.count({ where: { caseId, id: { in: order } } });
  if (found !== order.length) return false;
  await db.$transaction(order.map((id, i) => db.account.update({ where: { id }, data: { printOrder: i } })));
  return true;
}

// ---------------------------------------------------------------------------
// Excel（Django 版 export_passbook_inventory と同じ体裁）
// ---------------------------------------------------------------------------

const FONT = '游ゴシック';
const THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};
const PEACH: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFDAB9' } };
const HEADER_FONT: Partial<ExcelJS.Font> = { name: FONT, size: 9, bold: true };
const BODY_FONT: Partial<ExcelJS.Font> = { name: FONT, size: 9 };
const CENTER: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle', wrapText: true };
const LEFT_WRAP: Partial<ExcelJS.Alignment> = { horizontal: 'left', vertical: 'middle', wrapText: true };
const RIGHT: Partial<ExcelJS.Alignment> = { horizontal: 'right', vertical: 'middle' };
const AMOUNT_FORMAT = '#,##0';
const MIN_ROWS = 12;

// 作成日（日本時間の今日）
const todaySlash = (now: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(now).replace(/-/g, '/');

type CellStyle = { font?: Partial<ExcelJS.Font>; alignment?: Partial<ExcelJS.Alignment>; fill?: ExcelJS.Fill; numFmt?: string };

function put(ws: ExcelJS.Worksheet, row: number, col: number, value: ExcelJS.CellValue, style: CellStyle, border = true) {
  const cell = ws.getCell(row, col);
  cell.value = blankToNull(value);
  Object.assign(cell, style);
  if (border) cell.border = THIN;
  return cell;
}

export async function exportInventoryXlsx(db: PrismaClient, caseId: bigint, now = new Date()): Promise<ExportFile> {
  const inv = await getInventory(db, caseId);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('通帳有無一覧表', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });

  const yearCount = inv.years.length;
  const COL_YEAR_START = 6;
  const COL_AFTER = COL_YEAR_START + yearCount; // 通帳残高の列
  const lastCol = COL_AFTER + 4;

  // 行1: 表題・相続開始日・作成日
  ws.mergeCells(1, 1, 1, 5);
  put(ws, 1, 1, `${inv.caseName}  通帳有無一覧表`, { font: { name: FONT, size: 14, bold: true } }, false);
  const midCol = COL_YEAR_START + Math.floor(yearCount / 2);
  ws.mergeCells(1, midCol, 1, COL_AFTER + 2);
  put(
    ws, 1, midCol,
    `相続開始日：${inv.referenceDate ? warekiFull(inv.referenceDate) : '○年○月○日'}`,
    { font: { name: FONT, size: 12 }, alignment: { horizontal: 'center', vertical: 'middle' } },
    false,
  );
  put(
    ws, 1, lastCol, `${todaySlash(now)}\n(作成日)`,
    { font: { name: FONT, size: 8 }, alignment: { horizontal: 'right', vertical: 'middle', wrapText: true } },
    false,
  );

  // 行2-3: 見出し。年の列は西暦と和暦の2段、他は2行を結合
  const twoRowHeader = (col: number, label: string) => {
    ws.mergeCells(2, col, 3, col);
    put(ws, 2, col, label, { font: HEADER_FONT, alignment: CENTER });
    ws.getCell(3, col).border = THIN;
  };
  ['No', '銀行名', '支店名', '種類', '口座番号'].forEach((label, i) => twoRowHeader(i + 1, label));
  inv.years.forEach(({ year, wareki }, i) => {
    put(ws, 2, COL_YEAR_START + i, String(year), { font: HEADER_FONT, alignment: CENTER });
    put(ws, 3, COL_YEAR_START + i, `(${wareki})`, { font: HEADER_FONT, alignment: CENTER });
  });
  ['通帳\n残高', '残高\n一致', '残証\n残高', '既経過\n利息', '備考'].forEach((label, i) => twoRowHeader(COL_AFTER + i, label));

  // データ行（手で書き足せるように最低12行）
  const DATA_START = 4;
  const rowCount = Math.max(MIN_ROWS, inv.rows.length);
  for (let i = 0; i < rowCount; i++) {
    const r = DATA_START + i;
    const d = inv.rows[i];
    put(ws, r, 1, i + 1, { font: BODY_FONT, alignment: CENTER });
    [d?.bankName, d?.branchName, d?.accountType, d?.accountNumber].forEach((v, j) =>
      put(ws, r, 2 + j, v ?? '', { font: BODY_FONT, alignment: LEFT_WRAP, fill: PEACH }),
    );
    inv.years.forEach((_, j) =>
      put(ws, r, COL_YEAR_START + j, d?.years[j]!.has ? '○' : '', { font: BODY_FONT, alignment: CENTER, fill: PEACH }),
    );
    put(ws, r, COL_AFTER, d?.passbookBalance ?? null, { font: BODY_FONT, alignment: RIGHT, numFmt: AMOUNT_FORMAT });
    put(ws, r, COL_AFTER + 1, d?.balanceMatch ?? '残高証明なし', { font: BODY_FONT, alignment: CENTER });
    put(ws, r, COL_AFTER + 2, d?.certificateBalance ?? null, { font: BODY_FONT, alignment: RIGHT, numFmt: AMOUNT_FORMAT });
    put(ws, r, COL_AFTER + 3, d?.hasAccruedInterest ? '☑ 有' : '□ 有', { font: BODY_FONT, alignment: CENTER });
    put(ws, r, COL_AFTER + 4, d?.inventoryRemarks ?? '', { font: BODY_FONT, alignment: LEFT_WRAP });
  }

  // 合計行
  const totalRow = DATA_START + rowCount;
  ws.mergeCells(totalRow, 1, totalRow, COL_AFTER - 1);
  put(ws, totalRow, 1, '計', { font: HEADER_FONT, alignment: RIGHT });
  for (let col = 2; col <= lastCol; col++) ws.getCell(totalRow, col).border = THIN;
  put(ws, totalRow, COL_AFTER, inv.totalPassbook, { font: HEADER_FONT, alignment: RIGHT, numFmt: AMOUNT_FORMAT });
  put(ws, totalRow, COL_AFTER + 2, inv.totalCertificate, { font: HEADER_FONT, alignment: RIGHT, numFmt: AMOUNT_FORMAT });

  // 列幅
  [4, 14, 12, 8, 12].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  for (let i = 0; i < yearCount; i++) ws.getColumn(COL_YEAR_START + i).width = 7;
  [10, 7, 10, 8, 16].forEach((w, i) => (ws.getColumn(COL_AFTER + i).width = w));

  return xlsxFile(wb, exportFileName([inv.caseName, '通帳有無一覧表'], 'xlsx'));
}
