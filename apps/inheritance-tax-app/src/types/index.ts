// 相続人の種類
export type HeirType = 'spouse' | 'child' | 'grandchild' | 'parent' | 'grandparent' | 'sibling' | 'nephew_niece';

// 相続人の順位
export type HeirRank = 1 | 2 | 3;

// 個別の相続人
export interface Heir {
  id: string;
  type: HeirType;
  isDeceased?: boolean; // 代襲相続用（子供が亡くなっている場合）
  representatives?: Heir[]; // 代襲相続人（孫や甥姪）
}

// 相続人構成
export interface HeirComposition {
  hasSpouse: boolean;
  selectedRank: 'none' | 'rank1' | 'rank2' | 'rank3'; // 選択された順位
  rank1Children: Heir[]; // 第1順位：子供
  rank2Ascendants: Heir[]; // 第2順位：直系尊属（親・祖父母）
  rank3Siblings: Heir[]; // 第3順位：兄弟姉妹
}

// 税率区分
export interface TaxBracket {
  threshold: number; // 閾値（万円）
  rate: number; // 税率（%）
  deduction: number; // 控除額（万円）
}

// 相続税計算結果
export interface TaxCalculationResult {
  estateValue: number; // 相続財産額
  basicDeduction: number; // 基礎控除額
  taxableAmount: number; // 課税遺産総額
  totalTax: number; // 総相続税額
  taxAfterSpouseDeduction: number; // 配偶者控除後の税額
  effectiveTaxRate: number; // 実効税率（%）
  effectiveTaxRateAfterSpouse: number; // 配偶者控除後の実効税率（%）
}

// テーブル表示用データ
export interface TableRow {
  estateValue: number;
  taxWithSpouse: number;
  effectiveRateWithSpouse: number;
  taxAfterSpouseDeduction: number;
  taxWithoutSpouse: number;
  effectiveRateWithoutSpouse: number;
}
