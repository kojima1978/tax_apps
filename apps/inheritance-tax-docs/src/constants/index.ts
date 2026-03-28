// 書類リスト種別
export type DocListType = 'inheritance-tax' | 'simplified' | 'unlisted-stock';

export const DOC_LIST_TYPE_LABELS: Record<DocListType, string> = {
  'inheritance-tax': '相続税申告',
  'simplified': '相続シミュレーション',
  'unlisted-stock': '非上場株式評価',
};

// ストレージキー
export const STORAGE_KEYS = {
  docListType: 'inheritance_tax_docs_doc_list_type',
  clientName: 'inheritance_tax_docs_client_name',
  deceasedName: 'inheritance_tax_docs_deceased_name',
  personInCharge: 'inheritance_tax_docs_person_in_charge',
  personInChargeContact: 'inheritance_tax_docs_person_in_charge_contact',
  darkMode: 'inheritance_tax_docs_dark_mode',
} as const;

// データストレージキー（種別ごと）
export const getDataStorageKey = (type: DocListType): string =>
  `inheritance_tax_docs_${type}_data`;

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

// 個別名（サブアイテム）
export interface SpecificName {
  id: string;
  text: string;
}

// 編集可能な書類アイテム
export interface EditableDocument {
  id: string;
  name: string;
  description: string;
  howToGet: string;
  canDelegate: boolean;
  checked: boolean;
  checkedDate?: string;
  excluded: boolean;
  urgent: boolean;
  specificNames: SpecificName[];
  isCustom: boolean;
}

// 編集可能なカテゴリ
export interface EditableCategory {
  id: string;
  name: string;
  documents: EditableDocument[];
  isExpanded: boolean;
  isDisabled: boolean;
}

// 書類リスト全体の状態
export type EditableDocumentList = EditableCategory[];

export { CATEGORIES } from './documents';
export { SIMPLIFIED_CATEGORIES } from './simplifiedDocuments';
export { UNLISTED_STOCK_CATEGORIES } from './unlistedStockDocuments';
export type { DocumentItem, CategoryData } from './documents';
