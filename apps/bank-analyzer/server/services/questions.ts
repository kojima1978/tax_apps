// 「お客様への確認事項」── 質問候補（付箋）のうち質問メモのある取引を、お客様へ渡す書面にする。
// 決めごと（どの行を出すか・口座番号の出し方・下書きの文）は lib/questions.ts。
//
// - 画面の書面と Excel は同じ questionSheet から作る（片方だけ行や並びが違う、を作らない）
// - 並びと絞り込みは質問候補タブと同じ（exports.ts の flaggedRows）
// - 下書きは文を返すだけ。保存するのは applyMemoDrafts（画面の「下書きを入れる」）だけで、
//   メモがすでに書いてある取引には当てない

import ExcelJS from 'exceljs';
import type { PrismaClient } from '@prisma/client';
import { transferPairs, type TransactionFilter } from '../lib/aggregate.js';
import { warekiFull } from '../lib/dates.js';
import { exportFileName } from '../lib/exportFileName.js';
import {
  QUESTION_SHEET_COLUMNS,
  QUESTION_SHEET_INTRO,
  QUESTION_SHEET_TITLE,
  draftQuestion,
  hasQuestion,
  questionAccountLines,
  questionDate,
  type DraftContext,
} from '../lib/questions.js';
import { toDateString, toId } from '../json.js';
import { flaggedRows, loadRows, xlsxFile, type ExportFile, type ExportRow } from './exports.js';
import { getAppSettings, getQuestionTemplates } from './settings.js';

// ---------------------------------------------------------------------------
// 下書き
// ---------------------------------------------------------------------------

// 案件の全取引から、下書きを決めるのに要るもの（資金移動の組・基準日・定型文）をそろえる
export async function draftContext(db: PrismaClient, all: readonly ExportRow[], referenceDate: string | null): Promise<DraftContext> {
  const [settings, templates] = await Promise.all([getAppSettings(db), getQuestionTemplates(db)]);
  const pairedIds = new Set(transferPairs(all, settings).flatMap((p) => [p.source.id, p.destination.id]));
  return { templates, referenceDate, pairedIds };
}

// 「下書きを入れる」。渡された取引のうち、付箋付きでメモが空のものにだけ下書きを保存する。
// 画面を開いた後にほかの人がメモを書いていても上書きしない（更新の条件に入れてある）
export async function applyMemoDrafts(db: PrismaClient, caseId: bigint, ids: readonly bigint[]): Promise<number> {
  const c = await db.case.findUniqueOrThrow({ where: { id: caseId }, select: { referenceDate: true } });
  const all = await loadRows(db, caseId);
  const ctx = await draftContext(db, all, toDateString(c.referenceDate));
  const wanted = new Set(ids.map(toId));
  const targets = all.filter((r) => wanted.has(r.id) && r.isFlagged && !hasQuestion(r.memo));

  let saved = 0;
  await db.$transaction(async (tx) => {
    for (const r of targets) {
      const { count } = await tx.transaction.updateMany({
        where: { id: BigInt(r.id), caseId, isFlagged: true, OR: [{ memo: null }, { memo: '' }] },
        data: { memo: draftQuestion(r, ctx) },
      });
      saved += count;
    }
  });
  return saved;
}

// ---------------------------------------------------------------------------
// 書面
// ---------------------------------------------------------------------------

export type QuestionSheetRow = {
  no: number;
  id: number;
  date: string;
  accountLines: string[];
  description: string;
  amountOut: number;
  amountIn: number;
  question: string;
};

export type QuestionSheet = {
  case: { id: number; name: string };
  // 作成日（和暦）
  createdOn: string;
  rows: QuestionSheetRow[];
  // 絞り込みに合う質問候補のうち、メモが空で書面に出さなかった件数
  skippedCount: number;
};

const todayInJapan = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());

export async function questionSheet(db: PrismaClient, caseId: bigint, filter: TransactionFilter = {}): Promise<QuestionSheet> {
  const [c, all] = await Promise.all([
    db.case.findUniqueOrThrow({ where: { id: caseId }, select: { name: true } }),
    loadRows(db, caseId),
  ]);
  const flagged = flaggedRows(all, filter);
  const asked = flagged.filter((r) => hasQuestion(r.memo));
  return {
    case: { id: toId(caseId), name: c.name },
    createdOn: warekiFull(todayInJapan()),
    rows: asked.map((r, i) => ({
      no: i + 1,
      id: r.id,
      date: questionDate(r.date),
      accountLines: questionAccountLines(r),
      description: (r.description ?? '').trim(),
      amountOut: r.amountOut,
      amountIn: r.amountIn,
      question: r.memo!.trim(),
    })),
    skippedCount: flagged.length - asked.length,
  };
}

