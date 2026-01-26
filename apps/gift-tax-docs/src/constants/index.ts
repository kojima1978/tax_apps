// 会社情報
export const COMPANY_INFO = {
  name: '税理士法人 マスエージェント',
  postalCode: '〒770-0002',
  address: '徳島県徳島市春日２丁目３番３３号',
  fullAddress: '〒770-0002 徳島県徳島市春日２丁目３番３３号',
  phone: '088-632-6228',
  fax: '088-631-9870',
  contactLine: 'TEL 088-632-6228 / FAX 088-631-9870',
} as const;

export * from './giftData';

// 外部リンク
export const EXTERNAL_LINKS = {
  ntaCheckSheet: {
    url: 'https://www.nta.go.jp/about/organization/tokyo/topics/check/r07/01.htm',
    label: '資産税（相続税、贈与税、財産評価及び譲渡所得）関係チェックシート等',
    description: '参考リンク（国税庁）',
  },
  etaxDocuments: {
    url: 'https://www.e-tax.nta.go.jp/tetsuzuki/tetsuzuki6.htm',
    label: 'イメージデータにより提出可能な添付書類',
    description: '参考リンク（e-Tax）',
  },
} as const;

// オプションID型定義
export type OptionId =
  | 'gift_land'
  | 'gift_house'
  | 'gift_cash'
  | 'gift_stock_listed'
  | 'gift_stock_unlisted'
  | 'sp_tax_rate'
  | 'sp_seisan'
  | 'sp_spouse'
  | 'sp_housing';

export type OptionSelection = Partial<Record<OptionId, boolean>>;

export type Step = 'menu' | 'check' | 'result';
