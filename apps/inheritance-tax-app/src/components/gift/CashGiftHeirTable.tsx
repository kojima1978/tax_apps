import React, { useMemo } from 'react';
import type { CashGiftSimulationResult } from '../../types';
import { formatCurrency } from '../../utils';
import { CARD } from '../tableStyles';
import { HeirScenarioTable } from '../HeirScenarioTable';
import {
  addYearsAndDays,
  buildGiftColumns,
  CIRCLED_NUMBERS,
  formatCurrencyOrDash,
  formatManNumber,
  formatManTotal,
  formatSignedDeduction,
  formatWarekiDate,
  getGiftConditionGroups,
  getGiftTimelineTotals,
  getGiftYearLabels,
  GIFT_YEAR_COLUMN_COUNT,
} from './cashGiftReportUtils';

interface CashGiftHeirTableProps {
  result: CashGiftSimulationResult;
}

const GiftConclusionBand: React.FC<{ result: CashGiftSimulationResult }> = ({ result }) => {
  const reduction = result.current.taxResult.totalFinalTax - (result.proposed.taxResult.totalFinalTax + result.totalGiftTax);
  const isReduction = reduction >= 0;

  return (
    <div className="cash-gift-conclusion-band">
      <div className="cash-gift-conclusion-title">
        <strong>生前贈与の検討</strong>
      </div>
      <div className="cash-gift-conclusion-content">
        <span>実施内容</span>
        <strong>総額 {formatCurrency(result.totalGifts)}</strong>
        <small>を贈与します。</small>
      </div>
      <div className="cash-gift-conclusion-impact">
        <span>影響（概算）</span>
        <small>納付税額が</small>
        <strong>{formatCurrency(Math.abs(reduction))}</strong>
        <small>{isReduction ? '減少' : '増加'}</small>
      </div>
    </div>
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
  const {
    amountByYear,
    taxByYear,
    amountAfterTimeline,
    taxAfterTimeline,
  } = useMemo(() => getGiftTimelineTotals(recipients), [recipients]);

  return (
    <section className="cash-gift-report-section">
      <GiftConclusionBand result={result} />

      <div className="cash-gift-workbook-heading">
        <h3>贈与税の計算</h3>
        <span>贈与開始日： {formatWarekiDate(startDate)}</span>
      </div>

      <div className="overflow-x-auto table-scroll-hint">
        <table className="cash-gift-condition-table w-full min-w-[760px] border-collapse">
          <tbody>
            {conditionGroups.map((group, index) => (
              <tr key={group.key}>
                <td className="cash-gift-condition-group">{group.groupLabel}グループ</td>
                <td className="cash-gift-condition-index">{CIRCLED_NUMBERS[index] ?? `${index + 1}.`}</td>
                <td className="cash-gift-condition-label">贈与額（人・年）</td>
                <td className="cash-gift-condition-value">{formatCurrency(group.annualAmount)}</td>
                <td className="cash-gift-condition-label">人数</td>
                <td className="cash-gift-condition-value">{group.totalCount}人</td>
                <td className="cash-gift-condition-note">
                  （ 特例贈与： {group.specialCount}人 一般贈与： {group.generalCount}人 ）
                </td>
                <td className="cash-gift-condition-label">期間</td>
                <td className="cash-gift-condition-value">{group.years}年</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 overflow-x-auto table-scroll-hint">
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
                    <th>{groupIndex} {group.groupLabel}グループ</th>
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
      <div className="cash-gift-impact-title">相続税の総額</div>
      <dl>
        <dt>② 対策なし</dt>
        <dd>{formatCurrency(currentTax)}</dd>
        <dt>− ③ 対策あり</dt>
        <dd>{formatCurrency(proposedTotalTax)}</dd>
        <dt>= 差額</dt>
        <dd>{formatCurrency(Math.abs(diff))}</dd>
      </dl>
      <div className="cash-gift-impact-result">
        <span>④ 影響</span>
        <strong>{reduction >= 0 ? '減少額' : '増加額'} {formatCurrency(Math.abs(reduction))}</strong>
      </div>
    </div>
  );
};

const InheritanceTaxWorkbookMatrix: React.FC<{ result: CashGiftSimulationResult }> = ({ result }) => {
  const { current, proposed, totalGifts, totalGiftTax, baseEstate } = result;
  const currentTax = current.taxResult.totalFinalTax;
  const proposedTax = proposed.taxResult.totalFinalTax;
  const proposedTotalTax = proposedTax + totalGiftTax;
  const maxGiftYears = useMemo(
    () => Math.max(...result.recipientResults.map(r => r.years), 0),
    [result.recipientResults],
  );
  const startDate = useMemo(() => new Date(), []);
  const inheritanceTaxDate = useMemo(
    () => addYearsAndDays(startDate, maxGiftYears, 1),
    [maxGiftYears, startDate],
  );

  return (
    <section className="cash-gift-report-section cash-gift-inheritance-tax-section">
      <div className="cash-gift-workbook-heading">
        <h3>相続税の計算</h3>
        <span>相続税計算日： {formatWarekiDate(inheritanceTaxDate)}</span>
      </div>

      <div className="cash-gift-tax-flow-grid">
        <TaxFlowBox
          title="① 現状"
          rows={[
            { label: '財産', value: formatCurrency(baseEstate) },
            { label: '課税価格', value: formatCurrency(current.estateValue) },
          ]}
          resultLabel="相続税納付額"
          resultValue={formatCurrency(currentTax)}
        />
        <div className="cash-gift-side-arrow">→</div>
        <TaxFlowBox
          title="② 将来：対策なし"
          rows={[
            { label: '財産', value: formatCurrency(baseEstate) },
            { label: '課税価格', value: formatCurrency(current.estateValue) },
          ]}
          resultLabel="相続税納付額"
          resultValue={formatCurrency(currentTax)}
          accent
        />
        <div className="cash-gift-side-arrow">→</div>
        <TaxFlowBox
          title="③ 将来：対策あり"
          rows={[
            { label: '財産', value: formatCurrency(baseEstate) },
            { label: '贈与額', value: formatSignedDeduction(totalGifts), negative: true },
            { label: '課税価格', value: formatCurrency(proposed.estateValue) },
            { label: '相続税納付額', value: formatCurrency(proposedTax) },
            { label: '贈与税額', value: formatCurrencyOrDash(totalGiftTax) },
          ]}
          resultLabel="税額合計"
          resultValue={formatCurrency(proposedTotalTax)}
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
        />
        <HeirScenarioTable
          label={proposed.label}
          taxTotal={proposed.taxResult.totalFinalTax + result.totalGiftTax}
          taxLabel="相続税＋贈与税"
          headerBg="bg-green-700"
          heirCount={heirCount}
          getHeirKey={i => proposed.taxResult.heirBreakdowns[i]?.label || String(i)}
          columns={proposedColumns}
        />
      </div>
    </section>
  );
};

const CautionNotes: React.FC = () => (
  <section className="cash-gift-report-section cash-gift-caution-notes">
    <h3>ご注意事項</h3>
    <p>・影響は概算です。</p>
    <p>・影響は財産の分割方法・状況の変化等によって変化します。</p>
  </section>
);

export const CashGiftHeirTable: React.FC<CashGiftHeirTableProps> = ({ result }) => (
  <div className={`${CARD} cash-gift-report-sheet`}>
    <GiftTaxCalculationWorkbook result={result} />
    <InheritanceTaxWorkbookMatrix result={result} />
    <HeirBreakdownWorkbookTables result={result} />
    <CautionNotes />
  </div>
);