// ---------------------------------------------------------------------------
// Excel（メールで送り、回答を書き込んでもらう）
// ---------------------------------------------------------------------------

export const NO_QUESTIONS = '書面に出す質問がありません。質問候補のメモに質問を書いてください。';

const FONT = '游ゴシック';
const BLACK = { argb: 'FF000000' };
const THIN = { style: 'thin', color: BLACK } as const;
const BOX = { top: THIN, bottom: THIN, left: THIN, right: THIN };
// 見出しの薄い網掛け（帳票の共通ルールで可としている範囲）
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } } as const;
const AMOUNT_FORMAT = '#,##0';
// 列の幅（文字数）。番号・日付・口座・摘要・出金・入金・質問・回答
const WIDTHS = [5, 16, 20, 20, 13, 13, 36, 36];
const HEADER_ROW = 6;
// 回答を書き込める高さ（ポイント。およそ 19mm）
const ANSWER_ROW_HEIGHT = 54;
// 1行に入る全角文字数の目安（質問が長いときに行を高くする）
const QUESTION_CHARS_PER_LINE = 17;
const LINE_HEIGHT = 15;

const LAST_COL = String.fromCharCode(64 + WIDTHS.length);

export type QuestionSheetResult = { ok: true; file: ExportFile } | { ok: false; error: string };

export async function exportQuestionsXlsx(
  db: PrismaClient,
  caseId: bigint,
  filter: TransactionFilter = {},
  firmName = '',
): Promise<QuestionSheetResult> {
  const sheet = await questionSheet(db, caseId, filter);
  if (sheet.rows.length === 0) return { ok: false, error: NO_QUESTIONS };

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('確認事項', {
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      // 2ページ目からも表の見出しを刷る
      printTitlesRow: `${HEADER_ROW}:${HEADER_ROW}`,
    },
    headerFooter: { oddFooter: '&C&P / &N' },
    views: [{ state: 'frozen', ySplit: HEADER_ROW, showGridLines: false }],
  });
  ws.columns = WIDTHS.map((width) => ({ width }));

  const text = (ref: string, value: string, font: Partial<ExcelJS.Font> = {}, alignment: Partial<ExcelJS.Alignment> = {}) => {
    const cell = ws.getCell(ref);
    cell.value = value;
    cell.font = { name: FONT, size: 11, color: BLACK, ...font };
    cell.alignment = { vertical: 'middle', ...alignment };
  };

  ws.mergeCells(`A1:${LAST_COL}1`);
  text('A1', QUESTION_SHEET_TITLE, { size: 16, bold: true }, { horizontal: 'center' });
  ws.getRow(1).height = 30;

  ws.mergeCells('A2:D2');
  text('A2', `${sheet.case.name} 様`, { size: 12, bold: true });
  ws.mergeCells(`G2:${LAST_COL}2`);
  text('G2', sheet.createdOn, {}, { horizontal: 'right' });
  ws.mergeCells(`G3:${LAST_COL}3`);
  text('G3', firmName.trim(), {}, { horizontal: 'right' });

  ws.mergeCells(`A4:${LAST_COL}4`);
  text('A4', QUESTION_SHEET_INTRO, {}, { wrapText: true });
  ws.getRow(4).height = 32;

  const header = ws.getRow(HEADER_ROW);
  header.values = [...QUESTION_SHEET_COLUMNS];
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { name: FONT, size: 10, bold: true, color: BLACK };
    cell.fill = HEADER_FILL;
    cell.border = BOX;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  sheet.rows.forEach((r, i) => {
    const row = ws.getRow(HEADER_ROW + 1 + i);
    // 金額の無い側は 0 ではなく空欄（出金の行の入金欄に「0」と刷らない）
    row.values = [r.no, r.date, r.accountLines.join('\n'), r.description, r.amountOut || null, r.amountIn || null, r.question, null];
    const lines = r.question.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil([...line].length / QUESTION_CHARS_PER_LINE)), 0);
    row.height = Math.max(ANSWER_ROW_HEIGHT, lines * LINE_HEIGHT + 8);
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      if (col > WIDTHS.length) return;
      cell.font = { name: FONT, size: 10, color: BLACK };
      cell.border = BOX;
      const amount = col === 5 || col === 6;
      if (amount) cell.numFmt = AMOUNT_FORMAT;
      cell.alignment = {
        vertical: 'top',
        wrapText: !amount,
        horizontal: amount ? 'right' : col === 1 ? 'center' : 'left',
      };
    });
  });

  return { ok: true, file: await xlsxFile(wb, exportFileName([sheet.case.name, QUESTION_SHEET_TITLE], 'xlsx')) };
}
