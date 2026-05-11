import { useState, useCallback, useEffect, useMemo } from 'react';
import type { DiagnosisResult, Gender, PaymentFrequency, TaxDeductionType, CashValueMilestone } from '@/types';
import { PAYMENT_FREQUENCIES } from '@/types';
import { calcAge, parseFormattedNumber, formatInputValue } from '@/lib/utils';
import { runDiagnosis } from '@/lib/calculations';
import { MOCK_INSURANCE_DATA } from '@/lib/mock-data';
import { useDirtyFlag } from '@/hooks/useDirtyFlag';

export function useInsuranceForm() {
    const [clientName, setClientName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState<Gender>('male');

    const [companyName, setCompanyName] = useState('');
    const [policyType, setPolicyType] = useState('whole_life');
    const [policyNumber, setPolicyNumber] = useState('');
    const [contractDate, setContractDate] = useState('');
    const [issueAge, setIssueAge] = useState(0);

    const [deathBenefitDisease, setDeathBenefitDisease] = useState('');
    const [deathBenefitAccident, setDeathBenefitAccident] = useState('');
    const [hospDayDisease, setHospDayDisease] = useState('');
    const [hospDayAccident, setHospDayAccident] = useState('');
    const [diagnosisBenefit, setDiagnosisBenefit] = useState('');
    const [policyEndAge, setPolicyEndAge] = useState('');
    const [isWholeLife, setIsWholeLife] = useState(true);

    const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('monthly');
    const [premiumAmount, setPremiumAmount] = useState('');
    const [annualPremium, setAnnualPremium] = useState('');
    const [paymentEndAge, setPaymentEndAge] = useState('');
    const [taxDeductionType, setTaxDeductionType] = useState<TaxDeductionType>('general_life');

    const [cashValueCurrent, setCashValueCurrent] = useState('');
    const [milestones, setMilestones] = useState<CashValueMilestone[]>([]);
    const [maturityBenefit, setMaturityBenefit] = useState('');

    const [result, setResult] = useState<DiagnosisResult | null>(null);
    const { isDirty, markDirty, clearDirty } = useDirtyFlag(result);

    useEffect(() => {
        if (birthDate && contractDate) {
            setIssueAge(calcAge(birthDate, contractDate));
        }
    }, [birthDate, contractDate]);

    useEffect(() => {
        const amount = parseFormattedNumber(premiumAmount);
        if (amount > 0) {
            const freq = PAYMENT_FREQUENCIES.find(f => f.value === paymentFrequency);
            if (freq && freq.multiplier > 0) {
                setAnnualPremium(formatInputValue(amount * freq.multiplier));
            } else if (freq && freq.multiplier === 0) {
                setAnnualPremium(formatInputValue(amount));
            }
        }
    }, [premiumAmount, paymentFrequency]);

    const canCalculate = useMemo(() => {
        return birthDate !== ''
            && parseFormattedNumber(deathBenefitDisease) > 0
            && parseFormattedNumber(premiumAmount) > 0;
    }, [birthDate, deathBenefitDisease, premiumAmount]);

    const handleCalculate = useCallback(() => {
        const data = {
            client: {
                client_name: clientName,
                birth_date: birthDate,
                gender,
            },
            contract: {
                company_name: companyName,
                policy_type: policyType,
                policy_number: policyNumber,
                contract_date: contractDate,
                issue_age: issueAge,
            },
            coverage: {
                death_benefit_disease: parseFormattedNumber(deathBenefitDisease),
                death_benefit_accident: parseFormattedNumber(deathBenefitAccident),
                hosp_day_disease: parseFormattedNumber(hospDayDisease),
                hosp_day_accident: parseFormattedNumber(hospDayAccident),
                diagnosis_benefit: parseFormattedNumber(diagnosisBenefit),
                policy_end_age: isWholeLife ? 0 : parseFormattedNumber(policyEndAge),
            },
            cost: {
                payment_frequency: paymentFrequency,
                premium_amount: parseFormattedNumber(premiumAmount),
                annual_premium: parseFormattedNumber(annualPremium),
                payment_end_age: parseFormattedNumber(paymentEndAge),
                tax_deduction_type: taxDeductionType,
            },
            savings: {
                cash_value_current: parseFormattedNumber(cashValueCurrent),
                cash_value_milestones: milestones,
                maturity_benefit: parseFormattedNumber(maturityBenefit),
            },
        };
        const diagnosisResult = runDiagnosis(data);
        setResult(diagnosisResult);
        clearDirty();
    }, [
        clientName, birthDate, gender, companyName, policyType, policyNumber,
        contractDate, issueAge, deathBenefitDisease, deathBenefitAccident,
        hospDayDisease, hospDayAccident, diagnosisBenefit, policyEndAge, isWholeLife,
        paymentFrequency, premiumAmount, annualPremium, paymentEndAge, taxDeductionType,
        cashValueCurrent, milestones, maturityBenefit, clearDirty,
    ]);

    const handleClear = useCallback(() => {
        setClientName(''); setBirthDate(''); setGender('male');
        setCompanyName(''); setPolicyType('whole_life'); setPolicyNumber('');
        setContractDate(''); setIssueAge(0);
        setDeathBenefitDisease(''); setDeathBenefitAccident('');
        setHospDayDisease(''); setHospDayAccident('');
        setDiagnosisBenefit(''); setPolicyEndAge(''); setIsWholeLife(true);
        setPaymentFrequency('monthly'); setPremiumAmount('');
        setAnnualPremium(''); setPaymentEndAge('');
        setTaxDeductionType('general_life');
        setCashValueCurrent(''); setMilestones([]); setMaturityBenefit('');
        setResult(null); clearDirty();
    }, [clearDirty]);

    const loadMockData = useCallback(() => {
        const d = MOCK_INSURANCE_DATA;
        setClientName(d.client.client_name);
        setBirthDate(d.client.birth_date);
        setGender(d.client.gender);
        setCompanyName(d.contract.company_name);
        setPolicyType(d.contract.policy_type);
        setPolicyNumber(d.contract.policy_number);
        setContractDate(d.contract.contract_date);
        setIssueAge(d.contract.issue_age);
        setDeathBenefitDisease(formatInputValue(d.coverage.death_benefit_disease));
        setDeathBenefitAccident(formatInputValue(d.coverage.death_benefit_accident));
        setHospDayDisease(formatInputValue(d.coverage.hosp_day_disease));
        setHospDayAccident(formatInputValue(d.coverage.hosp_day_accident));
        setDiagnosisBenefit(formatInputValue(d.coverage.diagnosis_benefit));
        setPolicyEndAge(formatInputValue(d.coverage.policy_end_age));
        setIsWholeLife(d.coverage.policy_end_age === 0);
        setPaymentFrequency(d.cost.payment_frequency);
        setPremiumAmount(formatInputValue(d.cost.premium_amount));
        setAnnualPremium(formatInputValue(d.cost.annual_premium));
        setPaymentEndAge(formatInputValue(d.cost.payment_end_age));
        setTaxDeductionType(d.cost.tax_deduction_type);
        setCashValueCurrent(formatInputValue(d.savings.cash_value_current));
        setMilestones(d.savings.cash_value_milestones);
        setMaturityBenefit(formatInputValue(d.savings.maturity_benefit));
        setResult(null); clearDirty();
    }, [clearDirty]);

    const addMilestone = useCallback(() => {
        const lastAge = milestones.length > 0 ? milestones[milestones.length - 1]!.age : calcAge(birthDate);
        setMilestones(prev => [...prev, { age: lastAge + 5, value: 0 }]);
        markDirty();
    }, [milestones, birthDate, markDirty]);

    const removeMilestone = useCallback((index: number) => {
        setMilestones(prev => prev.filter((_, i) => i !== index));
        markDirty();
    }, [markDirty]);

    const updateMilestone = useCallback((index: number, field: keyof CashValueMilestone, value: number) => {
        setMilestones(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
        markDirty();
    }, [markDirty]);

    return {
        formProps: {
            clientName, setClientName: (v: string) => { setClientName(v); markDirty(); },
            birthDate, setBirthDate: (v: string) => { setBirthDate(v); markDirty(); },
            gender, setGender: (v: Gender) => { setGender(v); markDirty(); },
            companyName, setCompanyName: (v: string) => { setCompanyName(v); markDirty(); },
            policyType, setPolicyType: (v: string) => { setPolicyType(v); markDirty(); },
            policyNumber, setPolicyNumber: (v: string) => { setPolicyNumber(v); markDirty(); },
            contractDate, setContractDate: (v: string) => { setContractDate(v); markDirty(); },
            issueAge,
            deathBenefitDisease, setDeathBenefitDisease: (v: string) => { setDeathBenefitDisease(formatInputValue(v)); markDirty(); },
            deathBenefitAccident, setDeathBenefitAccident: (v: string) => { setDeathBenefitAccident(formatInputValue(v)); markDirty(); },
            hospDayDisease, setHospDayDisease: (v: string) => { setHospDayDisease(formatInputValue(v)); markDirty(); },
            hospDayAccident, setHospDayAccident: (v: string) => { setHospDayAccident(formatInputValue(v)); markDirty(); },
            diagnosisBenefit, setDiagnosisBenefit: (v: string) => { setDiagnosisBenefit(formatInputValue(v)); markDirty(); },
            policyEndAge, setPolicyEndAge: (v: string) => { setPolicyEndAge(v); markDirty(); },
            isWholeLife, setIsWholeLife: (v: boolean) => { setIsWholeLife(v); markDirty(); },
            paymentFrequency, setPaymentFrequency: (v: PaymentFrequency) => { setPaymentFrequency(v); markDirty(); },
            premiumAmount, setPremiumAmount: (v: string) => { setPremiumAmount(formatInputValue(v)); markDirty(); },
            annualPremium,
            paymentEndAge, setPaymentEndAge: (v: string) => { setPaymentEndAge(v); markDirty(); },
            taxDeductionType, setTaxDeductionType: (v: TaxDeductionType) => { setTaxDeductionType(v); markDirty(); },
            cashValueCurrent, setCashValueCurrent: (v: string) => { setCashValueCurrent(formatInputValue(v)); markDirty(); },
            milestones, addMilestone, removeMilestone, updateMilestone,
            maturityBenefit, setMaturityBenefit: (v: string) => { setMaturityBenefit(formatInputValue(v)); markDirty(); },
            canCalculate,
            onCalculate: handleCalculate,
            onClear: handleClear,
            loadMockData,
        },
        result,
        isDirty,
    };
}
