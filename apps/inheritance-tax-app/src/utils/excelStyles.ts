import { COMPANY_INFO } from '../constants';
import { formatCurrency, formatDelta } from './formatters';

/**
 * Excel スタイル定数（ExcelExport / CalculatorExcelExport 共通）
 */
export const solidFill = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });

export const FILLS = {
  mainHeader: solidFill('FF16A34A'),
  subHeader: solidFill('FF22C55E'),
  highlight: solidFill('FFFEF3C7'),
  alternate: solidFill('FFF0FDF4'),
  totalRow: solidFill('FFF0FDF4'),
};

export const GREEN_BORDER = { style: 'medium' as const, color: { argb: 'FF16A34A' } };
export const THIN_BORDER = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } };
export const ALL_THIN_BORDERS = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };
export const ALL_GREEN_BORDERS = { top: GREEN_BORDER, left: GREEN_BORDER, bottom: GREEN_BORDER, right: GREEN_BORDER };

/**
 * メインヘッダーセルのスタイルを適用（白太字12pt + 緑背景 + 緑ボーダー + 中央揃え）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyMainHeaderStyle(cell: any) {
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  cell.fill = FILLS.mainHeader;
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border = ALL_GREEN_BORDERS;
}

/**
 * Excel ワークブック共通セットアップ（タイトル行 + 企業情報行 + 空行 + フッター）
 */
interface WorkbookSetupConfig {
  ExcelJS: typeof import('exceljs');
  sheetName: string;
  title: string;
  colCount: number;
  pageSetup: {
    paperSize: number;
    orientation: 'portrait' | 'landscape';
  };
  staffInfo?: { name: string; phone: string };
}

