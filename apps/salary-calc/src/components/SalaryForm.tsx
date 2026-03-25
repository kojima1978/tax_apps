import { useState, useCallback } from 'react';
import type { SharedState, CalcResult } from '@/App';
import type { SalaryInput } from '@/lib/salaryCalculator';
import { calculateSalary } from '@/lib/salaryCalculator';
import { buildSalaryItems } from '@/lib/buildResultItems';
import { useCtrlEnter } from '@/lib/useCtrlEnter';
import { CurrencyInput } from './CurrencyInput';
import { CalcButton } from './CalcButton';

interface SalaryFormProps {
  shared: SharedState;
  onResult: (result: CalcResult) => void;
}

export function SalaryForm({ shared, onResult }: SalaryFormProps) {
  const [grossSalary, setGrossSalary] = useState('');
  const [commuteAllowance, setCommuteAllowance] = useState('');
  const [residentTax, setResidentTax] = useState('');

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
    const result = calculateSalary(input);
    onResult({
      type: 'salary',
      items: buildSalaryItems(result),
      takeHomePay: result.takeHomePay,
      grossAmount: result.grossSalary,
    });
  }, [grossSalary, commuteAllowance, shared, residentTax, onResult]);

  const handleKeyDown = useCtrlEnter(handleCalculate);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" onKeyDown={handleKeyDown}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="salary-gross" className="block text-sm font-bold text-gray-700 mb-1">
            総支給額（月額）<span className="text-red-500 ml-1">*</span>
          </label>
          <CurrencyInput
            id="salary-gross"
            value={grossSalary}
            onChange={setGrossSalary}
            placeholder="300,000"
          />
        </div>

        <div>
          <label htmlFor="salary-commute" className="block text-sm font-bold text-gray-700 mb-1">
            通勤手当（非課税）
          </label>
          <CurrencyInput
            id="salary-commute"
            value={commuteAllowance}
            onChange={setCommuteAllowance}
            placeholder="15,000"
          />
        </div>

        <div>
          <label htmlFor="salary-resident-tax" className="block text-sm font-bold text-gray-700 mb-1">
            住民税（月額）
          </label>
          <CurrencyInput
            id="salary-resident-tax"
            value={residentTax}
            onChange={setResidentTax}
            placeholder="15,000"
          />
          <p className="text-xs text-gray-400 mt-1">前年所得に基づくため手入力</p>
        </div>
      </div>

      <CalcButton
        onClick={handleCalculate}
        disabled={!grossSalary || Number(grossSalary) <= 0}
      />
    </div>
  );
}
