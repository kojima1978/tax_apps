import React, { useMemo } from 'react';
import type { CashGiftSimulationResult } from '../../types';
import { formatCurrency } from '../../utils';
import { CARD } from '../tableStyles';
import { HeirScenarioTable } from '../HeirScenarioTable';
import {
  buildGiftColumns,
  CIRCLED_NUMBERS,
  formatCurrencyOrDash,
  formatGiftGroupMembers,
  formatManNumber,
  formatManTotal,
  formatSignedDeduction,
  getGiftConditionGroups,
  getGiftTimelineTotals,
  getGiftYearLabels,
  GIFT_YEAR_COLUMN_COUNT,
} from './cashGiftReportUtils';

interface CashGiftHeirTableProps {
  result: CashGiftSimulationResult;
}

const GiftTaxCalculationWorkbook: React.FC<{ result: CashGiftSimulationResult }> = ({ result }) => {
  const recipients = result.recipientResults;
  const startDate = useMemo(() => new Date(), []);
  const conditionGroups = useMemo(() => getGiftConditionGroups(recipients), [recipients]);
  const yearLabels = useMemo(
    () => getGiftYearLabels(startDate),
    [startDate],
  );
  const {
    amountByYear,
    taxByYear,
    amountAfterTimeline,
    taxAfterTimeline,
  } = useMemo(() => getGiftTimelineTotals(recipients), [recipients]);

  return (
    <section className="cash-gift-report-section">
      <div className="cash-gift-workbook-heading">
        <h3>贈与税の計算</h3>
      </div>

      {/* 条件テーブルは年次テーブルと重複するため廃止。人数内訳だけ行見出しに残している */}
      <div className="overflow-x-auto table-scroll-hint">
        <table className="cash-gift-year-total-table w-full min-w-[900px] border-collapse">
          <thead>
            <tr>
              <th className="cash-gift-unit-cell" colSpan={2}>（単位：万円）</th>
              {yearLabels.map(label => <th key={label}>{label}</th>)}
              <th>以降</th>
              <th>合計</th>
            </tr>
          </thead>
          <tbody>
            {conditionGroups.map((group, index) => {
              const groupIndex = CIRCLED_NUMBERS[index] ?? `${index + 1}.`;
              const groupAmountAfterTimeline = group.years > GIFT_YEAR_COLUMN_COUNT ? group.annualAmount : 0;
              const groupTaxAfterTimeline = group.years > GIFT_YEAR_COLUMN_COUNT ? group.giftTaxPerYear : 0;

              return (
                <React.Fragment key={group.key}>
                  <tr>
                    <th>{groupIndex} {group.groupLabel}グループ{formatGiftGroupMembers(group)}</th>
                    <th>贈与額</th>
                    {yearLabels.map((label, i) => <td key={label}>{formatManNumber(i < group.years ? group.annualAmount : 0)}</td>)}
                    <td>{formatManNumber(groupAmountAfterTimeline)}</td>
                    <td>{formatManTotal(group.totalGift)}</td>
                  </tr>
                  <tr>
                    <th className="cash-gift-second-line-cell"></th>
                    <th className="cash-gift-second-line-label">贈与税額</th>
                    {yearLabels.map((label, i) => <td key={label}>{formatManNumber(i < group.years ? group.giftTaxPerYear : 0)}</td>)}
                    <td>{formatManNumber(groupTaxAfterTimeline)}</td>
                    <td>{formatManTotal(group.totalGiftTax)}</td>
                  </tr>
                </React.Fragment>
              );
            })}
            <tr className="cash-gift-year-total-summary cash-gift-year-total-summary-start">
              <th>合計</th>
              <th>贈与額</th>
              {amountByYear.map((value, i) => <td key={yearLabels[i]}>{formatManNumber(value)}</td>)}
              <td>{formatManNumber(amountAfterTimeline)}</td>
              <td>{formatManTotal(result.totalGifts)}</td>
            </tr>
            <tr className="cash-gift-year-total-summary">
              <th className="cash-gift-second-line-cell"></th>
              <th className="cash-gift-second-line-label">贈与税額</th>
              {taxByYear.map((value, i) => <td key={yearLabels[i]}>{formatManNumber(value)}</td>)}
              <td>{formatManNumber(taxAfterTimeline)}</td>
              <td>{formatManTotal(result.totalGiftTax)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};

const TaxFlowBox: React.FC<{
  title: string;
  rows: { label: string; value: React.ReactNode; negative?: boolean }[];
  resultLabel: string;
  resultValue: React.ReactNode;
  accent?: boolean;
}> = ({ title, rows, resultLabel, resultValue, accent }) => (
  <div className="cash-gift-tax-flow-box">
    <h4>{title}</h4>
    <div className="cash-gift-tax-flow-body">
      {rows.map((row, index) => (
        <React.Fragment key={row.label}>
          <div className="cash-gift-tax-flow-row">
            <span>{row.label}</span>
            <strong className={row.negative ? 'text-green-800' : ''}>{row.value}</strong>
          </div>
          {index < rows.length - 1 && <div className="cash-gift-tax-flow-arrow">↓</div>}
        </React.Fragment>
      ))}
    </div>
    <div className={`cash-gift-tax-flow-result ${accent ? 'cash-gift-tax-flow-result-accent' : ''}`}>
      <span>{resultLabel}</span>
      <strong>{resultValue}</strong>
    </div>
  </div>
);

const ImpactBox: React.FC<{ result: CashGiftSimulationResult }> = ({ result }) => {
  const currentTax = result.current.taxResult.totalFinalTax;
  const proposedTotalTax = result.proposed.taxResult.totalFinalTax + result.totalGiftTax;
  const diff = proposedTotalTax - currentTax;
  const reduction = currentTax - proposedTotalTax;

  return (
    <div className="cash-gift-impact-box">
      <div className="cash-gift-impact-title">税金の総額</div>
      <dl>
        <dt>① 対策なし（相続税）</dt>
        <dd>{formatCurrency(currentTax)}</dd>
        <dt>− ② 対策あり（相続税＋贈与税）</dt>
        <dd>{formatCurrency(proposedTotalTax)}</dd>
        <dt>= 差額</dt>
        <dd>{formatCurrency(Math.abs(diff))}</dd>
      </dl>
      <div className="cash-gift-impact-result">
        <span>③ 影響</span>
        {/* 減少は会計表記の △、増加は + を付ける */}
        <strong>納付税額 {reduction >= 0 ? '△' : '+'}{formatCurrency(Math.abs(reduction))}</strong>
      </div>
    </div>
  );
};

const InheritanceTaxWorkbookMatrix: React.FC<{ result: CashGiftSimulationResult }> = ({ result }) => {
  const { current, proposed, totalGifts, totalGiftTax, baseEstate } = result;
  const currentTax = current.taxResult.totalFinalTax;
  const proposedTax = proposed.taxResult.totalFinalTax;
  const proposedTotalTax = proposedTax + totalGiftTax;

  return (
    <section className="cash-gift-report-section cash-gift-inheritance-tax-section">
      <div className="cash-gift-workbook-heading">
        <h3>相続税の計算</h3>
      </div>

      <div className="cash-gift-tax-flow-grid">
        {/* 対策なしは時間経過で財産が変動しない前提のため、「現状」と「将来：対策なし」は同値。1ボックスに統合している */}
        <TaxFlowBox
          title="① 現状（対策なし）"
          rows={[
            { label: '財産', value: formatCurrency(baseEstate) },
            { label: '課税価格', value: formatCurrency(current.estateValue) },
            { label: '相続税額', value: formatCurrency(currentTax) },
          ]}
          resultLabel="税額合計"
          resultValue={`${formatCurrency(currentTax)}（相続税）`}
          accent
        />
        <div className="cash-gift-side-arrow">→</div>
        <TaxFlowBox
          title="② 将来：対策あり"
          rows={[
            { label: '財産', value: formatCurrency(baseEstate) },
            { label: '贈与額', value: formatSignedDeduction(totalGifts), negative: true },
            { label: '課税価格', value: formatCurrency(proposed.estateValue) },
            { label: '相続税額', value: formatCurrency(proposedTax) },
            { label: '贈与税額', value: formatCurrencyOrDash(totalGiftTax) },
          ]}
          resultLabel="税額合計"
          resultValue={`${formatCurrency(proposedTotalTax)}（相続税＋贈与税）`}
          accent
        />
        <div className="cash-gift-side-arrow">→</div>
        <ImpactBox result={result} />
      </div>
    </section>
  );
};

const HeirBreakdownWorkbookTables: React.FC<{ result: CashGiftSimulationResult }> = ({ result }) => {
  const { current, proposed, recipientResults } = result;
  const heirCount = current.taxResult.heirBreakdowns.length;
  const currentColumns = useMemo(() => buildGiftColumns(current, []), [current]);
  const proposedColumns = useMemo(
    () => buildGiftColumns(proposed, recipientResults),
    [proposed, recipientResults],
  );

  return (
    <section className="cash-gift-report-section">
      <div className="cash-gift-workbook-heading">
        <h3>相続人別内訳</h3>
      </div>
      <div className="cash-gift-heir-scenarios grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        <HeirScenarioTable
          label={current.label}
          taxTotal={current.taxResult.totalFinalTax}
          headerBg="bg-green-700"
          heirCount={heirCount}
          getHeirKey={i => current.taxResult.heirBreakdowns[i]?.label || String(i)}
          columns={currentColumns}
          equalColumns
        />
        <HeirScenarioTable
          label={proposed.label}
          taxTotal={proposed.taxResult.totalFinalTax + result.totalGiftTax}
          taxLabel="相続税＋贈与税"
          headerBg="bg-green-700"
          heirCount={heirCount}
          getHeirKey={i => proposed.taxResult.heirBreakdowns[i]?.label || String(i)}
          columns={proposedColumns}
          equalColumns
        />
      </div>
    </section>
  );
};

export const CashGiftHeirTable: React.FC<CashGiftHeirTableProps> = ({ result }) => (
  <div className={`${CARD} cash-gift-report-sheet`}>
    <GiftTaxCalculationWorkbook result={result} />
    <InheritanceTaxWorkbookMatrix result={result} />
    <HeirBreakdownWorkbookTables result={result} />
  </div>
);
