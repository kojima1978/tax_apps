/**
 * 医療法人出資持分評価システムの定数定義
 */

// ============================================================================
// 出資口数関連
// ============================================================================

/** 1口あたりの金額（円） */
export const SHARE_DENOMINATION = 50;

// ============================================================================
// 税率・控除関連
// ============================================================================

/** 法人税等の実効税率 */
export const CORPORATE_TAX_RATE = 0.37;

/** 贈与税の基礎控除額（万円） */
export const GIFT_TAX_BASIC_DEDUCTION = 110;

// ============================================================================
// 会社規模による斟酌率
// ============================================================================

/** 大会社の斟酌率 */
export const LARGE_COMPANY_MULTIPLIER = 0.7;

/** 中会社の斟酌率 */
export const MEDIUM_COMPANY_MULTIPLIER = 0.6;

/** 小会社の斟酌率 */
export const SMALL_COMPANY_MULTIPLIER = 0.5;

// ============================================================================
// L値（併用割合）
// ============================================================================

/** 大会社のL値 */
export const LARGE_COMPANY_L_RATIO = 1.0;

/** 中会社の大のL値 */
export const LARGE_MEDIUM_COMPANY_L_RATIO = 0.9;

/** 中会社の中のL値 */
export const MEDIUM_MEDIUM_COMPANY_L_RATIO = 0.75;

/** 中会社の小のL値 */
export const SMALL_MEDIUM_COMPANY_L_RATIO = 0.6;

/** 小会社のL値 */
export const SMALL_COMPANY_L_RATIO = 0.5;

// ============================================================================
// 贈与税の速算表（一般税率）
// ============================================================================

/**
 * 贈与税の税率テーブル
 * 各要素: [課税価格上限(万円), 税率, 控除額(万円)]
 */
export const GIFT_TAX_BRACKETS = [
  { threshold: 200, rate: 0.1, deduction: 0 },
  { threshold: 300, rate: 0.15, deduction: 10 },
  { threshold: 400, rate: 0.2, deduction: 25 },
  { threshold: 600, rate: 0.3, deduction: 65 },
  { threshold: 1000, rate: 0.4, deduction: 125 },
  { threshold: 1500, rate: 0.45, deduction: 175 },
  { threshold: 3000, rate: 0.5, deduction: 250 },
  { threshold: Infinity, rate: 0.55, deduction: 400 },
] as const;

// ============================================================================
// デフォルト値（類似業種データ）
// ============================================================================

/** デフォルトの類似業種の利益（円） */
export const DEFAULT_SIMILAR_PROFIT_PER_SHARE = 51;

/** デフォルトの類似業種の純資産（円） */
export const DEFAULT_SIMILAR_NET_ASSET_PER_SHARE = 395;

/** デフォルトの類似業種の平均株価（円） */
export const DEFAULT_SIMILAR_AVERAGE_STOCK_PRICE = 532;

// ============================================================================
// 単位変換係数
// ============================================================================

/** 円から千円への変換 */
export const YEN_TO_THOUSAND = 1000;

/** 円から万円への変換 */
export const YEN_TO_TEN_THOUSAND = 10000;

/** 千円から万円への変換 */
export const THOUSAND_TO_TEN_THOUSAND = 10;
