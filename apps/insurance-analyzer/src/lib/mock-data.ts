import type { InsuranceFormData } from '@/types';

export const MOCK_INSURANCE_DATA: InsuranceFormData = {
    client: {
        client_name: '山田 太郎',
        birth_date: '1996-03-15',
        gender: 'male',
    },
    contract: {
        company_name: '〇〇生命保険',
        policy_type: 'whole_life',
        policy_number: 'A-12345678',
        contract_date: '2021-04-01',
        issue_age: 25,
    },
    coverage: {
        death_benefit_disease: 30000000,
        death_benefit_accident: 60000000,
        hosp_day_disease: 10000,
        hosp_day_accident: 15000,
        diagnosis_benefit: 2000000,
        policy_end_age: 0,
    },
    cost: {
        payment_frequency: 'monthly',
        premium_amount: 25000,
        annual_premium: 300000,
        payment_end_age: 60,
        tax_deduction_type: 'general_life',
    },
    savings: {
        cash_value_current: 450000,
        cash_value_milestones: [
            { age: 30, value: 450000 },
            { age: 35, value: 980000 },
            { age: 40, value: 1800000 },
            { age: 45, value: 2900000 },
            { age: 50, value: 4300000 },
            { age: 55, value: 6100000 },
            { age: 60, value: 8500000 },
            { age: 65, value: 10200000 },
        ],
        maturity_benefit: 0,
    },
};
