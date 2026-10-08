// 取引の CSV・Excel の書き出し（Django 版 views/export.py の export_csv / export_csv_filtered /
// export_xlsx_by_category / export_monthly_cashflow_xlsx）。
//
// Django 版との違い:
// - 残高が空の取引が1件でもあると、残高の列がまるごと小数（`10000.0`）で書かれていた
//   （pandas が列を float にするため）。整数のまま書く
// - 分類名に Excel のシート名に使えない文字（`/` `:` `[` など）があると 500 で落ちていた。
//   使えない文字は全角に寄せ、31文字で切って重なったものには `(2)` を付ける
// - 多額取引のシート名は「しきい値 ÷ 1万」の切り捨てだったので、9,999円以下なら「0万円以上」、
//   15,000円なら「1万円以上」と中身と違う名前になっていた。万で割り切れないときは円で書く
// - 書き出しの種類（transfers / flagged / all）に無いものは「取引データ」として全件を
//   出していた。知らない種類は弾く

import ExcelJS from 'exceljs';
import type { PrismaClient } from '@prisma/client';
import { filterTransactions, monthlyCashflow, parseAmountInput, type TransactionFilter } from '../lib/aggregate.js';
import { sortCategories } from '../lib/categories.js';
import { warekiMonthShort, warekiShort } from '../lib/dates.js';
import { exportFileName } from '../lib/exportFileName.js';
import { toDateString, toId } from '../json.js';
import { getAppSettings } from './settings.js';

// ---------------------------------------------------------------------------
// 読み出し
// ---------------------------------------------------------------------------

export type ExportRow = {
  id: number;
  accountId: number | null;
  date: string | null;
  bankName: string | null;
  branchName: string | null;
  accountType: string | null;
  accountNumber: string | null;
  description: string | null;
  amountOut: number;
  amountIn: number;
  balance: number | null;
  category: string;
  memo: string | null;
  isFlagged: boolean;
  isTransfer: boolean;
};

