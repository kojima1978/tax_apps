import { memo } from 'react';
import type { RealEstateSimulationResult } from '../../types';
import { REAL_ESTATE_CAUTIONS } from '../../constants/cautionMessages';
import { formatCurrency } from '../../utils/formatters';
import { CARD, TD, TH } from '../tableStyles';

interface RealEstateResultProps {
  result: RealEstateSimulationResult;
}

const formatRate = (value: number) => `${Math.min(100, Math.max(0, value)).toLocaleString()}%`;
const savingClass = (value: number) => value > 0 ? 'text-green-700' : value < 0 ? 'text-red-600' : 'text-gray-700';
const formatReduction = (value: number) => value > 0
  ? `−${formatCurrency(value)}`
  : value < 0
    ? `+${formatCurrency(Math.abs(value))}`
    : '±0万円';

export const RealEstateResult = memo(({ result }: RealEstateResultProps) => {
  const { input, current, proposed } = result;
  const isReduction = result.taxSaving >= 0;

  return (
    <div className={`${CARD} cash-gift-report-sheet real-estate-report-sheet`}>
      <section className="cash-gift-result-summary real-estate-summary" aria-labelledby="real-estate-summary-heading">
        <h3 id="real-estate-summary-heading">税額サマリー</h3>
        <div className="cash-gift-result-summary-grid">
          <div className="cash-gift-result-summary-item">
            <span>対策なし</span>
            <strong>{formatCurrency(current.taxResult.totalFinalTax)}</strong>
            <small>相続税</small>
          </div>
          <div className="cash-gift-result-summary-item">
            <span>対策あり</span>
            <strong>{formatCurrency(proposed.taxResult.totalFinalTax)}</strong>
            <small>相続税</small>
          </div>
          <div className={`cash-gift-result-summary-item cash-gift-result-summary-impact ${isReduction ? 'is-reduction' : 'is-increase'}`}>
            <span>納付税額の変化</span>
            <strong>{isReduction ? '△' : '+'}{formatCurrency(Math.abs(result.taxSaving))}</strong>
            <small>{isReduction ? '税負担が減少' : '税負担が増加'}</small>
          </div>
        </div>
      </section>

      <section className="cash-gift-report-section real-estate-evaluation" aria-labelledby="real-estate-evaluation-heading">
        <div className="cash-gift-workbook-heading">
          <h3 id="real-estate-evaluation-heading">不動産評価額の計算</h3>
          <span>投下資金 {formatCurrency(result.investmentAmount)}</span>
        </div>
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-5 text-center">
          <p className="text-sm font-medium leading-7 text-gray-800 md:text-base">
            {formatCurrency(result.investmentAmount)} ×（1 − {formatRate(input.compressionRate)}）×
            （1 − {formatRate(input.leaseholdRightRate)} × {formatRate(input.tenantRightRate)}）
          </p>
          <p className="mt-2 text-sm text-gray-600">
            基本圧縮後 {formatCurrency(result.baseAssessedValue)} → 相続税評価額
            <strong className="ml-2 text-xl text-teal-800">{formatCurrency(result.propertyAssessedValue)}</strong>
          </p>
        </div>
        <p className="mt-3 text-xs text-gray-500">賃貸割合は100%として概算しています。</p>
      </section>

      <section className="cash-gift-report-section real-estate-comparison" aria-labelledby="real-estate-comparison-heading">
        <div className="cash-gift-workbook-heading">
          <h3 id="real-estate-comparison-heading">現状と投資後の比較</h3>
          <span>（単位：万円）</span>
        </div>
        <div className="overflow-x-auto table-scroll-hint">
          <table className="w-full min-w-[680px] border-collapse">
            <thead><tr className="bg-gray-800 text-white">
              <th className={TH}>項目</th><th className={TH}>現状</th><th className={TH}>不動産投資後</th><th className={TH}>差額</th>
            </tr></thead>
            <tbody>
              <tr>
                <th scope="row" className={`${TH} bg-gray-50 text-left`}>現金等</th>
                <td className={TD}>{formatCurrency(current.estateValue)}</td>
                <td className={TD}>{formatCurrency(result.remainingCash)}</td>
                <td className={TD}>−{formatCurrency(result.investmentAmount)}</td>
              </tr>
              <tr>
                <th scope="row" className={`${TH} bg-gray-50 text-left`}>不動産の相続税評価額</th>
                <td className={TD}>—</td>
                <td className={TD}>{formatCurrency(result.propertyAssessedValue)}</td>
                <td className={TD}>+{formatCurrency(result.propertyAssessedValue)}</td>
              </tr>
              <tr className="font-bold">
                <th scope="row" className={`${TH} bg-gray-100 text-left`}>相続税評価上の遺産総額</th>
                <td className={TD}>{formatCurrency(current.estateValue)}</td>
                <td className={TD}>{formatCurrency(proposed.estateValue)}</td>
                <td className={`${TD} ${savingClass(result.valuationReduction)}`}>{formatReduction(result.valuationReduction)}</td>
              </tr>
              <tr>
                <th scope="row" className={`${TH} bg-gray-50 text-left`}>基礎控除後の課税遺産総額</th>
                <td className={TD}>{formatCurrency(current.taxResult.taxableAmount)}</td>
                <td className={TD}>{formatCurrency(proposed.taxResult.taxableAmount)}</td>
                <td className={TD}>{formatReduction(current.taxResult.taxableAmount - proposed.taxResult.taxableAmount)}</td>
              </tr>
              <tr className="font-bold">
                <th scope="row" className={`${TH} bg-gray-100 text-left`}>納付相続税</th>
                <td className={TD}>{formatCurrency(current.taxResult.totalFinalTax)}</td>
                <td className={TD}>{formatCurrency(proposed.taxResult.totalFinalTax)}</td>
                <td className={`${TD} ${savingClass(result.taxSaving)}`}>{formatReduction(result.taxSaving)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="print-cautions print-only-block">
        <p><span className="print-cautions-label">ご注意:</span>{REAL_ESTATE_CAUTIONS.join('／')}</p>
      </div>
    </div>
  );
});

RealEstateResult.displayName = 'RealEstateResult';
