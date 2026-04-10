/** 見積書・請求書Excel出力用スタイル定数 */

const thin = { style: 'thin', color: { rgb: '000000' } } as const;
const border = { top: thin, bottom: thin, left: thin, right: thin } as const;

export const EXCEL_STYLES = {
  /** 書類タイトル（御見積書/御請求書） */
  title: {
    font: { bold: true, sz: 18 },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  },
  /** 宛名 */
  addressee: {
    font: { sz: 14 },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const },
    border: { bottom: { style: 'medium' as const, color: { rgb: '000000' } } },
  },
  /** 合計金額（大枠） */
  totalAmount: {
    font: { bold: true, sz: 16 },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
    border,
  },
  /** 明細ヘッダー */
  detailHeader: {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '4472C4' } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
    border,
  },
  /** 明細行 */
  detailCell: {
    font: { sz: 11 },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const },
    border,
  },
  /** 明細行（金額） */
  detailAmount: {
    font: { sz: 11 },
    alignment: { horizontal: 'right' as const, vertical: 'center' as const },
    border,
    numFmt: '#,##0',
  },
  /** 小計・消費税・合計行ラベル */
  subtotalLabel: {
    font: { bold: true, sz: 11 },
    alignment: { horizontal: 'right' as const, vertical: 'center' as const },
    border,
  },
  /** 小計・消費税・合計行金額 */
  subtotalAmount: {
    font: { bold: true, sz: 11 },
    alignment: { horizontal: 'right' as const, vertical: 'center' as const },
    border,
    numFmt: '#,##0',
  },
  /** 通常テキスト */
  normal: {
    font: { sz: 11 },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const },
  },
  /** 右寄せテキスト */
  normalRight: {
    font: { sz: 11 },
    alignment: { horizontal: 'right' as const, vertical: 'center' as const },
  },
  /** 発行元情報 */
  issuer: {
    font: { sz: 10 },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const },
  },
  /** 備考 */
  note: {
    font: { sz: 10 },
    alignment: { horizontal: 'left' as const, vertical: 'top' as const, wrapText: true },
    border,
  },
} as const;
