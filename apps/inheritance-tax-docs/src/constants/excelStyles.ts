// Excel スタイル定義

const thinBorder = (rgb: string) => ({ style: 'thin' as const, color: { rgb } });
const allBorders = (rgb: string) => {
  const b = thinBorder(rgb);
  return { top: b, bottom: b, left: b, right: b };
};

const CELL_BORDER = allBorders('E5E7EB');
const CELL_ALIGN = { horizontal: 'left' as const, vertical: 'center' as const, wrapText: true };
const CELL_FONT = { sz: 11, color: { rgb: '1F2937' } };

export const EXCEL_STYLES = {
  title: {
    font: { bold: true, sz: 18, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E3A8A' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  subTitle: {
    font: { sz: 11, color: { rgb: '374151' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  badge: {
    font: { bold: true, sz: 10, color: { rgb: '065F46' } },
    fill: { fgColor: { rgb: 'D1FAE5' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  clientInfo: {
    font: CELL_FONT,
    fill: { fgColor: { rgb: 'DBEAFE' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: allBorders('93C5FD'),
  },
  noticeHeader: {
    font: { bold: true, sz: 11, color: { rgb: 'B45309' } },
    fill: { fgColor: { rgb: 'FEF3C7' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  noticeText: {
    font: { sz: 10, color: { rgb: '92400E' } },
    fill: { fgColor: { rgb: 'FFFBEB' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: false },
  },
  categoryHeader: {
    font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E40AF' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: allBorders('1E3A8A'),
  },
  tableHeader: {
    font: { bold: true, sz: 11, color: { rgb: '374151' } },
    fill: { fgColor: { rgb: 'F3F4F6' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: allBorders('D1D5DB'),
  },
  documentCell: {
    font: CELL_FONT,
    alignment: CELL_ALIGN,
    border: CELL_BORDER,
  },
  documentCellAlt: {
    font: CELL_FONT,
    fill: { fgColor: { rgb: 'F9FAFB' } },
    alignment: CELL_ALIGN,
    border: CELL_BORDER,
  },
  checkCell: {
    font: { sz: 14, color: { rgb: '6B7280' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: CELL_BORDER,
  },
  urgentCell: {
    font: { ...CELL_FONT, color: { rgb: 'B91C1C' } },
    fill: { fgColor: { rgb: 'FEE2E2' } },
    alignment: CELL_ALIGN,
    border: CELL_BORDER,
  },
  urgentBadge: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: 'DC2626' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: allBorders('DC2626'),
  },
  delegateBadge: {
    font: { sz: 9, color: { rgb: 'B45309' } },
    fill: { fgColor: { rgb: 'FEF3C7' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: allBorders('FCD34D'),
  },
  footer: {
    font: { sz: 9, color: { rgb: '9CA3AF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
} as const;

/** A〜E列を結合する行を追加（注意事項、カテゴリヘッダー用） */
export function pushMergedRow(wsData: object[][], mergeRows: number[], text: string, style: object): void {
  mergeRows.push(wsData.length);
  wsData.push([
    { v: text, s: style },
    { v: '', s: style },
    { v: '', s: style },
    { v: '', s: style },
    { v: '', s: style },
  ]);
}

/** 空行を追加 */
export function pushEmptyRow(wsData: object[][]): void {
  wsData.push([]);
}