// 案件の取引を日付 → id の順で（日付の無いものは最後）
async function loadRows(db: PrismaClient, caseId: bigint): Promise<ExportRow[]> {
  const rows = await db.transaction.findMany({
    where: { caseId },
    include: { account: true },
    orderBy: [{ date: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
  });
  return rows.map((t) => ({
    id: toId(t.id),
    accountId: t.accountId === null ? null : toId(t.accountId),
    date: toDateString(t.date),
    bankName: t.account?.bankName ?? null,
    branchName: t.account?.branchName ?? null,
    accountType: t.account?.accountType ?? null,
    accountNumber: t.account?.accountNumber ?? null,
    description: t.description,
    amountOut: t.amountOut,
    amountIn: t.amountIn,
    balance: t.balance,
    category: t.category,
    memo: t.memo,
    isFlagged: t.isFlagged,
    isTransfer: t.isTransfer,
  }));
}

async function caseName(db: PrismaClient, caseId: bigint): Promise<string> {
  const c = await db.case.findUniqueOrThrow({ where: { id: caseId }, select: { name: true } });
  return c.name;
}

// ---------------------------------------------------------------------------
// 列（Django 版 handlers/transaction.py の FIELD_LABELS の順）
// ---------------------------------------------------------------------------

type Column = { label: string; value: (r: ExportRow) => string | number | null; amount?: boolean };

const COLUMNS = {
  date: { label: '日付', value: (r) => warekiShort(r.date) },
  bankName: { label: '銀行名', value: (r) => r.bankName },
  branchName: { label: '支店名', value: (r) => r.branchName },
  accountType: { label: '種別', value: (r) => r.accountType },
  accountNumber: { label: '口座番号', value: (r) => r.accountNumber },
  description: { label: '摘要', value: (r) => r.description },
  amountOut: { label: '払戻', value: (r) => r.amountOut, amount: true },
  amountIn: { label: 'お預り', value: (r) => r.amountIn, amount: true },
  balance: { label: '残高', value: (r) => r.balance, amount: true },
  category: { label: '分類', value: (r) => r.category },
  memo: { label: 'メモ', value: (r) => r.memo },
} satisfies Record<string, Column>;

function columns({ memo = false, balance = true } = {}): Column[] {
  const { memo: memoColumn, balance: balanceColumn, ...rest } = COLUMNS;
  const list: Column[] = Object.values(rest);
  if (balance) list.splice(list.indexOf(COLUMNS.amountIn) + 1, 0, balanceColumn);
  if (memo) list.push(memoColumn);
  return list;
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

export type ExportFile = { filename: string; contentType: string; body: Uint8Array<ArrayBuffer> | string };

export type ExportResult = { ok: true; file: ExportFile } | { ok: false; error: string };

export const NO_DATA = 'エクスポートするデータがありません。';
export const NO_MATCH = '該当するデータがありません。';

// 区切り・引用符・改行を含む欄だけ引用符で囲む（pandas の to_csv と同じ）
function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Excel が文字化けせずに開けるよう BOM 付きの UTF-8 にする
function buildCsv(rows: readonly ExportRow[], cols: readonly Column[], filename: string): ExportFile {
  const lines = [cols.map((c) => csvCell(c.label)), ...rows.map((r) => cols.map((c) => csvCell(c.value(r))))];
  return {
    filename,
    contentType: 'text/csv; charset=utf-8',
    body: `﻿${lines.map((l) => l.join(',')).join('\r\n')}\r\n`,
  };
}

export const CSV_TYPES = {
  transfers: { suffix: '資金移動', select: (r: ExportRow) => r.isTransfer, memo: false },
  flagged: { suffix: '付箋付き取引', select: (r: ExportRow) => r.isFlagged, memo: true },
  all: { suffix: '全取引', select: () => true, memo: false },
} as const;

export type CsvType = keyof typeof CSV_TYPES;
export const isCsvType = (value: string): value is CsvType => Object.hasOwn(CSV_TYPES, value);

export async function exportCsv(db: PrismaClient, caseId: bigint, type: CsvType): Promise<ExportResult> {
  const all = await loadRows(db, caseId);
  if (all.length === 0) return { ok: false, error: NO_DATA };
  const spec = CSV_TYPES[type];
  const rows = all.filter(spec.select);
  if (rows.length === 0) return { ok: false, error: NO_MATCH };
  const filename = exportFileName([await caseName(db, caseId), spec.suffix], 'csv');
  return { ok: true, file: buildCsv(rows, columns({ memo: spec.memo }), filename) };
}

// 絞り込み条件をファイル名に残す（Django 版の build_filtered_filename）。条件が無ければ「全取引」
export function filteredSubject(f: TransactionFilter): string {
  const parts: string[] = [];
  const head = (values: readonly string[] | undefined) => (values ?? []).slice(0, 2).join('-');
  if (f.bank?.length) parts.push(`銀行_${head(f.bank)}`);
  if (f.account?.length) parts.push(`口座_${head(f.account)}`);
  if (f.category?.length) parts.push(`分類${f.categoryMode === 'exclude' ? '除外' : ''}_${head(f.category)}`);
  if (f.keyword) parts.push(`検索_${[...f.keyword].slice(0, 10).join('')}`);
  if (f.dateFrom || f.dateTo) parts.push(`期間_${f.dateFrom ?? ''}〜${f.dateTo ?? ''}`);
  if (f.amountType === 'out' || f.amountType === 'in') parts.push(f.amountType === 'out' ? '出金' : '入金');
  // 0 円は「条件なし」と同じ扱い（Django 版と同じ）
  const min = parseAmountInput(f.amountMin) || null;
  const max = parseAmountInput(f.amountMax) || null;
  if (min && max) parts.push(`${min}〜${max}円`);
  else if (min) parts.push(`${min}円以上`);
  else if (max) parts.push(`${max}円以下`);
  return parts.length ? `絞込 ${parts.join('-')}` : '全取引';
}

export async function exportFilteredCsv(db: PrismaClient, caseId: bigint, filter: TransactionFilter): Promise<ExportResult> {
  const rows = filterTransactions(await loadRows(db, caseId), filter);
  if (rows.length === 0) return { ok: false, error: NO_DATA };
  const filename = exportFileName([await caseName(db, caseId), filteredSubject(filter)], 'csv');
  return { ok: true, file: buildCsv(rows, columns({ memo: true }), filename) };
}

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const AMOUNT_FORMAT = '#,##0';

// A4 縦・横幅を1ページに収める（縦は何ページでも）
const A4_FIT_WIDTH: Partial<ExcelJS.PageSetup> = {
  paperSize: 9,
  orientation: 'portrait',
  fitToPage: true,
  fitToWidth: 1,
  fitToHeight: 0,
};

const FULLWIDTH_FOR: Record<string, string> = { '\\': '＼', '/': '／', '?': '？', '*': '＊', ':': '：', '[': '［', ']': '］' };

// Excel のシート名の決まり: 31文字まで・`\ / ? * : [ ]` は使えない・前後に `'` を置けない・
// 大文字小文字を区別せず重複できない・`History` は予約語
export function sheetName(name: string, used: Set<string>): string {
  const base = [...name.replace(/[\\/?*:[\]]/g, (ch) => FULLWIDTH_FOR[ch]!).replace(/^'+|'+$/g, '')].join('') || '無題';
  const fit = (s: string, suffix = '') => [...s].slice(0, 31 - suffix.length).join('') + suffix;
  let candidate = fit(base);
  for (let i = 2; used.has(candidate.toLowerCase()); i++) candidate = fit(base, `(${i})`);
  used.add(candidate.toLowerCase());
  return candidate;
}

// 多額取引のシート名。万で割り切れれば「50万円以上」、でなければ「15,000円以上」
export function largeAmountLabel(threshold: number): string {
  return threshold > 0 && threshold % 10000 === 0
    ? `${threshold / 10000}万円以上`
    : `${threshold.toLocaleString('ja-JP')}円以上`;
}

function addTransactionSheet(
  wb: ExcelJS.Workbook,
  used: Set<string>,
  title: string,
  rows: readonly ExportRow[],
  cols: readonly Column[],
  tabColor?: string,
) {
  const ws = wb.addWorksheet(sheetName(title, used), {
    pageSetup: A4_FIT_WIDTH,
    ...(tabColor ? { properties: { tabColor: { argb: `FF${tabColor}` } } } : {}),
  });
  ws.addRow(cols.map((c) => c.label));
  for (const r of rows) ws.addRow(cols.map((c) => c.value(r)));
  cols.forEach((c, i) => {
    if (!c.amount) return;
    ws.getColumn(i + 1).eachCell((cell, rowNumber) => {
      if (rowNumber > 1) cell.numFmt = AMOUNT_FORMAT;
    });
  });
}

export async function xlsxFile(wb: ExcelJS.Workbook, filename: string): Promise<ExportFile> {
  return { filename, contentType: XLSX_TYPE, body: new Uint8Array(await wb.xlsx.writeBuffer()) };
}

// 分類ごとに1シート → 多額取引 → 付箋付き。残高の列は入れない
export async function exportCategoryXlsx(db: PrismaClient, caseId: bigint): Promise<ExportResult> {
  const rows = await loadRows(db, caseId);
  if (rows.length === 0) return { ok: false, error: NO_DATA };
  const { largeAmountThreshold: threshold } = await getAppSettings(db);

  const wb = new ExcelJS.Workbook();
  const used = new Set(['history']);
  const cols = columns({ balance: false });
  for (const category of sortCategories(rows.map((r) => r.category))) {
    addTransactionSheet(wb, used, category, rows.filter((r) => r.category === category), cols);
  }
  const large = rows.filter((r) => r.amountOut >= threshold || r.amountIn >= threshold);
  if (large.length) addTransactionSheet(wb, used, largeAmountLabel(threshold), large, cols, 'DC3545');
  const flagged = rows.filter((r) => r.isFlagged);
  if (flagged.length) addTransactionSheet(wb, used, '付箋付き', flagged, columns({ memo: true, balance: false }), 'FF8C00');

  return { ok: true, file: await xlsxFile(wb, exportFileName([await caseName(db, caseId), '分類別取引'], 'xlsx')) };
}

const FONT = '游ゴシック';
const SLATE_900 = 'FF0F172A';

// 月ごとの出金・入金の表（相続開始日のある案件はその月から後を入れない）。取引が無くても見出しだけ出す
export async function exportMonthlyXlsx(db: PrismaClient, caseId: bigint): Promise<ExportFile> {
  const c = await db.case.findUniqueOrThrow({ where: { id: caseId }, select: { name: true, referenceDate: true } });
  const referenceDate = toDateString(c.referenceDate);
  const months = monthlyCashflow(await loadRows(db, caseId), referenceDate);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('月次入出金', {
    pageSetup: A4_FIT_WIDTH,
    views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
  });
  ws.columns = [{ width: 14 }, { width: 18 }, { width: 18 }];

  ws.mergeCells('A1:C1');
  const title = ws.getCell('A1');
  title.value = '月次入出金';
  title.font = { name: FONT, size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  title.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(1).height = 28;

  const info: [string, string][] = [
    ['お客様名', c.name],
    ['表示条件', referenceDate ? `相続開始月（${warekiMonthShort(referenceDate)}）以降を除外` : '全期間'],
  ];
  info.forEach(([label, value], i) => {
    const row = ws.getRow(i + 2);
    row.getCell(1).value = label;
    row.getCell(1).font = { name: FONT, bold: true, color: { argb: 'FF475569' } };
    row.getCell(2).value = value;
    row.getCell(2).font = { name: FONT, color: { argb: SLATE_900 } };
  });

  const HEADER_ROW = 5;
  const header = ws.getRow(HEADER_ROW);
  header.values = ['月', '出金', '入金'];
  header.eachCell((cell) => {
    cell.font = { name: FONT, bold: true, color: { argb: SLATE_900 } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF94A3B8' } } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  months.forEach((m, i) => {
    const row = ws.getRow(HEADER_ROW + 1 + i);
    row.values = [warekiMonthShort(m.month), m.totalOut, m.totalIn];
    for (const col of [2, 3]) {
      row.getCell(col).numFmt = AMOUNT_FORMAT;
      row.getCell(col).alignment = { horizontal: 'right' };
    }
  });
  if (months.length) ws.autoFilter = `A${HEADER_ROW}:C${HEADER_ROW + months.length}`;

  return xlsxFile(wb, exportFileName([c.name, '月次入出金'], 'xlsx'));
}
