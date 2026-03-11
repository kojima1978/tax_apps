import { useState, useCallback } from 'react';
import { Calculator } from 'lucide-react';
import type { SharedState } from '@/App';
import type { BonusResult } from '@/lib/bonusCalculator';
import { calculateBonus, estimatePrevMonthSalaryAfterSI } from '@/lib/bonusCalculator';
import { CurrencyInput } from './CurrencyInput';
import { ResultSection } from './ResultSection';
import { formatPercent } from '@/lib/utils';

interface BonusFormProps {
  shared: SharedState;
}

export function BonusForm({ shared }: BonusFormProps) {
  const [bonusAmount, setBonusAmount] = useState('');
  const [prevMonthGross, setPrevMonthGross] = useState('');
  const [useEstimate, setUseEstimate] = useState(true);
  const [prevMonthSalaryAfterSI, setPrevMonthSalaryAfterSI] = useState('');
  const [result, setResult] = useState<BonusResult | null>(null);

  const handleCalculate = useCallback(() => {
    const bonus = Number(bonusAmount) || 0;
    if (bonus <= 0) return;

    let prevSalaryAfterSI: number;
    if (useEstimate) {
      const prevGross = Number(prevMonthGross) || 0;
      if (prevGross <= 0) return;
      prevSalaryAfterSI = estimatePrevMonthSalaryAfterSI(prevGross, shared.prefectureCode, shared.isNursingCare);
    } else {
      prevSalaryAfterSI = Number(prevMonthSalaryAfterSI) || 0;
      if (prevSalaryAfterSI <= 0) return;
    }

    setResult(calculateBonus({
      bonusAmount: bonus,
      prevMonthSalaryAfterSI: prevSalaryAfterSI,
      prefectureCode: shared.prefectureCode,
      dependents: Number(shared.dependents) || 0,
      isNursingCare: shared.isNursingCare,
    }));
  }, [bonusAmount, prevMonthGross, useEstimate, prevMonthSalaryAfterSI, shared]);

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
              賞与支給額<span className="text-red-500 ml-1">*</span>
            </label>
            <CurrencyInput
              value={bonusAmount}
              onChange={setBonusAmount}
              placeholder="500,000"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              前月の給与情報<span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex items-center gap-3 mb-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input
                  type="radio"
                  checked={useEstimate}
                  onChange={() => setUseEstimate(true)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                総支給額から概算
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input
                  type="radio"
                  checked={!useEstimate}
                  onChange={() => setUseEstimate(false)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                控除後金額を直接入力
              </label>
            </div>
            {useEstimate ? (
              <CurrencyInput
                value={prevMonthGross}
                onChange={setPrevMonthGross}
                placeholder="前月の総支給額"
              />
            ) : (
              <CurrencyInput
                value={prevMonthSalaryAfterSI}
                onChange={setPrevMonthSalaryAfterSI}
                placeholder="社会保険料控除後の金額"
              />
            )}
            <p className="text-xs text-gray-400 mt-1">賞与の源泉徴収税率の決定に使用</p>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={handleCalculate}
            disabled={!bonusAmount || Number(bonusAmount) <= 0}
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
          type="bonus"
          items={[
            { label: '賞与支給額', value: result.bonusAmount, isBold: true },
            { label: '健康保険料', value: -result.healthInsurance },
            ...(result.nursingCareInsurance > 0
              ? [{ label: '介護保険料', value: -result.nursingCareInsurance }]
              : []),
            { label: '厚生年金保険料', value: -result.pensionInsurance },
            { label: '雇用保険料', value: -result.employmentInsurance },
            { label: '社会保険料 小計', value: -result.totalSocialInsurance, isBold: true },
            { label: '所得税（源泉徴収）', value: -result.incomeTax, sub: `適用税率 ${formatPercent(result.taxRate)}` },
            { label: '控除合計', value: -result.totalDeductions, isBold: true },
          ]}
          takeHomePay={result.takeHomePay}
          grossAmount={result.bonusAmount}
        />
      )}
    </div>
  );
}
