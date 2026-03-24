import React, { useMemo } from 'react';
import Coins from 'lucide-react/icons/coins';
import Scale from 'lucide-react/icons/scale';
import type { HeirAcquisition } from '../../types';
import { CARD, INPUT_FOCUS } from '../tableStyles';
import { formatCurrency } from '../../utils';

interface AcquisitionInputsProps {
  estateValue: number;
  acquisitions: HeirAcquisition[];
  onChange: (acquisitions: HeirAcquisition[]) => void;
  onFillLegal: () => void;
  hasError?: boolean;
}

type DiffStatus = 'match' | 'unallocated' | 'over' | 'empty';

const DIFF_STYLES: Record<DiffStatus, { className: string; text: (v: number) => string }> = {
  match:       { className: 'text-green-600', text: () => 'なし（一致）' },
  unallocated: { className: 'text-amber-600', text: v => `+${formatCurrency(v)}（未配分）` },
  over:        { className: 'text-red-600',   text: v => `${formatCurrency(v)}（超過）` },
  empty:       { className: 'text-gray-400',  text: () => '' },
};

export const AcquisitionInputs: React.FC<AcquisitionInputsProps> = ({
  estateValue,
  acquisitions,
  onChange,
  onFillLegal,
  hasError,
}) => {
  const total = acquisitions.reduce((s, h) => s + h.amount, 0);
  const diff = estateValue - total;

  const diffStatus: DiffStatus = useMemo(() => {
    if (estateValue <= 0) return 'empty';
    if (diff === 0) return 'match';
    return diff > 0 ? 'unallocated' : 'over';
  }, [estateValue, diff]);

  const handleAmountChange = (index: number, value: number) => {
    const next = acquisitions.map((h, i) => i === index ? { ...h, amount: value } : h);
    onChange(next);
  };

  return (
    <div className={`${CARD} ${hasError ? 'ring-2 ring-red-400' : ''}`}>
      <div className="flex items-end justify-between mb-4">
        <div className="flex items-center gap-2.5 pl-3 border-l-4 border-green-500">
          <Coins className="w-5 h-5 text-green-600" aria-hidden="true" />
          <h2 className="text-xl font-bold text-gray-800">各相続人の取得額</h2>
        </div>
        <button
          type="button"
          onClick={onFillLegal}
          disabled={estateValue <= 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Scale className="w-3.5 h-3.5" />
          法定相続分で入力
        </button>
      </div>

      <div className="space-y-3">
        {acquisitions.map((heir, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 w-20 flex-shrink-0">
              {heir.label}
            </span>
            <input
              type="number"
              value={heir.amount || ''}
              onChange={e => handleAmountChange(i, Number(e.target.value) || 0)}
              onWheel={e => e.currentTarget.blur()}
              min={0}
              step={100}
              inputMode="numeric"
              className={`flex-1 px-3 py-2 border rounded-lg text-right text-sm ${INPUT_FOCUS} ${hasError && heir.amount <= 0 ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-green-400'}`}
              placeholder="0"
            />
            <span className="text-gray-600 text-sm whitespace-nowrap">万円</span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">取得額合計</span>
          <span className="font-semibold">{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">遺産総額</span>
          <span className="font-semibold">{formatCurrency(estateValue)}</span>
        </div>
        {diffStatus !== 'empty' && (
          <div className={`flex justify-between text-sm font-bold ${DIFF_STYLES[diffStatus].className}`}>
            <span>差額</span>
            <span>{DIFF_STYLES[diffStatus].text(Math.abs(diff))}</span>
          </div>
        )}
      </div>
    </div>
  );
};
