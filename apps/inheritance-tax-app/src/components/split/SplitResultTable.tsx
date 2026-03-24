import React from 'react';
import type { SplitSimulationResult, SplitSimulationRow } from '../../types';
import { formatCurrency } from '../../utils';
import { CARD, TH, TD } from '../tableStyles';

interface SplitResultTableProps {
  result: SplitSimulationResult;
}

/** 差額のフォーマット */
function formatDiff(diff: number): string {
  if (diff === 0) return '±0';
  return `${diff > 0 ? '+' : ''}${diff.toLocaleString()}`;
}

/** 差額の色クラス */
function diffColor(diff: number): string {
  if (diff > 0) return 'text-red-600';
  if (diff < 0) return 'text-green-700';
  return 'text-gray-400';
}

/** テーブル行を描画 */
function renderRow(
  row: SplitSimulationRow,
  baseTotalTax: number,
  legalTotalTax: number,
  variant: 'base' | 'legal' | 'normal',
) {
  const baseDiff = row.totalFinalTax - baseTotalTax;
  const legalDiff = row.totalFinalTax - legalTotalTax;

  const rowClass = {
    base: 'bg-green-100 font-bold',
    legal: 'bg-blue-50 font-semibold',
    normal: 'hover:bg-gray-50',
  }[variant];

  const cellAccent = {
    base: 'bg-green-100',
    legal: 'bg-blue-50',
    normal: '',
  }[variant];

  const label = variant === 'base'
    ? '基準'
    : variant === 'legal'
      ? '法定'
      : row.rowIndex > 0 ? `+${row.rowIndex}` : String(row.rowIndex);

  return (
    <tr key={variant === 'legal' ? 'legal' : row.rowIndex} className={rowClass}>
      <td className={`${TD} text-center ${variant === 'legal' ? 'text-blue-700' : 'text-gray-500'}`}>
        {label}
      </td>
      {row.acquisitions.map((acq, i) => (
        <td key={`acq-${i}`} className={`${TD} ${cellAccent}`}>
          {acq.toLocaleString()}
        </td>
      ))}
      {row.finalTaxes.map((tax, i) => (
        <td key={`tax-${i}`} className={`${TD} ${cellAccent}`}>
          {tax.toLocaleString()}
        </td>
      ))}
      <td className={`${TD} font-semibold ${cellAccent}`}>
        {row.totalFinalTax.toLocaleString()}
      </td>
      <td className={`${TD} text-center ${variant === 'base' ? cellAccent : diffColor(baseDiff)}`}>
        {variant === 'base' ? '―' : formatDiff(baseDiff)}
      </td>
      <td className={`${TD} text-center ${variant === 'legal' ? cellAccent : diffColor(legalDiff)}`}>
        {variant === 'legal' ? '―' : formatDiff(legalDiff)}
      </td>
    </tr>
  );
}

export const SplitResultTable: React.FC<SplitResultTableProps> = ({ result }) => {
  const { heirLabels, rows, legalRow, totalTax, basicDeduction, estateValue, taxableAmount } = result;
  const heirCount = heirLabels.length;

  const baseRow = rows.find(r => r.isBase);
  const baseTotalTax = baseRow?.totalFinalTax ?? 0;
  const legalTotalTax = legalRow.totalFinalTax;

  return (
    <div className="space-y-6">
      {/* サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '遺産総額', value: formatCurrency(estateValue) },
          { label: '基礎控除額', value: formatCurrency(basicDeduction) },
          { label: '課税遺産総額', value: formatCurrency(taxableAmount) },
          { label: '相続税の総額', value: formatCurrency(totalTax) },
        ].map(item => (
          <div key={item.label} className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-xs text-green-600 font-medium">{item.label}</div>
            <div className="text-sm font-bold text-green-800 mt-1">{item.value}</div>
          </div>
        ))}
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded bg-green-100 border border-green-300" />
          基準行（入力した取得額）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded bg-blue-50 border border-blue-300" />
          法定相続分による分割
        </span>
      </div>

      {/* 結果テーブル */}
      <div className={CARD}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th rowSpan={2} className={`${TH} bg-gray-100 w-12`}>#</th>
                <th colSpan={heirCount} className={`${TH} bg-green-50 text-green-800`}>
                  取得額（万円）
                </th>
                <th colSpan={heirCount} className={`${TH} bg-amber-50 text-amber-800`}>
                  税額（万円）
                </th>
                <th rowSpan={2} className={`${TH} bg-gray-100`}>税額合計</th>
                <th rowSpan={2} className={`${TH} bg-gray-100`}>基準との差</th>
                <th rowSpan={2} className={`${TH} bg-blue-50 text-blue-800`}>法定との差</th>
              </tr>
              <tr>
                {heirLabels.map(label => (
                  <th key={`acq-${label}`} className={`${TH} bg-green-50/50 text-green-700`}>
                    {label}
                  </th>
                ))}
                {heirLabels.map(label => (
                  <th key={`tax-${label}`} className={`${TH} bg-amber-50/50 text-amber-700`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* 法定相続分行（テーブル最上部） */}
              {renderRow(legalRow, baseTotalTax, legalTotalTax, 'legal')}

              {/* シミュレーション行 */}
              {rows.map(row =>
                renderRow(row, baseTotalTax, legalTotalTax, row.isBase ? 'base' : 'normal')
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
