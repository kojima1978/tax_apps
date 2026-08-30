import React, { useMemo, useState } from 'react';
import ChevronDown from 'lucide-react/icons/chevron-down';
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
  GIFT_DISPLAY_YEAR_COUNT,
} from './cashGiftReportUtils';

interface CashGiftHeirTableProps {
  result: CashGiftSimulationResult;
}

const MobileDetailDisclosure: React.FC<{
  id: string;
  title: string;
  children: React.ReactNode;
}> = ({ id, title, children }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="cash-gift-detail-block">
      <button
        type="button"
        className="cash-gift-detail-toggle no-print"
        aria-expanded={isExpanded}
        aria-controls={id}
        onClick={() => setIsExpanded(current => !current)}
      >
        <span>
          <strong>{title}</strong>
          <small>{isExpanded ? '詳細を閉じる' : '詳細を見る'}</small>
        </span>
        <ChevronDown className={isExpanded ? 'is-expanded' : ''} aria-hidden="true" />
      </button>
      <div
        id={id}
        className={`cash-gift-detail-content ${isExpanded ? 'is-expanded' : ''}`}
      >
        {children}
      </div>
    </div>
  );
};

const CashGiftResultSummary: React.FC<{ result: CashGiftSimulationResult }> = ({ result }) => {
  const currentTax = result.current.taxResult.totalFinalTax;
  const proposedTax = result.proposed.taxResult.totalFinalTax + result.totalGiftTax;
  const taxReduction = currentTax - proposedTax;
  const isReduction = taxReduction >= 0;

  return (
    <section className="cash-gift-result-summary" aria-labelledby="cash-gift-result-summary-heading">
      <h3 id="cash-gift-result-summary-heading">税額サマリー</h3>
      <div className="cash-gift-result-summary-grid">
        <div className="cash-gift-result-summary-item">
          <span>対策なし</span>
          <strong>{formatCurrency(currentTax)}</strong>
          <small>相続税</small>
        </div>
        <div className="cash-gift-result-summary-item">
          <span>対策あり</span>
          <strong>{formatCurrency(proposedTax)}</strong>
          <small>相続税＋贈与税</small>
        </div>
        <div className={`cash-gift-result-summary-item cash-gift-result-summary-impact ${isReduction ? 'is-reduction' : 'is-increase'}`}>
          <span>納付税額の変化</span>
          <strong>{isReduction ? '△' : '+'}{formatCurrency(Math.abs(taxReduction))}</strong>
          <small>{isReduction ? '税負担が減少' : '税負担が増加'}</small>
        </div>
      </div>
    </section>
  );
};

