import type { DocumentItem, CustomDocumentItem } from '../constants/documents';

/** カスタム書類かどうかを判定 */
export function isCustomDocument(doc: DocumentItem | CustomDocumentItem): doc is CustomDocumentItem {
  return 'isCustom' in doc && doc.isCustom === true;
}

/** 日付を日本語形式でフォーマット（YYYY/MM/DD） */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** 数値を丸囲み数字に変換（①②③...⑳、21以上は(21)形式） */
const CIRCLED_NUMBERS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
export function toCircledNumber(n: number): string {
  if (n >= 1 && n <= 20) return CIRCLED_NUMBERS[n - 1];
  return `(${n})`;
}

/** 期限日を日本語形式でフォーマット（YYYY年M月D日） */
export function formatDeadline(deadline: string): string {
  return new Date(deadline).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
