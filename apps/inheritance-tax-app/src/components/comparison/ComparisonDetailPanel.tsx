import React, { memo } from 'react';
import type { ComparisonRow, HeirTaxBreakdown } from '../../types';
import { formatCurrency } from '../../utils';

interface ComparisonDetailPanelProps {
  row: ComparisonRow;
  spouseOwnEstate: number;
  onClose: () => void;
}

const TH_CLASS = 'border border-gray-300 px-4 py-2 text-center font-semibold text-sm';
const TD_CLASS = 'border border-gray-300 px-4 py-2 text-right text-sm';

const HeirTable: React.FC<{
  breakdowns: HeirTaxBreakdown[];
  headerBg: string;
  emptyMessage?: string;
}> = ({ breakdowns, headerBg, emptyMessage }) => (
  <table className="w-full border-collapse">
    <thead>
      <tr className={`${headerBg} text-white`}>
        <th className={TH_CLASS}>相続人</th>
        <th className={TH_CLASS}>取得額</th>
        <th className={TH_CLASS}>納付税額</th>
      </tr>
    </thead>
    <tbody>
      {breakdowns.length > 0 ? (
        breakdowns.map((heir) => (
          <tr key={heir.label} className="hover:bg-green-50">
            <td className={`${TD_CLASS} text-left font-medium`}>{heir.label}</td>
            <td className={TD_CLASS}>{formatCurrency(heir.acquisitionAmount)}</td>
            <td className={TD_CLASS}>{formatCurrency(heir.finalTax)}</td>
          </tr>
        ))
      ) : emptyMessage ? (
        <tr>
          <td colSpan={3} className={`${TD_CLASS} text-center text-gray-400`}>
            {emptyMessage}
          </td>
        </tr>
      ) : null}
    </tbody>
  </table>
);

export const ComparisonDetailPanel: React.FC<ComparisonDetailPanelProps> = memo(({ row, spouseOwnEstate, onClose }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-4 border-2 border-green-200 comparison-detail-print">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">
          配偶者取得割合 {row.ratio}% の相続人別内訳
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none no-print"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1次相続 */}
        <div>
          <h4 className="text-base font-bold text-green-700 mb-2 flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-green-600" />
            1次相続
            <span className="text-sm font-normal text-gray-500">
              （税額合計: {formatCurrency(row.firstTax)}）
            </span>
          </h4>
          <HeirTable breakdowns={row.firstBreakdowns} headerBg="bg-green-600" />
        </div>

        {/* 2次相続 */}
        <div>
          <h4 className="text-base font-bold text-green-800 mb-2 flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-green-800" />
            2次相続
            <span className="text-sm font-normal text-gray-500">
              （遺産額: {formatCurrency(row.secondEstate)}
              <span className="text-xs text-gray-400 ml-1">
                = 固有 {formatCurrency(spouseOwnEstate)} + 取得 {formatCurrency(row.spouseAcquisition)}
              </span>
              {' '}/ 税額合計: {formatCurrency(row.secondTax)}）
            </span>
          </h4>
          <HeirTable
            breakdowns={row.secondBreakdowns}
            headerBg="bg-green-800"
            emptyMessage="2次相続なし（配偶者取得額 0円）"
          />
        </div>
      </div>
    </div>
  );
});

ComparisonDetailPanel.displayName = 'ComparisonDetailPanel';
