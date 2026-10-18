import { memo } from 'react';
import type { RealEstateSimulationResult } from '../../types';
import { REAL_ESTATE_CAUTIONS } from '../../constants/cautionMessages';
import { formatCurrency } from '../../utils/formatters';
import { PrintHeader } from '../PrintHeader';
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
  const savingRate = result.investmentAmount > 0
    ? (result.taxSaving / result.investmentAmount) * 100
    : 0;

  return (
    <div className="real-estate-report space-y-4 md:space-y-6">
      <PrintHeader title="賃貸不動産シミュレーション" />

      <section className={`${CARD} real-estate-summary`} aria-labelledby="real-estate-summary-heading">
        <h2 id="real-estate-summary-heading" className="mb-4 text-xl font-bold text-gray-800">シミュレーション結果</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <span className="text-sm font-medium text-gray-700">投下資金</span>
            <strong className="mt-1 block text-2xl text-gray-900">{formatCurrency(result.investmentAmount)}</strong>
            <small className="mt-1 block text-xs text-gray-600">現金から不動産へ組み替え</small>
          </div>
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
            <span className="text-sm font-medium text-teal-800">相続税評価額の圧縮</span>
            <strong className={`mt-1 block text-2xl ${savingClass(result.valuationReduction)}`}>
              {formatReduction(result.valuationReduction)}
            </strong>
            <small className="mt-1 block text-xs text-teal-700">評価額 {formatCurrency(result.propertyAssessedValue)}</small>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <span className="text-sm font-medium text-green-800">相続税の軽減見込額</span>
            <strong className={`mt-1 block text-2xl ${savingClass(result.taxSaving)}`}>
              {formatReduction(result.taxSaving)}
            </strong>
            <small className="mt-1 block text-xs text-green-700">投下資金に対して {savingRate.toFixed(2)}%</small>
          </div>
        </div>
      </section>

      <section className={`${CARD} real-estate-evaluation`} aria-labelledby="real-estate-evaluation-heading">
        <h2 id="real-estate-evaluation-heading" className="mb-3 text-xl font-bold text-gray-800">評価額の計算</h2>
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

      <section className={`${CARD} real-estate-comparison`} aria-labelledby="real-estate-comparison-heading">
        <h2 id="real-estate-comparison-heading" className="mb-4 text-xl font-bold text-gray-800">現状と投資後の比較</h2>
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
