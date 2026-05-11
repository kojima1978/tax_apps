export type Gender = 'male' | 'female';

export type PaymentFrequency = 'monthly' | 'semiannual' | 'annual' | 'lumpsum';

export type TaxDeductionType = 'general_life' | 'nursing_care' | 'pension' | 'corporate';

export type TaxLabel = 'inheritance' | 'income' | 'gift';

export type Tab = 'input' | 'diagnosis' | 'report';

export interface TabItem {
    key: Tab;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
}

export interface ClientInfo {
    client_name: string;
    birth_date: string;
    gender: Gender;
}

export interface ContractBase {
    company_name: string;
    policy_type: string;
    policy_number: string;
    contract_date: string;
    issue_age: number;
}

export interface Coverage {
    death_benefit_disease: number;
    death_benefit_accident: number;
    hosp_day_disease: number;
    hosp_day_accident: number;
    diagnosis_benefit: number;
    policy_end_age: number;
}

export interface CostRevenue {
    payment_frequency: PaymentFrequency;
    premium_amount: number;
    annual_premium: number;
    payment_end_age: number;
    tax_deduction_type: TaxDeductionType;
}

export interface CashValueMilestone {
    age: number;
    value: number;
}

export interface SavingsValue {
    cash_value_current: number;
    cash_value_milestones: CashValueMilestone[];
    maturity_benefit: number;
}

export interface InsuranceFormData {
    client: ClientInfo;
    contract: ContractBase;
    coverage: Coverage;
    cost: CostRevenue;
    savings: SavingsValue;
}

export interface CashFlowRow {
    year: number;
    age: number;
    annual_premium: number;
    cumulative_premium: number;
    cash_value: number;
    return_rate: number;
    death_benefit: number;
}

export interface DiagnosisResult {
    current_age: number;
    return_rate: number;
    total_premiums_paid: number;
    coverage_gap_years: number;
    life_expectancy: number;
    estimated_death_age: number;
    tax_label: TaxLabel;
    annual_cost_per_coverage: number;
    total_premium_projection: number;
    cash_flow_table: CashFlowRow[];
    form_data: InsuranceFormData;
}

export const POLICY_TYPES = [
    { value: 'whole_life', label: '終身保険' },
    { value: 'term', label: '定期保険' },
    { value: 'endowment', label: '養老保険' },
    { value: 'annuity', label: '個人年金保険' },
    { value: 'medical', label: '医療保険' },
    { value: 'cancer', label: 'がん保険' },
    { value: 'income_protection', label: '収入保障保険' },
    { value: 'other', label: 'その他' },
] as const;

export const PAYMENT_FREQUENCIES: { value: PaymentFrequency; label: string; multiplier: number }[] = [
    { value: 'monthly', label: '月払', multiplier: 12 },
    { value: 'semiannual', label: '半年払', multiplier: 2 },
    { value: 'annual', label: '年払', multiplier: 1 },
    { value: 'lumpsum', label: '一時払', multiplier: 0 },
];

export const TAX_DEDUCTION_TYPES: { value: TaxDeductionType; label: string }[] = [
    { value: 'general_life', label: '一般生命' },
    { value: 'nursing_care', label: '介護医療' },
    { value: 'pension', label: '個人年金' },
    { value: 'corporate', label: '法人契約' },
];

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
    { value: 'male', label: '男性' },
    { value: 'female', label: '女性' },
];
