import type {
    InsuranceFormData,
    DiagnosisResult,
    CashFlowRow,
    TaxLabel,
    CashValueMilestone,
} from '@/types';
import { PAYMENT_FREQUENCIES } from '@/types';
import { calcAge } from '@/lib/utils';
import { getLifeExpectancy, getEstimatedDeathAge } from '@/lib/life-expectancy';

export function calcAnnualPremium(amount: number, frequency: string): number {
    const freq = PAYMENT_FREQUENCIES.find(f => f.value === frequency);
    if (!freq || freq.multiplier === 0) return amount;
    return amount * freq.multiplier;
}

export function calcReturnRate(cashValue: number, totalPremiumsPaid: number): number {
    if (totalPremiumsPaid <= 0) return 0;
    return (cashValue / totalPremiumsPaid) * 100;
}

export function calcCoverageGap(currentAge: number, gender: 'male' | 'female', policyEndAge: number): number {
    if (policyEndAge === 0) return 0;
    const estimatedDeath = getEstimatedDeathAge(currentAge, gender);
    const gap = estimatedDeath - policyEndAge;
    return Math.max(0, gap);
}

export function determineTaxLabel(policyType: string): TaxLabel {
    if (policyType === 'annuity') return 'income';
    return 'inheritance';
}

function interpolateCashValue(targetAge: number, milestones: CashValueMilestone[]): number {
    if (milestones.length === 0) return 0;
    const sorted = [...milestones].sort((a, b) => a.age - b.age);
    if (targetAge <= sorted[0]!.age) return sorted[0]!.value;
    if (targetAge >= sorted[sorted.length - 1]!.age) return sorted[sorted.length - 1]!.value;

    for (let i = 0; i < sorted.length - 1; i++) {
        const curr = sorted[i]!;
        const next = sorted[i + 1]!;
        if (targetAge >= curr.age && targetAge <= next.age) {
            const ratio = (targetAge - curr.age) / (next.age - curr.age);
            return Math.round(curr.value + (next.value - curr.value) * ratio);
        }
    }
    return 0;
}

export function buildCashFlowTable(data: InsuranceFormData): CashFlowRow[] {
    const currentAge = calcAge(data.client.birth_date);
    const annualPremium = data.cost.annual_premium;
    const isLumpsum = data.cost.payment_frequency === 'lumpsum';
    const paymentEndAge = data.cost.payment_end_age === 0 ? 100 : data.cost.payment_end_age;
    const projectionEndAge = Math.max(
        paymentEndAge,
        data.coverage.policy_end_age === 0 ? 100 : data.coverage.policy_end_age,
        currentAge + 40
    );

    const rows: CashFlowRow[] = [];
    let cumulative = 0;

    for (let age = currentAge; age <= projectionEndAge; age++) {
        const year = age - currentAge + 1;
        const yearPremium = isLumpsum
            ? (age === currentAge ? data.cost.premium_amount : 0)
            : (age < paymentEndAge ? annualPremium : 0);
        cumulative += yearPremium;

        const cashValue = interpolateCashValue(age, data.savings.cash_value_milestones);
        const returnRate = calcReturnRate(cashValue, cumulative);

        const policyEnd = data.coverage.policy_end_age;
        const deathBenefit = (policyEnd === 0 || age <= policyEnd)
            ? data.coverage.death_benefit_disease
            : 0;

        rows.push({
            year,
            age,
            annual_premium: yearPremium,
            cumulative_premium: cumulative,
            cash_value: cashValue,
            return_rate: Math.round(returnRate * 10) / 10,
            death_benefit: deathBenefit,
        });
    }

    return rows;
}

export function runDiagnosis(data: InsuranceFormData): DiagnosisResult {
    const currentAge = calcAge(data.client.birth_date);
    const lifeExp = getLifeExpectancy(currentAge, data.client.gender);
    const estimatedDeathAge = getEstimatedDeathAge(currentAge, data.client.gender);

    const elapsedYears = calcAge(data.contract.contract_date);
    const isLumpsum = data.cost.payment_frequency === 'lumpsum';
    const totalPremiumsPaid = isLumpsum
        ? data.cost.premium_amount
        : data.cost.annual_premium * elapsedYears;

    const returnRate = calcReturnRate(data.savings.cash_value_current, totalPremiumsPaid);
    const coverageGap = calcCoverageGap(currentAge, data.client.gender, data.coverage.policy_end_age);
    const taxLabel = determineTaxLabel(data.contract.policy_type);

    const deathBenefit = data.coverage.death_benefit_disease;
    const annualCostPerCoverage = deathBenefit > 0
        ? Math.round((data.cost.annual_premium / deathBenefit) * 10000000)
        : 0;

    const paymentEndAge = data.cost.payment_end_age === 0 ? estimatedDeathAge : data.cost.payment_end_age;
    const remainingYears = Math.max(0, paymentEndAge - currentAge);
    const totalPremiumProjection = isLumpsum
        ? data.cost.premium_amount
        : totalPremiumsPaid + data.cost.annual_premium * remainingYears;

    const cashFlowTable = buildCashFlowTable(data);

    return {
        current_age: currentAge,
        return_rate: Math.round(returnRate * 10) / 10,
        total_premiums_paid: totalPremiumsPaid,
        coverage_gap_years: coverageGap,
        life_expectancy: lifeExp,
        estimated_death_age: estimatedDeathAge,
        tax_label: taxLabel,
        annual_cost_per_coverage: annualCostPerCoverage,
        total_premium_projection: totalPremiumProjection,
        cash_flow_table: cashFlowTable,
        form_data: data,
    };
}
