/**
 * Excel スタイル定数（テーマカラー: 青系 #2563EB）
 */

import { COMPANY_INFO } from '@tax-apps/utils';
export { COMPANY_INFO };

const solidFill = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });

export const FILLS = {
  mainHeader: solidFill('FF2563EB'),
  subHeader: solidFill('FFDBEAFE'),
  totalRow: solidFill('FFEFF6FF'),
};

const THIN_BORDER = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } };
export const ALL_THIN_BORDERS = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };

const BLUE_BORDER = { style: 'medium' as const, color: { argb: 'FF2563EB' } };
const ALL_BLUE_BORDERS = { top: BLUE_BORDER, left: BLUE_BORDER, bottom: BLUE_BORDER, right: BLUE_BORDER };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyHeaderStyle(cell: any) {
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  cell.fill = FILLS.mainHeader;
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border = ALL_BLUE_BORDERS;
}

interface WorkbookSetupConfig {
  ExcelJS: typeof import('exceljs').default;
  sheetName: string;
  title: string;
  colCount: number;
  pageSetup: {
    paperSize: number;
    orientation: 'portrait' | 'landscape';
  };
}

export function setupExcelWorkbook({ ExcelJS, sheetName, title, colCount, pageSetup }: WorkbookSetupConfig) {
  const COMPANY_FULL = `${COMPANY_INFO.name}　${COMPANY_INFO.postalCode} ${COMPANY_INFO.address}　TEL: ${COMPANY_INFO.phone}`;
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
  titleCell.font = { size: 18, bold: true, color: { argb: 'FF2563EB' } };
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
