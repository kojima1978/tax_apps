/**
 * 案件から出す帳票の種類と、その名前。
 *
 * 同じ3つの名前が画面の見出し・Excelのファイル名・API の Content-Disposition で要るので、
 * 表を1つにしておく（別々に持つと、名前を直したとき片方だけ古いまま残る）。
 */

export type DocumentType = 'estimate' | 'invoice' | 'invoice-request';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  estimate: '見積書',
  invoice: '請求書',
  'invoice-request': '請求書発行依頼票',
};