export function setupExcelWorkbook({ ExcelJS, sheetName, title, colCount, pageSetup, staffInfo }: WorkbookSetupConfig) {
  const staffPart = staffInfo && (staffInfo.name || staffInfo.phone)
    ? `　${staffInfo.name ? `担当: ${staffInfo.name}` : ''}${staffInfo.name && staffInfo.phone ? '　' : ''}${staffInfo.phone ? `TEL: ${staffInfo.phone}` : ''}`
    : '';
  const COMPANY_FULL = `${COMPANY_INFO.name}　${COMPANY_INFO.postalCode} ${COMPANY_INFO.address}　TEL: ${COMPANY_INFO.phone}${staffPart}`;
  const COMPANY_FOOTER = `${COMPANY_INFO.name}　TEL: ${COMPANY_INFO.phone}`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_INFO.name;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName, {
    pageSetup: {
      ...pageSetup,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // タイトル行
  worksheet.mergeCells(1, 1, 1, colCount);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { size: 18, bold: true, color: { argb: 'FF16A34A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 30;

  // 企業情報行
  worksheet.mergeCells(2, 1, 2, colCount);
  const companyCell = worksheet.getCell('A2');
  companyCell.value = COMPANY_FULL;
  companyCell.font = { size: 10, color: { argb: 'FF666666' } };
  companyCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(2).height = 20;

  // 空行
  worksheet.addRow([]);

  // フッター
  worksheet.headerFooter.oddFooter = `&C${COMPANY_FOOTER}`;

  return { workbook, worksheet };
}

/**
 * セクションヘッダー行を追加（結合 + メインヘッダースタイル）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function addSectionHeader(worksheet: any, colCount: number, title: string) {
  const rowNum = worksheet.rowCount + 1;
  worksheet.mergeCells(rowNum, 1, rowNum, colCount);
  const cell = worksheet.getCell(`A${rowNum}`);
  cell.value = title;
  applyMainHeaderStyle(cell);
  worksheet.getRow(rowNum).height = 25;
}

/**
 * ラベル + 値の行を追加（2列ラベル + 残り値）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function addLabelValueRow(worksheet: any, colCount: number, label: string, value: string) {
  const row = worksheet.addRow([]);
  worksheet.mergeCells(row.number, 1, row.number, 2);
  worksheet.mergeCells(row.number, 3, row.number, colCount);
  const lCell = worksheet.getCell(`A${row.number}`);
  lCell.value = label;
  lCell.font = { bold: true, size: 11 };
  lCell.fill = solidFill('FFF3F4F6');
  lCell.border = ALL_THIN_BORDERS;
  lCell.alignment = { vertical: 'middle' };
  worksheet.getCell(`B${row.number}`).border = ALL_THIN_BORDERS;
  const vCell = worksheet.getCell(`C${row.number}`);
  vCell.value = value;
  vCell.font = { size: 11 };
  vCell.border = ALL_THIN_BORDERS;
  vCell.alignment = { vertical: 'middle', horizontal: 'right' };
  for (let c = 4; c <= colCount; c++) {
    worksheet.getCell(row.number, c).border = ALL_THIN_BORDERS;
  }
}

/**
 * 比較テーブルのヘッダー行スタイル（白太字 + subHeader fill + center + green borders）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyTableHeaderStyle(row: any, height = 24) {
  row.eachCell((cell: any) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = FILLS.subHeader;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = ALL_GREEN_BORDERS;
  });
  row.height = height;
}

/**
 * 結果ハイライト行（節税効果・財産額の増減）を追加
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function addHighlightRows(worksheet: any, colCount: number, rows: [string, string][]) {
  rows.forEach(([label, value]) => {
    const row = worksheet.addRow([label, ...Array(colCount - 2).fill(''), value]);
    row.eachCell((cell: any) => {
      cell.font = { bold: true, size: 12, color: { argb: 'FF166534' } };
      cell.fill = FILLS.highlight;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = ALL_GREEN_BORDERS;
    });
    row.height = 28;
  });
}

/**
 * シナリオ比較テーブル行データ
 */
export interface CompRow {
  label: string;
  cur: number;
  prop: number;
  highlight?: boolean;
  sectionEnd?: boolean;
  valuePrefix?: string;
}

/**
 * シナリオ比較テーブルを追加（ヘッダー + データ行 + ハイライト + 列幅）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function addComparisonTable(
  worksheet: any,
  colCount: number,
  compData: CompRow[],
  highlightRows: [string, string][],
  columnWidths: number[],
) {
  const compHeaders = ['項目', '現状', '提案', '差額（Δ）'];
  const compHeaderRow = worksheet.addRow(compHeaders);
  applyTableHeaderStyle(compHeaderRow);

  const SECTION_BORDER = { style: 'medium' as const, color: { argb: 'FF9CA3AF' } };
  const fmtWithPrefix = (v: number, pfx?: string) => v > 0 && pfx ? `${pfx}${formatCurrency(v)}` : formatCurrency(v);

  compData.forEach(({ label, cur, prop, highlight, sectionEnd, valuePrefix }) => {
    const diff = prop - cur;
    const fmtDiff = diff !== 0 ? (valuePrefix ? `${valuePrefix}${formatCurrency(Math.abs(diff))}` : formatDelta(diff)) : '—';
    const row = worksheet.addRow([label, fmtWithPrefix(cur, valuePrefix), fmtWithPrefix(prop, valuePrefix), fmtDiff]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    row.eachCell((cell: any, colNumber: number) => {
      cell.font = { size: 10, bold: colNumber === 1 || highlight || false };
      cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'right' };
      cell.border = sectionEnd
        ? { ...ALL_THIN_BORDERS, bottom: SECTION_BORDER }
        : ALL_THIN_BORDERS;
      if (highlight) cell.fill = FILLS.highlight;
    });
  });

  addHighlightRows(worksheet, colCount, highlightRows);
  worksheet.addRow([]);
  worksheet.columns = columnWidths.map(w => ({ width: w }));
}

/**
 * 相続人別 納税後比較セクションを追加（シート3共通）
 */
interface HeirComparisonConfig {
  heirCount: number;
  getLabel: (i: number) => string;
  getCurrentNet: (i: number) => number;
  getProposedNet: (i: number) => number;
  totalCurrentNet: number;
  totalProposedNet: number;
  totalDiff: number;
  formatCurrency: (v: number) => string;
  formatDelta: (v: number) => string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function addHeirComparisonSection(sheet: any, sheetColCount: number, config: HeirComparisonConfig) {
  const { heirCount, getLabel, getCurrentNet, getProposedNet, totalCurrentNet, totalProposedNet, totalDiff, formatCurrency: fmtCur, formatDelta: fmtDelta } = config;

  // セクションヘッダー
  const secRowNum = sheet.rowCount + 1;
  sheet.mergeCells(secRowNum, 1, secRowNum, sheetColCount);
  const secCell = sheet.getCell(`A${secRowNum}`);
  secCell.value = '相続人別 納税後比較';
  secCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  secCell.fill = solidFill('FF166534');
  secCell.alignment = { vertical: 'middle', horizontal: 'left' };
  secCell.border = ALL_GREEN_BORDERS;
  sheet.getRow(secRowNum).height = 24;

  // カラムヘッダー
  const compHdr = sheet.addRow(['相続人', '現状 納税後', '提案 納税後', '差額（Δ）']);
  compHdr.eachCell((cell: any) => {
    cell.font = { bold: true, size: 10 };
    cell.fill = solidFill('FFF3F4F6');
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = ALL_THIN_BORDERS;
  });

  // 各相続人行
  for (let i = 0; i < heirCount; i++) {
    const label = getLabel(i);
    const currentNet = getCurrentNet(i);
    const proposedNet = getProposedNet(i);
    const diff = proposedNet - currentNet;
    const row = sheet.addRow([label, fmtCur(currentNet), fmtCur(proposedNet), diff !== 0 ? fmtDelta(diff) : '—']);
    row.eachCell((cell: any, col: number) => {
      cell.font = { size: 10, bold: col === 4 };
      cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'right' };
      cell.border = ALL_THIN_BORDERS;
    });
  }

  // 合計行
  const compTotalRow = sheet.addRow(['合計', fmtCur(totalCurrentNet), fmtCur(totalProposedNet), fmtDelta(totalDiff)]);
  compTotalRow.eachCell((cell: any, col: number) => {
    cell.font = { bold: true, size: 10 };
    cell.fill = FILLS.highlight;
    cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'right' };
    cell.border = ALL_THIN_BORDERS;
  });
}

/**
 * 相続人別シナリオ内訳シートのシナリオ設定
 */
export interface HeirScenarioConfig {
  label: string;
  summaryText: string;
  columnHeaders: string[];
  heirCount: number;
  getRowData: (i: number) => string[];
  getTotalRow: () => string[];
}

/**
 * 相続人別シナリオ内訳シートを追加（タイトル + シナリオ×2 + 比較セクション + 列幅）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function addHeirScenarioSheet(
  workbook: any,
  title: string,
  colCount: number,
  scenarios: HeirScenarioConfig[],
  comparisonConfig: HeirComparisonConfig,
  columnWidths: number[],
) {
  const sheet = workbook.addWorksheet('相続人別内訳', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  // タイトル行
  sheet.mergeCells(1, 1, 1, colCount);
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { size: 18, bold: true, color: { argb: 'FF16A34A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 30;
  sheet.addRow([]);

  // シナリオ別セクション
  scenarios.forEach(({ label, summaryText, columnHeaders, heirCount, getRowData, getTotalRow }) => {
    // セクションヘッダー
    const secRowNum = sheet.rowCount + 1;
    sheet.mergeCells(secRowNum, 1, secRowNum, colCount);
    const secCell = sheet.getCell(`A${secRowNum}`);
    secCell.value = `${label}（${summaryText}）`;
    secCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    secCell.fill = FILLS.mainHeader;
    secCell.alignment = { vertical: 'middle', horizontal: 'left' };
    secCell.border = ALL_GREEN_BORDERS;
    sheet.getRow(secRowNum).height = 24;

    // カラムヘッダー
    const hdr = sheet.addRow(columnHeaders);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hdr.eachCell((cell: any) => {
      cell.font = { bold: true, size: 10 };
      cell.fill = solidFill('FFF3F4F6');
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = ALL_THIN_BORDERS;
    });

    // データ行
    for (let i = 0; i < heirCount; i++) {
      const row = sheet.addRow(getRowData(i));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      row.eachCell((cell: any, col: number) => {
        cell.font = { size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'right' };
        cell.border = ALL_THIN_BORDERS;
      });
    }

    // 合計行
    const totalRow = sheet.addRow(getTotalRow());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    totalRow.eachCell((cell: any, col: number) => {
      cell.font = { bold: true, size: 10 };
      cell.fill = FILLS.totalRow;
      cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'right' };
      cell.border = ALL_THIN_BORDERS;
    });
    sheet.addRow([]);
  });

  // 比較セクション
  addHeirComparisonSection(sheet, colCount, comparisonConfig);

  // 列幅
  sheet.columns = columnWidths.map(w => ({ width: w }));
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * ワークブックをBlobに変換してダウンロード
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveWorkbook(workbook: any, fileName: string) {
  const { saveAs } = await import('file-saver');
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: XLSX_MIME }), fileName);
}
