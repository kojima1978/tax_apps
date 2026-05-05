import React, { memo } from 'react';
import type { CashGiftSimulationResult, HeirComposition, SpouseAcquisitionMode } from '../../types';
import { formatCurrency, getHeirInfo, getSpouseModeLabel } from '../../utils';

interface CashGiftPrintConditionsProps {
  result: CashGiftSimulationResult;
  composition: HeirComposition;
  spouseMode: SpouseAcquisitionMode;
}

const taxTypeLabel = {
  special: '特例',
  general: '一般',
} as const;

export const CashGiftPrintConditions: React.FC<CashGiftPrintConditionsProps> = memo(({
  result,
  composition,
  spouseMode,
}) => {
  const { totalHeirsCount } = getHeirInfo(composition);
  const heirLabels = result.current.taxResult.heirBreakdowns.map(b => b.label).join('・') || 'なし';

  return (
    <section className="print-only-block cash-gift-print-conditions">
      <div className="border border-green-200 bg-green-50/70 rounded-lg p-4 mb-4 text-sm">
        <h3 className="font-bold text-gray-800 mb-3 text-base">前提条件</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <dl className="grid grid-cols-[8.5em_1fr] gap-x-2 gap-y-1">
            <dt className="text-gray-500">相続財産の額</dt>
            <dd className="font-medium text-gray-800">{formatCurrency(result.baseEstate)}</dd>
            <dt className="text-gray-500">相続人の数</dt>
            <dd className="font-medium text-gray-800">{totalHeirsCount}人</dd>
            <dt className="text-gray-500">相続人</dt>
            <dd className="font-medium text-gray-800">{heirLabels}</dd>
          </dl>
          <dl className="grid grid-cols-[8.5em_1fr] gap-x-2 gap-y-1">
            <dt className="text-gray-500">配偶者取得割合</dt>
            <dd className="font-medium text-gray-800">{getSpouseModeLabel(spouseMode)}</dd>
            <dt className="text-gray-500">贈与総額</dt>
            <dd className="font-medium text-gray-800">{formatCurrency(result.totalGifts)}</dd>
            <dt className="text-gray-500">贈与税合計</dt>
            <dd className="font-medium text-gray-800">{formatCurrency(result.totalGiftTax)}</dd>
          </dl>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-green-600 text-white">
              <th>受贈者</th>
              <th>区分</th>
              <th>財源相続人</th>
              <th>税率</th>
              <th>年間贈与額</th>
              <th>年数</th>
              <th>総贈与額</th>
              <th>総贈与税</th>
            </tr>
          </thead>
          <tbody>
            {result.recipientResults.map(r => (
              <tr key={r.id}>
                <td className="text-left font-medium">{r.heirLabel}</td>
                <td>{r.isHeir ? '相続人' : '関係者'}</td>
                <td>{r.isHeir ? '本人' : `${r.sourceHeirLabel ?? '未指定'}の相続分`}</td>
                <td>{taxTypeLabel[r.taxType]}</td>
                <td>{formatCurrency(r.annualAmount)}</td>
                <td>{r.years}年</td>
                <td>{formatCurrency(r.totalGift)}</td>
                <td>{r.totalGiftTax > 0 ? formatCurrency(r.totalGiftTax) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
});

CashGiftPrintConditions.displayName = 'CashGiftPrintConditions';
