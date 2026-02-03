import type { TaxBracket } from '../types';

/**
 * 相続税の税率区分（法定相続分に応じた取得金額ベース）
 * 金額は万円単位
 */
export const TAX_BRACKETS: TaxBracket[] = [
  { threshold: 1000, rate: 10, deduction: 0 },       // 1,000万円以下
  { threshold: 3000, rate: 15, deduction: 50 },      // 3,000万円以下
  { threshold: 5000, rate: 20, deduction: 200 },     // 5,000万円以下
  { threshold: 10000, rate: 30, deduction: 700 },    // 1億円以下
  { threshold: 20000, rate: 40, deduction: 1700 },   // 2億円以下
  { threshold: 30000, rate: 45, deduction: 2700 },   // 3億円以下
  { threshold: 60000, rate: 50, deduction: 4200 },   // 6億円以下
  { threshold: Infinity, rate: 55, deduction: 7200 }, // 6億円超
];

/**
 * 基礎控除の計算パラメータ（万円単位）
 */
export const BASIC_DEDUCTION = {
  /** 基礎控除の固定額: 3,000万円 */
  BASE: 3000,
  /** 法定相続人1人あたりの加算額: 600万円 */
  PER_HEIR: 600,
} as const;

/**
 * 配偶者控除の上限額（万円単位）
 * 1億6,000万円 または 法定相続分 の大きい方
 */
export const SPOUSE_DEDUCTION_LIMIT = 16000;

/**
 * 第3順位（兄弟姉妹）の加算率
 * 20%加算
 */
export const THIRD_RANK_SURCHARGE_RATE = 1.2;

/**
 * テーブル表示設定
 */
export const TABLE_CONFIG = {
  /** 計算ステップ（万円）: 500万円刻み */
  STEP: 500,
  /** 最小値（万円）: 5,000万円 */
  MIN_VALUE: 5000,
  /** デフォルト最大値（万円）: 10億円 */
  DEFAULT_MAX_VALUE: 100000,
  /** 選択可能な最大値（万円）: 100億円 */
  MAX_SELECTABLE_VALUE: 1000000,
} as const;

/**
 * 1億円単位でハイライト表示するかどうかを判定
 * @param estateValue 相続財産額（万円単位）
 * @returns 1億円の倍数の場合true
 */
export function isHighlightRow(estateValue: number): boolean {
  return estateValue % 10000 === 0;
}
