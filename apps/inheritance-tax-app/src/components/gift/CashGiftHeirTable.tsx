import React from 'react';
import type { CashGiftSimulationResult, GiftScenarioResult, GiftRecipientResult } from '../../types';
import { formatCurrency, getGiftHeirNetProceeds } from '../../utils';
import { TH, TD } from '../tableStyles';
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

/** シナリオ別テーブル（現状 or 提案） */
const ScenarioTable: React.FC<{
  scenario: GiftScenarioResult;
  recipientResults: GiftRecipientResult[];
  headerBg: string;
}> = ({ scenario, recipientResults, headerBg }) => {
  const { taxResult } = scenario;
  const heirCount = taxResult.heirBreakdowns.length;

  return (
    <div>
      <h4 className="text-base font-bold text-gray-700 mb-2 flex items-center gap-2">
        <span className={`inline-block w-3 h-3 rounded-full bg-green-600`} />
        {scenario.label}
        <span className="text-sm font-normal text-gray-500">
          （税額合計: {formatCurrency(taxResult.totalFinalTax)}）
        </span>
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className={`${headerBg} text-white`}>
              <th className={TH}>相続人</th>
              <th className={TH}>遺産取得額</th>
              <th className={TH}>贈与受取額</th>
              <th className={TH}>贈与税負担</th>
              <th className={TH}>納付相続税</th>
              <th className={TH}>税引後</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: heirCount }, (_, i) => {
              const taxEntry = taxResult.heirBreakdowns[i];
              if (!taxEntry) return null;
              const matching = recipientResults.filter(r => r.heirLabel === taxEntry.label);
              const giftTotal = matching.reduce((s, r) => s + r.totalGift, 0);
              const giftTaxTotal = matching.reduce((s, r) => s + r.totalGiftTax, 0);
              const netProceeds = getGiftHeirNetProceeds(scenario, i, recipientResults);
              return (
                <tr key={taxEntry.label} className="hover:bg-green-50">
                  <td className={`${TD} text-left font-medium`}>{taxEntry.label}</td>
                  <td className={TD}>{formatCurrency(taxEntry.acquisitionAmount)}</td>
                  <td className={TD}>{giftTotal > 0 ? formatCurrency(giftTotal) : '—'}</td>
                  <td className={TD}>{giftTaxTotal > 0 ? formatCurrency(giftTaxTotal) : '—'}</td>
                  <td className={TD}>{formatCurrency(taxEntry.finalTax)}</td>
                  <td className={`${TD} font-bold`}>{formatCurrency(netProceeds)}</td>
                </tr>
              );
            })}
            <tr className="bg-gray-50 font-semibold">
              <td className={`${TD} text-left`}>合計</td>
              <td className={TD}>{formatCurrency(scenario.estateValue)}</td>
              <td className={TD}>
                {recipientResults.length > 0 ? formatCurrency(recipientResults.reduce((s, r) => s + r.totalGift, 0)) : '—'}
              </td>
              <td className={TD}>
                {recipientResults.length > 0 ? formatCurrency(recipientResults.reduce((s, r) => s + r.totalGiftTax, 0)) : '—'}
              </td>
              <td className={TD}>{formatCurrency(taxResult.totalFinalTax)}</td>
              <td className={`${TD} font-bold`}>{formatCurrency(scenario.totalNetProceeds)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

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
        <ScenarioTable scenario={current} recipientResults={[]} headerBg="bg-green-600" />
        <ScenarioTable scenario={proposed} recipientResults={recipientResults} headerBg="bg-green-600" />
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
