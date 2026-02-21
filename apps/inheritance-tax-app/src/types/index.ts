// 相続人の種類
export type HeirType = 'spouse' | 'child' | 'grandchild' | 'parent' | 'grandparent' | 'sibling' | 'nephew_niece';

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

// 配偶者の取得割合モード
export type SpouseAcquisitionMode =
  | { mode: 'legal' }
  | { mode: 'limit160m' }
  | { mode: 'custom'; value: number };

// 個別相続人の税額内訳
export interface HeirTaxBreakdown {
  label: string;
  type: HeirType;
  legalShareRatio: number;
  legalShareAmount: number;
  taxOnShare: number;
  acquisitionAmount: number;
  proportionalTax: number;
  surchargeAmount: number;
  spouseDeduction: number;
  finalTax: number;
}

// 配偶者控除の詳細
export interface SpouseDeductionDetail {
  acquisitionAmount: number;
  legalShareAmount: number;
  limit160m: number;
  deductionLimit: number;
  taxBeforeDeduction: number;
  actualDeduction: number;
}

// 詳細計算結果
export interface DetailedTaxCalculationResult {
  estateValue: number;
  basicDeduction: number;
  taxableAmount: number;
  totalTax: number;
  heirBreakdowns: HeirTaxBreakdown[];
  spouseDeductionDetail: SpouseDeductionDetail | null;
  totalFinalTax: number;
  effectiveTaxRate: number;
}

// 1次2次比較テーブルの行
export interface ComparisonRow {
  ratio: number;              // 配偶者取得割合 (0-100)
  spouseAcquisition: number;  // 配偶者取得額（万円）
  firstTax: number;           // 1次相続税額（万円）
  secondEstate: number;       // 2次相続遺産額（万円）
  secondTax: number;          // 2次相続税額（万円）
  totalTax: number;           // 合計税額（万円）
  firstBreakdowns: HeirTaxBreakdown[];   // 1次相続 相続人別内訳
  secondBreakdowns: HeirTaxBreakdown[];  // 2次相続 相続人別内訳
}

// ── 死亡保険金シミュレーション ──

// 保険契約
export interface InsuranceContract {
  id: string;
  category: 'existing' | 'new';      // 既存 or 新規検討
  beneficiaryId: string;              // 受取人（相続人ID or 'spouse'）
  beneficiaryLabel: string;           // 受取人ラベル（表示用）
  benefit: number;                    // 受取保険金額（万円）
  premium: number;                    // 支払保険料（万円）
}

// 受取人選択肢
export interface BeneficiaryOption {
  id: string;       // 'spouse' | heir.id
  label: string;    // '配偶者', '子1', '子2' etc.
}

// 相続人別の保険内訳
export interface InsuranceHeirBreakdown {
  label: string;              // 相続人名
  totalBenefit: number;       // 受取保険金合計
  nonTaxableAmount: number;   // 非課税額
  taxableAmount: number;      // 課税対象額
  premiumPaid: number;        // 保険料負担（新規契約分のみ、受取人帰属）
}

// シナリオ別結果
export interface InsuranceScenarioResult {
  label: string;                         // '現状' or '提案'
  totalBenefit: number;                  // 保険金合計
  nonTaxableLimit: number;               // 非課税限度額
  nonTaxableAmount: number;              // 適用非課税額
  taxableInsurance: number;              // 課税対象保険金
  adjustedEstate: number;                // 調整後遺産額
  premiumDeduction: number;              // 新規保険料控除額
  totalNetProceeds: number;              // 手取り合計（遺産取得+保険金全額−税額）
  taxResult: DetailedTaxCalculationResult; // 税額計算結果
  heirBreakdowns: InsuranceHeirBreakdown[]; // 相続人別保険内訳
}

// シミュレーション全体結果
export interface InsuranceSimulationResult {
  current: InsuranceScenarioResult;      // 現状
  proposed: InsuranceScenarioResult;     // 提案
  taxSaving: number;                     // 節税額
  netProceedsDiff: number;               // 手取り増減額
  newPremiumTotal: number;               // 新規保険料合計
  baseEstate: number;                    // 元の遺産額
}
