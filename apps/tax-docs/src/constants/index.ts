// 申告種別
export type TaxType = 'gift-tax' | 'income-tax';

export const TAX_TYPE_LABELS: Record<TaxType, string> = {
  'income-tax': '所得税申告',
  'gift-tax': '贈与税申告',
};

// ストレージキー
export const STORAGE_KEYS = {
  taxType: 'tax_docs_tax_type',
  year: 'tax_docs_year',
  staffName: 'tax_docs_staff_name',
  staffPhone: 'tax_docs_staff_phone',
  customerName: 'tax_docs_customer_name',
  darkMode: 'tax_docs_dark_mode',
} as const;

// 会社情報
export const COMPANY_INFO = {
  name: '税理士法人マスエージェント',
  postalCode: '〒770-0002',
  address: '徳島県徳島市春日２丁目３−３３',
  phone: '088-632-6228',
  fax: '088-631-9870',
} as const;

export function getFullAddress(): string {
  return `${COMPANY_INFO.postalCode} ${COMPANY_INFO.address}`;
}

export function getContactLine(): string {
  return `TEL ${COMPANY_INFO.phone} / FAX ${COMPANY_INFO.fax}`;
}

export * from './giftData';
export * from './taxReturnData';

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
