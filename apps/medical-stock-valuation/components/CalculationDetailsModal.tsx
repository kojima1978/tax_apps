'use client';

import { useEffect } from 'react';
import { FormData, CalculationResult } from '@/lib/types';
import { BTN } from '@/lib/button-styles';
import SimilarIndustryDetails from './calculation-details/SimilarIndustryDetails';
import NetAssetDetails from './calculation-details/NetAssetDetails';
import PerShareDetails from './calculation-details/PerShareDetails';

interface CalculationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'similar' | 'netAsset' | 'perShare';
  formData: FormData;
  totalShares: number;
  sizeMultiplier: number;
  result?: CalculationResult;
}

const TITLES = {
  similar: '類似業種比準価額の計算過程',
  netAsset: '純資産価額の計算過程',
  perShare: '1口あたりの評価額の計算過程',
} as const;

export default function CalculationDetailsModal({
  isOpen,
  onClose,
  type,
  formData,
  totalShares,
  sizeMultiplier,
  result,
}: CalculationDetailsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="calculation-details-title">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 id="calculation-details-title" className="text-xl font-bold">{TITLES[type]}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="p-6">
          {type === 'similar' && <SimilarIndustryDetails formData={formData} totalShares={totalShares} sizeMultiplier={sizeMultiplier} />}
          {type === 'netAsset' && <NetAssetDetails formData={formData} totalShares={totalShares} />}
          {type === 'perShare' && result && <PerShareDetails result={result} />}
        </div>
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end">
          <button type="button" onClick={onClose} className={BTN}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
