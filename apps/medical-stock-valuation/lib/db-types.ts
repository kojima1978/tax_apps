/**
 * データベーステーブルの型定義
 */

/** companies テーブルの型 */
export interface Company {
  id: number;
  company_name: string;
  is_active: number; // 1: 有効, 0: 無効
  created_at: string;
  updated_at: string;
}

/** users テーブルの型 */
export interface User {
  id: number;
  name: string;
  is_active: number; // 1: 有効, 0: 無効
  created_at: string;
  updated_at: string;
}

/** valuations テーブルの型 */
export interface Valuation {
  id: string;
  company_id: number;
  user_id: number;
  fiscal_year: string;
  created_at: string;
  updated_at: string;
}

/** financial_data テーブルの型 */
export interface FinancialData {
  id: number;
  valuation_id: string;
  employees: string;
  total_assets: string;
  sales: string;
  current_period_net_asset: number;
  previous_period_net_asset: number;
  net_asset_tax_value: number;
  current_period_profit: number;
  previous_period_profit: number;
  previous_previous_period_profit: number;
  created_at: string;
  updated_at: string;
}

/** investors テーブルの型 */
export interface Investor {
  id: number;
  valuation_id: string;
  investor_name: string;
  shares_held: number;
  shareholding_ratio: number;
  created_at: string;
  updated_at: string;
}

/** similar_industry_data テーブルの型 */
export interface SimilarIndustryData {
  id: number;
  fiscal_year: string;
  profit_per_share: number;
  net_asset_per_share: number;
  average_stock_price: number;
  created_at: string;
  updated_at: string;
}

/** valuations テーブルと関連テーブルのJOIN結果 */
export interface ValuationWithRelations {
  id: string;
  fiscal_year: string;
  created_at: string;
  updated_at: string;
  company_name: string;
  person_in_charge: string;
}
