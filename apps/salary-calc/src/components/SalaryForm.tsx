import { useState, useCallback } from 'react';
import type { SharedState, CalcResult } from '@/App';
import type { SalaryInput } from '@/lib/salaryCalculator';
import { calculateSalary } from '@/lib/salaryCalculator';
import { buildSalaryItems } from '@/lib/buildResultItems';
import { useCtrlEnter } from '@/lib/useCtrlEnter';
import { HEALTH_GRADES, GRADE_COUNT, getGradeNumber } from '@/data/standardRemuneration';
import { CurrencyInput } from './CurrencyInput';
import { CalcButton } from './CalcButton';

interface SalaryFormProps {
  shared: SharedState;
  onResult: (result: CalcResult) => void;
}

const GRADE_OPTIONS = Array.from({ length: GRADE_COUNT }, (_, i) => {
  const g = HEALTH_GRADES[i];
  return { value: i + 1, label: `第${i + 1}級（¥${g.amount.toLocaleString()}）` };
});

export function SalaryForm({ shared, onResult }: SalaryFormProps) {
  const [grossSalary, setGrossSalary] = useState('');
  const [commuteAllowance, setCommuteAllowance] = useState('');
  const [residentTax, setResidentTax] = useState('');
  const [gradeOverride, setGradeOverride] = useState<number | null>(null);
  const [autoGrade, setAutoGrade] = useState<number | null>(null);

  const runCalc = useCallback((overrideGrade?: number | null) => {
    const gross = Number(grossSalary) || 0;
    if (gross <= 0) return;
    const input: SalaryInput = {
      grossSalary: gross,
      commuteAllowance: Number(commuteAllowance) || 0,
      prefectureCode: shared.prefectureCode,
      dependents: Number(shared.dependents) || 0,
      isNursingCare: shared.isNursingCare,
      residentTax: Number(residentTax) || 0,
      gradeOverride: overrideGrade ?? undefined,
    };
    const result = calculateSalary(input);
    onResult({
      type: 'salary',
      items: buildSalaryItems(result),
      takeHomePay: result.takeHomePay,
      grossAmount: result.grossSalary,
    });
  }, [grossSalary, commuteAllowance, shared, residentTax, onResult]);

  const handleCalculate = useCallback(() => {
    const gross = Number(grossSalary) || 0;
    if (gross <= 0) return;
    setAutoGrade(getGradeNumber(gross));
    setGradeOverride(null);
    runCalc(null);
  }, [grossSalary, runCalc]);

  const handleGradeChange = useCallback((value: string) => {
    const grade = Number(value);
    setGradeOverride(grade);
    runCalc(grade);
  }, [runCalc]);

  const handleKeyDown = useCtrlEnter(handleCalculate);

  const currentGrade = gradeOverride ?? autoGrade;
  const isOverridden = gradeOverride !== null && autoGrade !== null && gradeOverride !== autoGrade;

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

        {currentGrade !== null && (
          <div>
            <label htmlFor="salary-grade" className="block text-sm font-bold text-gray-700 mb-1">
              標準報酬月額等級
              {isOverridden && (
                <button
                  type="button"
                  onClick={() => {
                    setGradeOverride(null);
                    runCalc(null);
                  }}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-800 font-normal cursor-pointer"
                >
                  自動に戻す（第{autoGrade}級）
                </button>
              )}
            </label>
            <select
              id="salary-grade"
              value={currentGrade}
              onChange={(e) => handleGradeChange(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isOverridden
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {GRADE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {isOverridden ? '手動で変更済み' : '総支給額から自動判定'}
            </p>
          </div>
        )}
      </div>

      <CalcButton
        onClick={handleCalculate}
        disabled={!grossSalary || Number(grossSalary) <= 0}
      />
    </div>
  );
}
