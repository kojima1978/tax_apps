import ExcelJS from 'exceljs';
import type { Prisma, PrismaClient } from '@prisma/client';
import { IMPORT_COLUMNS } from '../lib/import/columns.js';
import { exportFileName } from '../lib/exportFileName.js';
import type { ExportFile } from './exports.js';

export type AiPromptKind = 'ocr' | 'classification';
const KEYS: Record<AiPromptKind, string> = {
  ocr: 'OCR_PROMPT_HISTORY',
  classification: 'CLASSIFICATION_PROMPT_HISTORY',
};
const MAX_RULES = 20_000;
const MAX_NOTE = 1_000;

export type OcrPromptVersion = { version: number; rules: string; note: string; createdAt: string | null };
export type OcrPromptHistory = { currentVersion: number; versions: OcrPromptVersion[] };

const initial = (): OcrPromptHistory => ({ currentVersion: 1, versions: [{ version: 1, rules: '', note: '初期版', createdAt: null }] });

function parse(value: unknown): OcrPromptHistory {
  if (!value || typeof value !== 'object' || !('versions' in value) || !Array.isArray(value.versions)) return initial();
  const versions = value.versions.flatMap((v): OcrPromptVersion[] => {
    if (!v || typeof v !== 'object') return [];
    const row = v as Record<string, unknown>;
    return typeof row.version === 'number' && Number.isInteger(row.version) && typeof row.rules === 'string'
      ? [{ version: row.version, rules: row.rules, note: typeof row.note === 'string' ? row.note : '', createdAt: typeof row.createdAt === 'string' ? row.createdAt : null }]
      : [];
  });
  if (!versions.length) return initial();
  versions.sort((a, b) => a.version - b.version);
  const current = (value as Record<string, unknown>).currentVersion;
  const currentVersion = typeof current === 'number' && versions.some((v) => v.version === current) ? current : versions.at(-1)!.version;
  return { currentVersion, versions };
}

export async function getAiPromptHistory(db: PrismaClient, kind: AiPromptKind): Promise<OcrPromptHistory> {
  return parse((await db.appSetting.findUnique({ where: { key: KEYS[kind] }, select: { value: true } }))?.value);
}

export async function saveAiPromptVersion(db: PrismaClient, kind: AiPromptKind, rules: string, note: string): Promise<OcrPromptHistory> {
  const key = KEYS[kind];
  const clean = rules.trim();
  if (!clean) throw new Error('次回から追加するルールを入力してください。');
  if (clean.length > MAX_RULES) throw new Error('追加ルールは20,000文字以内にしてください。');
  if (note.trim().length > MAX_NOTE) throw new Error('改善内容は1,000文字以内にしてください。');
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`analyzer_appsetting:${key}`}))`;
    const history = parse((await tx.appSetting.findUnique({ where: { key }, select: { value: true } }))?.value);
    const version = Math.max(...history.versions.map((v) => v.version)) + 1;
    const next: OcrPromptHistory = {
      currentVersion: version,
      versions: [...history.versions, { version, rules: clean, note: note.trim(), createdAt: new Date().toISOString() }],
    };
    await tx.appSetting.upsert({ where: { key }, create: { key, value: next as unknown as Prisma.InputJsonValue }, update: { value: next as unknown as Prisma.InputJsonValue } });
    return next;
  });
}

export const getOcrPromptHistory = (db: PrismaClient) => getAiPromptHistory(db, 'ocr');
export const saveOcrPromptVersion = (db: PrismaClient, rules: string, note: string) => saveAiPromptVersion(db, 'ocr', rules, note);

export function currentOcrPrompt(history: OcrPromptHistory): OcrPromptVersion {
  return history.versions.find((v) => v.version === history.currentVersion) ?? history.versions.at(-1)!;
}

export async function ocrExcelTemplate(categories: readonly string[]): Promise<ExportFile> {
  const wb = new ExcelJS.Workbook();
  wb.creator = '相続税通帳分析システム';
  const ws = wb.addWorksheet('取引データ', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = IMPORT_COLUMNS.map((c) => ({ header: c.name, key: c.key, width: c.key === 'description' || c.key === 'memo' ? 30 : c.key === 'account_number' ? 16 : 14 }));
  const head = ws.getRow(1);
  head.height = 28;
  head.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  ws.autoFilter = { from: 'A1', to: `${ws.getColumn(ws.columnCount).letter}1` };

  const checks = wb.addWorksheet('検査結果');
  checks.columns = [
    { header: 'PDFページ', width: 12 }, { header: '取引データ行', width: 14 }, { header: '確認項目', width: 22 },
    { header: '内容', width: 60 }, { header: '画像の再確認結果', width: 60 },
  ];
  checks.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  });
  checks.views = [{ state: 'frozen', ySplit: 1 }];

  const next = wb.addWorksheet('次回依頼文案');
  next.columns = [{ header: '項目', width: 24 }, { header: '内容', width: 110 }];
  next.addRow(['追加ルール案', '']);
  next.addRow(['今回迷った点', '']);
  next.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  });
  next.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
  next.getRow(2).height = 180;
  next.getRow(3).height = 100;

  const guide = wb.addWorksheet('使い方');
  guide.columns = [{ width: 24 }, { width: 100 }];
  guide.addRows([
    ['目的', '通帳PDFをGoogle Workspace版Geminiで文字認識し、アプリへ取り込むためのひな形です。'],
    ['手順1', 'アプリで「Gemini用の依頼文」をコピーします。'],
    ['手順2', 'Geminiへ通帳PDF、このExcel、依頼文を渡します。'],
    ['手順3', 'Geminiが返したExcelを、アプリの取込画面へドラッグ＆ドロップします。'],
    ['注意', '読めない箇所は推測させず、メモと要確認に残します。検査結果と次回依頼文案のシートも確認してください。'],
    ['使用できる分類', categories.join('、')],
  ]);
  guide.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
  guide.getColumn(1).font = { bold: true };
  const bytes = new Uint8Array(await wb.xlsx.writeBuffer());
  return { filename: exportFileName('Gemini文字認識ひな形', 'xlsx'), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: bytes };
}
