import { useState, useCallback } from 'react';
import type { SharedState, CalcResult } from '@/App';
import { calculateBonus, estimatePrevMonthSalaryAfterSI } from '@/lib/bonusCalculator';
import { buildBonusItems } from '@/lib/buildResultItems';
import { useCtrlEnter } from '@/lib/useCtrlEnter';
import { CurrencyInput } from './CurrencyInput';
import { CalcButton } from './CalcButton';

interface BonusFormProps {
  shared: SharedState;
  onResult: (result: CalcResult) => void;
}

export function BonusForm({ shared, onResult }: BonusFormProps) {
  const [bonusAmount, setBonusAmount] = useState('');
  const [prevMonthGross, setPrevMonthGross] = useState('');
  const [useEstimate, setUseEstimate] = useState(true);
  const [prevMonthSalaryAfterSI, setPrevMonthSalaryAfterSI] = useState('');

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

    const result = calculateBonus({
      bonusAmount: bonus,
      prevMonthSalaryAfterSI: prevSalaryAfterSI,
      prefectureCode: shared.prefectureCode,
      dependents: Number(shared.dependents) || 0,
      isNursingCare: shared.isNursingCare,
    });

    onResult({
      type: 'bonus',
      items: buildBonusItems(result),
      takeHomePay: result.takeHomePay,
      grossAmount: result.bonusAmount,
    });
  }, [bonusAmount, prevMonthGross, useEstimate, prevMonthSalaryAfterSI, shared, onResult]);

  const handleKeyDown = useCtrlEnter(handleCalculate);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" onKeyDown={handleKeyDown}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="bonus-amount" className="block text-sm font-bold text-gray-700 mb-1">
            賞与支給額<span className="text-red-500 ml-1">*</span>
          </label>
          <CurrencyInput
            id="bonus-amount"
            value={bonusAmount}
            onChange={setBonusAmount}
            placeholder="500,000"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            前月の給与情報<span className="text-red-500 ml-1">*</span>
          </label>
          <fieldset className="flex items-center gap-3 mb-2">
            <legend className="sr-only">前月給与の入力方法</legend>
            <label className="flex items-center gap-1.5 cursor-pointer text-sm">
              <input
                type="radio"
                name="bonus-prev-method"
                checked={useEstimate}
                onChange={() => setUseEstimate(true)}
              />
              総支給額から概算
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-sm">
              <input
                type="radio"
                name="bonus-prev-method"
                checked={!useEstimate}
                onChange={() => setUseEstimate(false)}
              />
              控除後金額を直接入力
            </label>
          </fieldset>
          {useEstimate ? (
            <CurrencyInput
              id="bonus-prev-gross"
              value={prevMonthGross}
              onChange={setPrevMonthGross}
              placeholder="前月の総支給額"
            />
          ) : (
            <CurrencyInput
              id="bonus-prev-after-si"
              value={prevMonthSalaryAfterSI}
              onChange={setPrevMonthSalaryAfterSI}
              placeholder="社会保険料控除後の金額"
            />
          )}
          <p className="text-xs text-gray-400 mt-1">賞与の源泉徴収税率の決定に使用</p>
        </div>
      </div>

      <CalcButton
        onClick={handleCalculate}
        disabled={!bonusAmount || Number(bonusAmount) <= 0}
      />
    </div>
  );
}