const GiftTaxCalculationWorkbook: React.FC<{ result: CashGiftSimulationResult }> = ({ result }) => {
  const recipients = result.recipientResults;
  const startDate = useMemo(() => new Date(), []);
  const conditionGroups = useMemo(() => getGiftConditionGroups(recipients), [recipients]);
  const yearLabels = useMemo(
    () => getGiftYearLabels(startDate),
    [startDate],
  );
  const { amountByYear, taxByYear } = useMemo(
    () => getGiftTimelineTotals(recipients),
    [recipients],
  );

  return (
    <section className="cash-gift-report-section">
      <div className="cash-gift-workbook-heading">
        <h3>贈与税の計算</h3>
      </div>

      {/* 条件テーブルは年次テーブルと重複するため廃止。人数内訳だけ行見出しに残している */}
      <div className="overflow-x-auto table-scroll-hint">
        <table className="cash-gift-year-total-table w-full min-w-[900px] border-collapse">
          <colgroup>
            <col className="cash-gift-group-column" />
            <col className="cash-gift-item-column" />
            {Array.from({ length: GIFT_DISPLAY_YEAR_COUNT }, (_, i) => (
              <col key={i} className="cash-gift-year-column" />
            ))}
            <col className="cash-gift-total-column" />
          </colgroup>
          <thead>
            <tr>
              <th className="cash-gift-unit-cell" colSpan={2}>（単位：万円）</th>
              {yearLabels.map(label => <th key={label}>{label}</th>)}
              <th>合計</th>
            </tr>
          </thead>
          <tbody>
            {conditionGroups.map((group, index) => {
              const groupIndex = CIRCLED_NUMBERS[index] ?? `${index + 1}.`;

              return (
                <React.Fragment key={group.key}>
                  <tr>
                    <th>{groupIndex} {group.groupLabel}グループ{formatGiftGroupMembers(group)}</th>
                    <th>贈与額</th>
                    {yearLabels.map((label, i) => <td key={label}>{formatManNumber(i < group.years ? group.annualAmount : 0)}</td>)}
                    <td>{formatManTotal(group.totalGift)}</td>
                  </tr>
                  <tr>
                    <th className="cash-gift-second-line-cell"></th>
                    <th className="cash-gift-second-line-label">贈与税額</th>
                    {yearLabels.map((label, i) => <td key={label}>{formatManNumber(i < group.years ? group.giftTaxPerYear : 0)}</td>)}
                    <td>{formatManTotal(group.totalGiftTax)}</td>
                  </tr>
                </React.Fragment>
              );
            })}
            <tr className="cash-gift-year-total-summary cash-gift-year-total-summary-start">
              <th>合計</th>
              <th>贈与額</th>
              {amountByYear.map((value, i) => <td key={yearLabels[i]}>{formatManNumber(value)}</td>)}
              <td>{formatManTotal(result.totalGifts)}</td>
            </tr>
            <tr className="cash-gift-year-total-summary">
              <th className="cash-gift-second-line-cell"></th>
              <th className="cash-gift-second-line-label">贈与税額</th>
              {taxByYear.map((value, i) => <td key={yearLabels[i]}>{formatManNumber(value)}</td>)}
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

const MobileTaxBurdenChanges: React.FC<{
  currentInheritanceTax: number;
  proposedGiftTax: number;
  proposedInheritanceTax: number;
}> = ({ currentInheritanceTax, proposedGiftTax, proposedInheritanceTax }) => {
  const inheritanceTaxChange = proposedInheritanceTax - currentInheritanceTax;

  return (
    <section className="cash-gift-mobile-tax-changes no-print" aria-labelledby="cash-gift-mobile-tax-changes-heading">
      <h4 id="cash-gift-mobile-tax-changes-heading">税負担の増減</h4>
      <div className="cash-gift-mobile-tax-change-list">
        <div className="cash-gift-mobile-tax-change-card is-gift-tax">
          <span className="cash-gift-mobile-tax-change-title">贈与税負担</span>
          <div className="cash-gift-mobile-tax-change-values">
            <span>現状 <strong>{formatCurrency(0)}</strong></span>
            <span aria-hidden="true">→</span>
            <span>提案 <strong>{formatCurrency(proposedGiftTax)}</strong></span>
          </div>
          <p>
            増減額 <strong>{proposedGiftTax > 0 ? '+' : ''}{formatCurrency(proposedGiftTax)}</strong>
            <small>{proposedGiftTax > 0 ? '増加' : '変化なし'}</small>
          </p>
        </div>
        <div className="cash-gift-mobile-tax-change-card is-inheritance-tax">
          <span className="cash-gift-mobile-tax-change-title">納付相続税</span>
          <div className="cash-gift-mobile-tax-change-values">
            <span>現状 <strong>{formatCurrency(currentInheritanceTax)}</strong></span>
            <span aria-hidden="true">→</span>
            <span>提案 <strong>{formatCurrency(proposedInheritanceTax)}</strong></span>
          </div>
          <p>
            増減額 <strong>{inheritanceTaxChange < 0 ? '△' : inheritanceTaxChange > 0 ? '+' : ''}{formatCurrency(Math.abs(inheritanceTaxChange))}</strong>
            <small>{inheritanceTaxChange < 0 ? '減少' : inheritanceTaxChange > 0 ? '増加' : '変化なし'}</small>
          </p>
        </div>
      </div>
    </section>
  );
};

const HeirBreakdownWorkbookTables: React.FC<{ result: CashGiftSimulationResult }> = ({ result }) => {
  const { current, proposed, recipientResults } = result;
  const heirCount = current.taxResult.heirBreakdowns.length;
  const giftTaxChange = result.totalGiftTax;
  const inheritanceTaxChange = proposed.taxResult.totalFinalTax - current.taxResult.totalFinalTax;
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
          showTaxTotal={false}
          showHeadingMarker={false}
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
          showTaxTotal={false}
          showHeadingMarker={false}
        />
      </div>
      <MobileTaxBurdenChanges
        currentInheritanceTax={current.taxResult.totalFinalTax}
        proposedGiftTax={result.totalGiftTax}
        proposedInheritanceTax={proposed.taxResult.totalFinalTax}
      />
      <div
        className="cash-gift-tax-burden-connector"
        role="img"
        aria-label={`贈与税負担の増減額 ${giftTaxChange > 0 ? 'プラス' : ''}${formatCurrency(giftTaxChange)}、納付相続税の増減額 ${inheritanceTaxChange < 0 ? 'マイナス' : inheritanceTaxChange > 0 ? 'プラス' : ''}${formatCurrency(Math.abs(inheritanceTaxChange))}`}
      >
        <svg viewBox="0 0 1000 58" preserveAspectRatio="none" focusable="false" aria-hidden="true">
          <defs>
            <marker
              id="cash-gift-gift-tax-arrowhead"
              viewBox="0 0 10 10"
              refX="5"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
              markerUnits="userSpaceOnUse"
            >
              <path className="cash-gift-gift-tax-arrowhead" d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
            <marker
              id="cash-gift-inheritance-tax-arrowhead"
              viewBox="0 0 10 10"
              refX="5"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
              markerUnits="userSpaceOnUse"
            >
              <path className="cash-gift-inheritance-tax-arrowhead" d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>
          <path
            className="cash-gift-tax-burden-connector-line cash-gift-inheritance-tax-connector-line"
            d="M 367 1 V 42 H 879 V 7"
            markerEnd="url(#cash-gift-inheritance-tax-arrowhead)"
          />
          <path
            className="cash-gift-tax-burden-connector-bridge"
            d="M 285 1 V 17 H 797 V 7"
          />
          <path
            className="cash-gift-tax-burden-connector-line cash-gift-gift-tax-connector-line"
            d="M 285 1 V 17 H 797 V 7"
            markerEnd="url(#cash-gift-gift-tax-arrowhead)"
          />
        </svg>
        <span className="cash-gift-tax-change-label cash-gift-tax-change-label-gift">
          増減額 <strong>{giftTaxChange > 0 ? '+' : ''}{formatCurrency(giftTaxChange)}</strong>
        </span>
        <span className="cash-gift-tax-change-label cash-gift-tax-change-label-inheritance">
          増減額 <strong>{inheritanceTaxChange < 0 ? '△' : inheritanceTaxChange > 0 ? '+' : ''}{formatCurrency(Math.abs(inheritanceTaxChange))}</strong>
        </span>
      </div>
    </section>
  );
};

export const CashGiftHeirTable: React.FC<CashGiftHeirTableProps> = ({ result }) => (
  <div className={`${CARD} cash-gift-report-sheet`}>
    <CashGiftResultSummary result={result} />
    <MobileDetailDisclosure id="cash-gift-gift-tax-details" title="贈与税の計算">
      <GiftTaxCalculationWorkbook result={result} />
    </MobileDetailDisclosure>
    <MobileDetailDisclosure id="cash-gift-inheritance-tax-details" title="相続税の計算">
      <InheritanceTaxWorkbookMatrix result={result} />
    </MobileDetailDisclosure>
    <MobileDetailDisclosure id="cash-gift-heir-breakdown-details" title="相続人別内訳">
      <HeirBreakdownWorkbookTables result={result} />
    </MobileDetailDisclosure>
  </div>
);
