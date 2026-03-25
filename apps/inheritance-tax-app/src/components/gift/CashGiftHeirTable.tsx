import React from 'react';
import type { CashGiftSimulationResult, GiftScenarioResult, GiftRecipientResult } from '../../types';
import { formatCurrency, getGiftHeirNetProceeds, heirLabelColumn, currencyColumn, currencyOrDashColumn } from '../../utils';
import { CARD, TH, TD } from '../tableStyles';
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

function giftAmountForHeir(rr: GiftRecipientResult[], label: string | undefined, field: 'totalGift' | 'totalGiftTax'): number {
  if (!label) return 0;
  return rr.filter(r => r.heirLabel === label).reduce((s, r) => s + r[field], 0);
}

function buildGiftColumns(scenario: GiftScenarioResult, rr: GiftRecipientResult[]): HeirColumn[] {
  const { taxResult } = scenario;
  const totalGift = rr.reduce((s, r) => s + r.totalGift, 0);
  const totalGiftTax = rr.reduce((s, r) => s + r.totalGiftTax, 0);

  return [
    heirLabelColumn(i => taxResult.heirBreakdowns[i]?.label),
    currencyColumn('遺産取得額', i => taxResult.heirBreakdowns[i]?.acquisitionAmount ?? 0, scenario.estateValue),
    currencyOrDashColumn('贈与受取額', i => giftAmountForHeir(rr, taxResult.heirBreakdowns[i]?.label, 'totalGift'), totalGift),
    currencyOrDashColumn('贈与税負担', i => giftAmountForHeir(rr, taxResult.heirBreakdowns[i]?.label, 'totalGiftTax'), totalGiftTax),
    currencyColumn('納付相続税', i => taxResult.heirBreakdowns[i]?.finalTax ?? 0, taxResult.totalFinalTax),
    currencyColumn('税引後', i => getGiftHeirNetProceeds(scenario, i, rr), scenario.totalNetProceeds, { bold: true }),
  ];
}

export const CashGiftHeirTable: React.FC<CashGiftHeirTableProps> = ({ result }) => {
  const { current, proposed, recipientResults } = result;
  const heirCount = current.taxResult.heirBreakdowns.length;
  const emptyResults: GiftRecipientResult[] = [];

  return (
    <div className={CARD}>
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
