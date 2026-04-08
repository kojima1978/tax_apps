import { useState, useMemo, useCallback } from 'react';
import { calcAll } from '@/lib/tax-calc';
import { parseNumber } from '@/lib/utils';
import type { IncomeInputs, DeductionInputs, DependentCounts, TaxResult } from '@/lib/tax-calc';

export interface FormState {
  // 収入金額等
  salaryRevenue: string;
  pensionRevenue: string;
  pensionAge65: boolean;
  businessRevenue: string;
  businessExpenses: string;
  temporaryRevenue: string;
  temporaryExpenses: string;
  miscIncome: string;
  // 所得から差し引かれる金額
  socialInsurance: string;
  lifeInsurance: string;
  earthquakeInsurance: string;
  medical: string;
  donation: string;
  hasSpouse: boolean;
  spouseIncome: string;
  dependentGeneral: string;
  dependentSpecific: string;
  dependentElderly: string;
  dependentElderlyCohabit: string;
}

const INITIAL_STATE: FormState = {
  salaryRevenue: '',
  pensionRevenue: '',
  pensionAge65: false,
  businessRevenue: '',
  businessExpenses: '',
  temporaryRevenue: '',
  temporaryExpenses: '',
  miscIncome: '',
  socialInsurance: '',
  lifeInsurance: '',
  earthquakeInsurance: '',
  medical: '',
  donation: '',
  hasSpouse: false,
  spouseIncome: '',
  dependentGeneral: '',
  dependentSpecific: '',
  dependentElderly: '',
  dependentElderlyCohabit: '',
};

export function useTaxForm() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const result: TaxResult = useMemo(() => {
    const incomeInputs: IncomeInputs = {
      salaryRevenue: parseNumber(form.salaryRevenue),
      pensionRevenue: parseNumber(form.pensionRevenue),
      pensionAge65: form.pensionAge65,
      businessRevenue: parseNumber(form.businessRevenue),
      businessExpenses: parseNumber(form.businessExpenses),
      temporaryRevenue: parseNumber(form.temporaryRevenue),
      temporaryExpenses: parseNumber(form.temporaryExpenses),
      miscIncome: parseNumber(form.miscIncome),
    };

    const dependents: DependentCounts = {
      general: parseNumber(form.dependentGeneral),
      specific: parseNumber(form.dependentSpecific),
      elderly: parseNumber(form.dependentElderly),
      elderlyCohabit: parseNumber(form.dependentElderlyCohabit),
    };

    const deductionInputs: DeductionInputs = {
      socialInsurance: parseNumber(form.socialInsurance),
      lifeInsurance: parseNumber(form.lifeInsurance),
      earthquakeInsurance: parseNumber(form.earthquakeInsurance),
      medical: parseNumber(form.medical),
      donation: parseNumber(form.donation),
      spouseIncome: form.hasSpouse ? parseNumber(form.spouseIncome) : -1,
      dependents,
    };

    return calcAll(incomeInputs, deductionInputs);
  }, [form]);

  const reset = useCallback(() => setForm(INITIAL_STATE), []);

  return { form, updateField, result, reset };
}
