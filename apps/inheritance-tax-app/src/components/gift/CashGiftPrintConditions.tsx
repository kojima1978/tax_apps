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

function getRecipientDisplayName(result: CashGiftSimulationResult['recipientResults'][number]): string {
  const label = result.heirLabel.trim();
  if (label) return label;
  if (!result.isHeir) return `${result.sourceHeirLabel ?? '財源未指定'}の関係者`;
  return '未指定';
}

export const CashGiftPrintConditions: React.FC<CashGiftPrintConditionsProps> = memo(({
  result,
  composition,
  spouseMode,
}) => {
  const { totalHeirsCount } = getHeirInfo(composition);
  const heirLabels = result.current.taxResult.heirBreakdowns.map(b => b.label).join('・') || 'なし';
  const totalGifts = result.recipientResults.reduce((sum, r) => sum + r.totalGift, 0);
  const totalGiftTax = result.recipientResults.reduce((sum, r) => sum + r.totalGiftTax, 0);

  return (
    <section className="print-only-block cash-gift-print-conditions">
      <div className="cash-gift-print-condition-card border border-green-200 bg-green-50/70 rounded-lg p-4 mb-4 text-sm">
        <h3 className="font-bold text-gray-800 mb-3 text-base">前提条件</h3>
        <div className="cash-gift-condition-meta grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
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

        <div className="cash-gift-print-gift-summary">
          <h4>贈与内容</h4>
          <div className="overflow-x-auto table-scroll-hint">
            <table className="cash-gift-print-recipient-table">
              <colgroup>
                <col className="recipient" />
                <col className="kind" />
                <col className="source" />
                <col className="tax-type" />
                <col className="amount" />
                <col className="years" />
                <col className="amount" />
                <col className="amount" />
              </colgroup>
              <thead>
                <tr>
                  <th>受贈者</th>
                  <th>区分</th>
                  <th>財源</th>
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
                    <td className="recipient-name">{getRecipientDisplayName(r)}</td>
                    <td>
                      <span className="recipient-kind">{r.isHeir ? '相続人' : '関係者'}</span>
                    </td>
                    <td>{r.isHeir ? '本人' : `${r.sourceHeirLabel ?? '未指定'}の相続分`}</td>
                    <td className="text-center">{taxTypeLabel[r.taxType]}</td>
                    <td className="number">{formatCurrency(r.annualAmount)}</td>
                    <td className="text-center">{r.years}年</td>
                    <td className="number">{formatCurrency(r.totalGift)}</td>
                    <td className="number">{r.totalGiftTax > 0 ? formatCurrency(r.totalGiftTax) : '—'}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={4}>合計</td>
                  <td className="number">—</td>
                  <td className="text-center">—</td>
                  <td className="number">{formatCurrency(totalGifts)}</td>
                  <td className="number">{totalGiftTax > 0 ? formatCurrency(totalGiftTax) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
});

CashGiftPrintConditions.displayName = 'CashGiftPrintConditions';
