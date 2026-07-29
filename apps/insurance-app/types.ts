export type PolicyType = '個人年金保険' | '収入保障保険' | '定期保険' | 'がん保険' | '変額終身保険' | '医療保険' | '終身保険' | '養老保険';
export type PolicyCurrency = 'JPY' | 'USD';
export type PaymentCurrency = 'JPY' | 'USD';
export type PensionStartMode = 'age' | 'fiscalYear';

export const DISPLAY_POLICY_TYPES: PolicyType[] = [
  '終身保険',
  '定期保険',
  '収入保障保険',
  '変額終身保険',
  '医療保険',
  'がん保険',
  '養老保険',
  '個人年金保険',
];

export function normalizePolicyType(policyType: string): PolicyType {
  const value = policyType.trim();
  if (value === '収入保障定期保険') return '収入保障保険';
  return value as PolicyType;
}

export function isIncomeProtectionPolicyType(policyType: string): boolean {
  return normalizePolicyType(policyType) === '収入保障保険';
}

// 年齢別の解約返戻金。入力した年齢だけを保持し、間は線形補間して扱う
export interface SurrenderValuePoint {
  age: number;
  amount: number;          // 円換算額
  foreignAmount?: number;  // 外貨建て契約の入力額
}

// 個々の保険分析（保障期間/払込状況/保障充足度）の手動上書き
export interface EvaluationOverride {
  label: string;
  rating: 'good' | 'caution' | 'warning';
  text: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  nameKana: string;
  relationship: string; // 本人、配偶者、長男など
  birthDate: string;
  gender: 'male' | 'female';
}

export interface BeneficiaryAllocation {
  beneficiaryId: string;
  percentage: number;
}

export interface Policy {
  id: string;
  companyName: string;
  policyType: PolicyType;
  policyNumber: string;
  contractDate: string;
  contractAge: number;
  insuredId: string;      // 被保険者（FamilyMember.id）
  beneficiaryId: string;    // 受取人（FamilyMember.id）
  beneficiaryAllocations?: BeneficiaryAllocation[]; // 死亡保険金受取人ごとの受取割合
  // 個人年金の受取設定
  pensionRecipientId?: string;
  pensionSuccessorRecipientId?: string;
  pensionStartMode?: PensionStartMode;
  pensionStartFiscalYear?: number;
  pensionPayoutYears?: number;
  // 保障内容
  deathBenefitDisease: number;
  deathBenefitAccident: number;
  hospDayDisease: number;
  hospDayAccident: number;
  diagnosisBenefit: number;
  policyEndAge: number;
  // コスト
  currency?: PolicyCurrency;
  // 互換用キャッシュ。現在評価には AppState.valuationSettings.usdJpyRate を使用
  exchangeRate?: number;
  contractExchangeRate?: number;
  paymentCurrency?: PaymentCurrency;
  premiumPaymentDate?: string;
  actualPremiumPaidJpy?: number;
  paymentExchangeRate?: number;
  foreignPremiumAmount?: number;
  foreignDeathBenefitDisease?: number;
  foreignDeathBenefitAccident?: number;
  foreignHospDayDisease?: number;
  foreignHospDayAccident?: number;
  foreignDiagnosisBenefit?: number;
  foreignMaturityBenefit?: number;
  paymentFrequency: 'monthly' | 'annual' | 'single';
  premiumAmount: number;
  paymentEndAge: number;
  premiumPaymentCompleted?: boolean;
  annualPremium: number;
  // 貯蓄性
  maturityBenefit: number;
  // 年齢別の解約返戻金（任意入力・スパース）
  surrenderValues?: SurrenderValuePoint[];
  // コンサルタントメモ
  consultantNote?: string;
  // 個別評価の手動上書き（保障期間/払込状況/保障充足度）
  evaluationOverrides?: EvaluationOverride[];
}

export interface Agency {
  name: string;
  representative: string;
  phone: string;
}

export interface AgencyMaster {
  id: string;
  name: string;
  representative: string;
  phone: string;
}

export interface ValuationSettings {
  usdJpyRate: number;
  fxRateDate: string;
}

export interface AppState {
  familyMembers: FamilyMember[];
  agency: Agency;
  policies: Policy[];
  valuationSettings?: ValuationSettings;
  updatedAt?: string;
}

export interface CsvImportResult {
  importedCount?: number;
  failedCount?: number;
  errors?: { row: number; message: string }[];
  state?: AppState;
  code?: string;
  message?: string;
  duplicates?: { row: number; policyNumber: string; existingPolicyId: string }[];
}
