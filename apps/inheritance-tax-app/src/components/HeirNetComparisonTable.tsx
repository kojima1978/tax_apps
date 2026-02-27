import React from 'react';
import { formatCurrency, formatDelta } from '../utils';
import { TH, TD } from './tableStyles';

interface HeirNetComparisonTableProps {
  heirCount: number;
  getLabel: (index: number) => string;
  getCurrentNet: (index: number) => number;
  getProposedNet: (index: number) => number;
  totalCurrentNet: number;
  totalProposedNet: number;
  totalDiff: number;
}

export const HeirNetComparisonTable: React.FC<HeirNetComparisonTableProps> = ({
  heirCount,
  getLabel,
  getCurrentNet,
  getProposedNet,
  totalCurrentNet,
  totalProposedNet,
  totalDiff,
}) => {
  return (
    <div>
      <h4 className="text-base font-bold text-gray-700 mb-2">相続人別 納税後比較</h4>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-green-600 text-white">
              <th className={TH}>相続人</th>
              <th className={TH}>現状 納税後</th>
              <th className={TH}>提案 納税後</th>
              <th className={TH}>差額（Δ）</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: heirCount }, (_, i) => {
              const label = getLabel(i);
              const currentNet = getCurrentNet(i);
              const proposedNet = getProposedNet(i);
              const diff = proposedNet - currentNet;
              return (
                <tr key={label} className="hover:bg-green-50">
                  <td className={`${TD} text-left font-medium`}>{label}</td>
                  <td className={TD}>{formatCurrency(currentNet)}</td>
                  <td className={TD}>{formatCurrency(proposedNet)}</td>
                  <td className={`${TD} font-medium ${diff > 0 ? 'text-green-700' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {diff !== 0 ? formatDelta(diff) : '—'}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-green-50 font-semibold">
              <td className={`${TD} text-left`}>合計</td>
              <td className={TD}>{formatCurrency(totalCurrentNet)}</td>
              <td className={TD}>{formatCurrency(totalProposedNet)}</td>
              <td className={`${TD} font-bold ${totalDiff > 0 ? 'text-green-700' : totalDiff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {totalDiff !== 0 ? formatDelta(totalDiff) : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
