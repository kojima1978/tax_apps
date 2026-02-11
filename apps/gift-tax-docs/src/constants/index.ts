// ストレージキー
export const STORAGE_KEYS = {
  staffName: 'gift_tax_staff_name',
  staffPhone: 'gift_tax_staff_phone',
  customerName: 'gift_tax_customer_name',
  deadline: 'gift_tax_deadline',
} as const;

// 会社情報
export const COMPANY_INFO = {
  name: '税理士法人 マスエージェント',
  fullAddress: '〒770-0002 徳島県徳島市春日２丁目３番３３号',
  contactLine: 'TEL 088-632-6228 / FAX 088-631-9870',
} as const;

export * from './giftData';

// 外部リンク
export const EXTERNAL_LINKS = {
  ntaCheckSheet: {
    url: 'https://www.nta.go.jp/about/organization/tokyo/topics/check/r07/01.htm',
    label: '資産税（相続税、贈与税、財産評価及び譲渡所得）関係チェックシート等',
  },
  etaxDocuments: {
    url: 'https://www.e-tax.nta.go.jp/tetsuzuki/tetsuzuki6.htm',
    label: 'イメージデータにより提出可能な添付書類',
  },
} as const;

// 中項目（サブアイテム）
export interface SubItem {
  id: string;
  text: string;
}

// 編集可能な書類アイテム
export interface EditableDocument {
  id: string;
  text: string;
  checked: boolean;
  subItems: SubItem[];
}

// 編集可能なカテゴリ
export interface EditableCategory {
  id: string;
  name: string;
  documents: EditableDocument[];
  note?: string;
  isExpanded: boolean;
  isSpecial: boolean;  // 特例かどうか
}

// 書類リスト全体の状態
export type EditableDocumentList = EditableCategory[];
