import React from 'react';
import type { CashGiftSimulationResult, GiftScenarioResult, GiftRecipientResult } from '../../types';
import { formatCurrency, formatDelta, heirLabelColumn, currencyColumn } from '../../utils';
import { CARD, TH, TD } from '../tableStyles';
import { HeirScenarioTable, type HeirColumn } from '../HeirScenarioTable';

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
      <div className="overflow-x-auto table-scroll-hint">
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

type GiftGroupTotals = {
  ownGift: number;
  relatedGift: number;
  totalGift: number;
  ownGiftTax: number;
  relatedGiftTax: number;
  totalGiftTax: number;
  ownNetGift: number;
  relatedNetGift: number;
  totalNetGift: number;
};

function formatCurrencyOrDash(value: number): string {
  return value > 0 ? formatCurrency(value) : '—';
}

const AmountWithBreakdown: React.FC<{
  total: number;
  own: number;
  related: number;
  showBreakdown?: boolean;
  reserveBreakdownSpace?: boolean;
}> = ({ total, own, related, showBreakdown, reserveBreakdownSpace }) => {
  const shouldShowBreakdown = showBreakdown ?? related > 0;
  if (!shouldShowBreakdown && !reserveBreakdownSpace) return <>{formatCurrencyOrDash(total)}</>;

  return (
    <div className="leading-tight">
      <div>{formatCurrencyOrDash(total)}</div>
      <div className={`mt-1 text-[11px] md:text-xs leading-snug text-gray-500 ${shouldShowBreakdown ? '' : 'invisible'}`}>
        <div>本人 {formatCurrencyOrDash(own)}</div>
        <div>関係者 {formatCurrencyOrDash(related)}</div>
      </div>
    </div>
  );
};

function getGiftGroupTotals(rr: GiftRecipientResult[], label: string | undefined): GiftGroupTotals {
  const totals: GiftGroupTotals = {
    ownGift: 0,
    relatedGift: 0,
    totalGift: 0,
    ownGiftTax: 0,
    relatedGiftTax: 0,
    totalGiftTax: 0,
    ownNetGift: 0,
    relatedNetGift: 0,
    totalNetGift: 0,
  };

  if (!label) return totals;

  for (const r of rr) {
    if (r.isHeir && r.heirLabel === label) {
      totals.ownGift += r.totalGift;
      totals.ownGiftTax += r.totalGiftTax;
      totals.ownNetGift += r.netGift;
    } else if (!r.isHeir && r.sourceHeirLabel === label) {
      totals.relatedGift += r.totalGift;
      totals.relatedGiftTax += r.totalGiftTax;
      totals.relatedNetGift += r.netGift;
    }
  }

  totals.totalGift = totals.ownGift + totals.relatedGift;
  totals.totalGiftTax = totals.ownGiftTax + totals.relatedGiftTax;
  totals.totalNetGift = totals.ownNetGift + totals.relatedNetGift;
  return totals;
}

function buildGiftColumns(
  scenario: GiftScenarioResult,
  rr: GiftRecipientResult[],
  reserveBreakdownSpace = false,
): HeirColumn[] {
  const { taxResult } = scenario;
  const giftGroups = taxResult.heirBreakdowns.map(b => getGiftGroupTotals(rr, b.label));
  const acqTotal = taxResult.heirBreakdowns.reduce((s, b) => s + b.acquisitionAmount, 0);
  const giftTotal = giftGroups.reduce((s, g) => s + g.totalGift, 0);
  const giftTaxTotal = giftGroups.reduce((s, g) => s + g.totalGiftTax, 0);

  const getOwnNetProceeds = (i: number) => {
    const b = taxResult.heirBreakdowns[i];
    if (!b) return 0;
    return b.acquisitionAmount - b.finalTax + (giftGroups[i]?.ownNetGift ?? 0);
  };
  const getNetProceeds = (i: number) => getOwnNetProceeds(i) + (giftGroups[i]?.relatedNetGift ?? 0);
  const netTotal = taxResult.heirBreakdowns.reduce((s, _, i) => s + getNetProceeds(i), 0);

  return [
    heirLabelColumn(i => taxResult.heirBreakdowns[i]?.label),
    currencyColumn('遺産取得額', i => taxResult.heirBreakdowns[i]?.acquisitionAmount ?? 0, acqTotal),
    {
      label: '贈与額',
      getValue: i => (
        <AmountWithBreakdown
          total={giftGroups[i]?.totalGift ?? 0}
          own={giftGroups[i]?.ownGift ?? 0}
          related={giftGroups[i]?.relatedGift ?? 0}
          showBreakdown={(giftGroups[i]?.relatedGift ?? 0) > 0}
          reserveBreakdownSpace={reserveBreakdownSpace}
        />
      ),
      getTotalValue: () => formatCurrencyOrDash(giftTotal),
    },
    {
      label: '贈与税負担',
      getValue: i => (
        <AmountWithBreakdown
          total={giftGroups[i]?.totalGiftTax ?? 0}
          own={giftGroups[i]?.ownGiftTax ?? 0}
          related={giftGroups[i]?.relatedGiftTax ?? 0}
          showBreakdown={(giftGroups[i]?.relatedGift ?? 0) > 0}
          reserveBreakdownSpace={reserveBreakdownSpace}
        />
      ),
      getTotalValue: () => formatCurrencyOrDash(giftTaxTotal),
    },
    currencyColumn('納付相続税', i => taxResult.heirBreakdowns[i]?.finalTax ?? 0, taxResult.totalFinalTax),
    {
      label: '税引後',
      bold: true,
      getValue: i => (
        <AmountWithBreakdown
          total={getNetProceeds(i)}
          own={getOwnNetProceeds(i)}
          related={giftGroups[i]?.relatedNetGift ?? 0}
          showBreakdown={(giftGroups[i]?.relatedGift ?? 0) > 0}
          reserveBreakdownSpace={reserveBreakdownSpace}
        />
      ),
      getTotalValue: () => formatCurrency(netTotal),
    },
  ];
}

