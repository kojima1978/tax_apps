import React from 'react';
import type { CashGiftSimulationResult, GiftScenarioResult, GiftRecipientResult } from '../../types';
import { formatCurrency, getGiftHeirNetProceeds } from '../../utils';
import { TH, TD } from '../tableStyles';
import { HeirScenarioTable, type HeirColumn } from '../HeirScenarioTable';
import { HeirNetComparisonTable } from '../HeirNetComparisonTable';

interface CashGiftHeirTableProps {
  result: CashGiftSimulationResult;
}

/** 受取人別 贈与詳細テーブル */
const RecipientDetailTable: React.FC<{ recipientResults: GiftRecipientResult[] }> = ({ recipientResults }) => {
  const totalAnnual = recipientResults.reduce((s, r) => s + r.annualAmount, 0);
  const totalGift = recipientResults.reduce((s, r) => s + r.totalGift, 0);
  const totalGiftTaxPerYear = recipientResults.reduce((s, r) => s + r.giftTaxPerYear, 0);
  const totalGiftTax = recipientResults.reduce((s, r) => s + r.totalGiftTax, 0);
  const totalNet = recipientResults.reduce((s, r) => s + r.netGift, 0);

  return (
    <div>
      <h4 className="text-base font-bold text-gray-700 mb-2">受取人別 贈与詳細</h4>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-green-600 text-white">
              <th className={TH}>受取人</th>
              <th className={TH}>贈与年数</th>
              <th className={TH}>年間贈与額</th>
              <th className={TH}>総贈与額</th>
              <th className={TH}>年間贈与税</th>
              <th className={TH}>総贈与税</th>
              <th className={TH}>差引贈与</th>
            </tr>
          </thead>
          <tbody>
            {recipientResults.map(r => (
              <tr key={r.id} className="hover:bg-green-50">
                <td className={`${TD} text-left font-medium`}>{r.heirLabel}</td>
                <td className={`${TD} text-center`}>{r.years}年</td>
                <td className={TD}>{formatCurrency(r.annualAmount)}</td>
                <td className={TD}>{formatCurrency(r.totalGift)}</td>
                <td className={TD}>{r.giftTaxPerYear > 0 ? formatCurrency(r.giftTaxPerYear) : '非課税'}</td>
                <td className={TD}>{r.totalGiftTax > 0 ? formatCurrency(r.totalGiftTax) : '—'}</td>
                <td className={`${TD} font-bold`}>{formatCurrency(r.netGift)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td className={`${TD} text-left`} colSpan={2}>合計</td>
              <td className={TD}>{formatCurrency(totalAnnual)}</td>
              <td className={TD}>{formatCurrency(totalGift)}</td>
              <td className={TD}>{totalGiftTaxPerYear > 0 ? formatCurrency(totalGiftTaxPerYear) : '—'}</td>
              <td className={TD}>{totalGiftTax > 0 ? formatCurrency(totalGiftTax) : '—'}</td>
              <td className={`${TD} font-bold`}>{formatCurrency(totalNet)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

function buildGiftColumns(scenario: GiftScenarioResult, rr: GiftRecipientResult[]): HeirColumn[] {
  const { taxResult } = scenario;
  return [
    { label: '相続人', align: 'left', getValue: i => taxResult.heirBreakdowns[i]?.label, getTotalValue: () => '合計' },
    { label: '遺産取得額', getValue: i => formatCurrency(taxResult.heirBreakdowns[i]?.acquisitionAmount ?? 0), getTotalValue: () => formatCurrency(scenario.estateValue) },
    { label: '贈与受取額', getValue: i => { const g = rr.filter(r => r.heirLabel === taxResult.heirBreakdowns[i]?.label).reduce((s, r) => s + r.totalGift, 0); return g > 0 ? formatCurrency(g) : '—'; }, getTotalValue: () => rr.length > 0 ? formatCurrency(rr.reduce((s, r) => s + r.totalGift, 0)) : '—' },
    { label: '贈与税負担', getValue: i => { const t = rr.filter(r => r.heirLabel === taxResult.heirBreakdowns[i]?.label).reduce((s, r) => s + r.totalGiftTax, 0); return t > 0 ? formatCurrency(t) : '—'; }, getTotalValue: () => rr.length > 0 ? formatCurrency(rr.reduce((s, r) => s + r.totalGiftTax, 0)) : '—' },
    { label: '納付相続税', getValue: i => formatCurrency(taxResult.heirBreakdowns[i]?.finalTax ?? 0), getTotalValue: () => formatCurrency(taxResult.totalFinalTax) },
    { label: '税引後', bold: true, getValue: i => formatCurrency(getGiftHeirNetProceeds(scenario, i, rr)), getTotalValue: () => formatCurrency(scenario.totalNetProceeds) },
  ];
}

export const CashGiftHeirTable: React.FC<CashGiftHeirTableProps> = ({ result }) => {
  const { current, proposed, recipientResults } = result;
  const heirCount = current.taxResult.heirBreakdowns.length;
  const emptyResults: GiftRecipientResult[] = [];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">相続人別内訳</h3>

      <div className="mb-6">
        <RecipientDetailTable recipientResults={recipientResults} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <HeirScenarioTable
          label={current.label}
          taxTotal={current.taxResult.totalFinalTax}
          headerBg="bg-green-600"
          heirCount={heirCount}
          getHeirKey={i => current.taxResult.heirBreakdowns[i]?.label || String(i)}
          columns={buildGiftColumns(current, [])}
        />
        <HeirScenarioTable
          label={proposed.label}
          taxTotal={proposed.taxResult.totalFinalTax}
          headerBg="bg-green-600"
          heirCount={heirCount}
          getHeirKey={i => proposed.taxResult.heirBreakdowns[i]?.label || String(i)}
          columns={buildGiftColumns(proposed, recipientResults)}
        />
      </div>

      <HeirNetComparisonTable
        heirCount={heirCount}
        getLabel={i => current.taxResult.heirBreakdowns[i]?.label || ''}
        getCurrentNet={i => getGiftHeirNetProceeds(current, i, emptyResults)}
        getProposedNet={i => getGiftHeirNetProceeds(proposed, i, recipientResults)}
        totalCurrentNet={current.totalNetProceeds}
        totalProposedNet={proposed.totalNetProceeds}
        totalDiff={result.netProceedsDiff}
      />
    </div>
  );
};
