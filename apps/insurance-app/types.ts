export type PolicyType = '個人年金保険' | '収入保障保険' | '収入保障定期保険' | '定期保険' | 'がん保険' | '変額終身保険' | '医療保険' | '終身保険' | '養老保険';
export type PolicyCurrency = 'JPY' | 'USD';

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

export interface Policy {
  id: string;
  companyName: string;
  policyType: PolicyType;
  policyNumber: string;
  contractDate: string;
  contractAge: number;
  insuredId: string;      // 被保険者（FamilyMember.id）
  beneficiaryId: string;    // 受取人（FamilyMember.id）
  // 保障内容
  deathBenefitDisease: number;
  deathBenefitAccident: number;
  hospDayDisease: number;
  hospDayAccident: number;
  diagnosisBenefit: number;
  policyEndAge: number;
  // コスト
  currency?: PolicyCurrency;
  exchangeRate?: number;
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
  annualPremium: number;
  // 貯蓄性
  maturityBenefit: number;
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

export interface AppState {
  familyMembers: FamilyMember[];
  agency: Agency;
  policies: Policy[];
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