const CalcProcessMatrix: React.FC<{ result: CashGiftSimulationResult }> = ({ result }) => {
  const { current, proposed, totalGifts, totalGiftTax, baseEstate } = result;
  const currentTax = current.taxResult.totalFinalTax;
  const proposedTax = proposed.taxResult.totalFinalTax;

  const rows: {
    label: string;
    currentVal: number;
    proposedVal: number;
    colorDiff?: boolean;
    bold?: boolean;
    giftDeduct?: boolean;
  }[] = [
    { label: '元の財産額',   currentVal: baseEstate,           proposedVal: baseEstate },
    { label: '生前贈与額',   currentVal: 0,                    proposedVal: totalGifts,               giftDeduct: true },
    { label: '課税遺産額',   currentVal: current.estateValue,  proposedVal: proposed.estateValue },
    { label: '相続税',       currentVal: currentTax,           proposedVal: proposedTax,               colorDiff: true },
    { label: '贈与税',       currentVal: 0,                    proposedVal: totalGiftTax,              colorDiff: true },
    { label: '税負担合計',   currentVal: currentTax,           proposedVal: proposedTax + totalGiftTax, colorDiff: true, bold: true },
  ];

  return (
    <div>
      <h4 className="text-base font-bold text-gray-700 mb-2">計算過程</h4>
      <div className="overflow-x-auto table-scroll-hint">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-green-600 text-white">
              <th className={TH}>項目</th>
              <th className={TH}>対策前</th>
              <th className={TH}>対策後</th>
              <th className={TH}>差額（Δ）</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const diff = row.proposedVal - row.currentVal;
              const diffColor = row.colorDiff
                ? diff < 0 ? 'text-green-700' : diff > 0 ? 'text-red-600' : 'text-gray-400'
                : 'text-gray-500';
              return (
                <tr key={row.label} className={row.bold ? 'bg-green-50 font-semibold' : 'hover:bg-green-50'}>
                  <td className={`${TD} text-left font-medium`}>{row.label}</td>
                  <td className={TD}>{row.currentVal > 0 ? formatCurrency(row.currentVal) : '—'}</td>
                  <td className={TD}>
                    {row.proposedVal > 0
                      ? (row.giftDeduct ? `− ${formatCurrency(row.proposedVal)}` : formatCurrency(row.proposedVal))
                      : '—'}
                  </td>
                  <td className={`${TD} font-medium ${diffColor}`}>
                    {diff !== 0 ? formatDelta(diff) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const CashGiftHeirTable: React.FC<CashGiftHeirTableProps> = ({ result }) => {
  const { current, proposed, recipientResults } = result;
  const heirCount = current.taxResult.heirBreakdowns.length;
  const hasRelatedGiftGroups = recipientResults.some(r => !r.isHeir && !!r.sourceHeirLabel);

  return (
    <div className={CARD}>
      <h3 className="text-lg font-bold text-gray-800 mb-4">相続人別内訳</h3>

      <div className="mb-6">
        <RecipientDetailTable recipientResults={recipientResults} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-6 mb-6">
        <HeirScenarioTable
          label={current.label}
          taxTotal={current.taxResult.totalFinalTax}
          headerBg="bg-green-600"
          heirCount={heirCount}
          getHeirKey={i => current.taxResult.heirBreakdowns[i]?.label || String(i)}
          columns={buildGiftColumns(current, [], hasRelatedGiftGroups)}
        />
        <HeirScenarioTable
          label={proposed.label}
          taxTotal={proposed.taxResult.totalFinalTax + result.totalGiftTax}
          taxLabel="相続税＋贈与税"
          headerBg="bg-green-600"
          heirCount={heirCount}
          getHeirKey={i => proposed.taxResult.heirBreakdowns[i]?.label || String(i)}
          columns={buildGiftColumns(proposed, recipientResults, hasRelatedGiftGroups)}
        />
      </div>

      <CalcProcessMatrix result={result} />
    </div>
  );
};
