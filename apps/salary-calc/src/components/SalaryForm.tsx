import { useState, useCallback } from 'react';
import { Calculator } from 'lucide-react';
import type { SharedState } from '@/App';
import type { SalaryInput, SalaryResult } from '@/lib/salaryCalculator';
import { calculateSalary } from '@/lib/salaryCalculator';
import { CurrencyInput } from './CurrencyInput';
import { ResultSection } from './ResultSection';

interface SalaryFormProps {
  shared: SharedState;
}

export function SalaryForm({ shared }: SalaryFormProps) {
  const [grossSalary, setGrossSalary] = useState('');
  const [commuteAllowance, setCommuteAllowance] = useState('');
  const [residentTax, setResidentTax] = useState('');
  const [result, setResult] = useState<SalaryResult | null>(null);

  const handleCalculate = useCallback(() => {
    const input: SalaryInput = {
      grossSalary: Number(grossSalary) || 0,
      commuteAllowance: Number(commuteAllowance) || 0,
      prefectureCode: shared.prefectureCode,
      dependents: Number(shared.dependents) || 0,
      isNursingCare: shared.isNursingCare,
      residentTax: Number(residentTax) || 0,
    };
    if (input.grossSalary <= 0) return;
    setResult(calculateSalary(input));
  }, [grossSalary, commuteAllowance, shared, residentTax]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCalculate();
    }
  }, [handleCalculate]);

  return (
    <div onKeyDown={handleKeyDown}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              総支給額（月額）<span className="text-red-500 ml-1">*</span>
            </label>
            <CurrencyInput
              value={grossSalary}
              onChange={setGrossSalary}
              placeholder="300,000"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              通勤手当（非課税）
            </label>
            <CurrencyInput
              value={commuteAllowance}
              onChange={setCommuteAllowance}
              placeholder="15,000"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              住民税（月額）
            </label>
            <CurrencyInput
              value={residentTax}
              onChange={setResidentTax}
              placeholder="15,000"
            />
            <p className="text-xs text-gray-400 mt-1">前年所得に基づくため手入力</p>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={handleCalculate}
            disabled={!grossSalary || Number(grossSalary) <= 0}
            className="inline-flex items-center gap-2 px-8 py-3 bg-[var(--color-primary)] text-white font-bold rounded-lg hover:bg-[var(--color-primary-light)] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm cursor-pointer"
          >
            <Calculator size={20} />
            計算する
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">Ctrl + Enter でも計算できます</p>
      </div>

      {result && (
        <ResultSection
          type="salary"
          items={[
            { label: '総支給額', value: result.grossSalary, isBold: true },
            { label: '健康保険料', value: -result.healthInsurance, sub: `標準報酬月額 ¥${result.healthStandardMonthly.toLocaleString()}` },
            ...(result.nursingCareInsurance > 0
              ? [{ label: '介護保険料', value: -result.nursingCareInsurance }]
              : []),
            { label: '厚生年金保険料', value: -result.pensionInsurance, sub: `標準報酬月額 ¥${result.pensionStandardMonthly.toLocaleString()}` },
            { label: '雇用保険料', value: -result.employmentInsurance },
            { label: '社会保険料 小計', value: -result.totalSocialInsurance, isBold: true },
            { label: '所得税（源泉徴収）', value: -result.incomeTax },
            ...(result.residentTax > 0
              ? [{ label: '住民税', value: -result.residentTax }]
              : []),
            { label: '控除合計', value: -result.totalDeductions, isBold: true },
          ]}
          takeHomePay={result.takeHomePay}
          grossAmount={result.grossSalary}
        />
      )}
    </div>
  );
}
