import { memo } from 'react';
import ArrowRight from 'lucide-react/icons/arrow-right';
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
const formatChange = (value: number) => value > 0
  ? `+${formatCurrency(value)}`
  : value < 0
    ? `−${formatCurrency(Math.abs(value))}`
    : '±0万円';

export const RealEstateResult = memo(({ result }: RealEstateResultProps) => {
  const { input, current, proposed } = result;
  const currentBreakdowns = new Map(
    current.taxResult.heirBreakdowns.map(item => [item.heirId ?? item.label, item]),
  );

  return (
    <div className="real-estate-report space-y-4 md:space-y-6">
      <PrintHeader title="賃貸不動産シミュレーション" />

      <section className={`${CARD} real-estate-summary`} aria-labelledby="real-estate-summary-heading">
        <h2 id="real-estate-summary-heading" className="mb-4 text-xl font-bold text-gray-800">シミュレーション結果</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
            <span className="text-sm font-medium text-teal-800">相続税評価額の圧縮</span>
            <strong className={`mt-1 block text-2xl ${savingClass(result.valuationReduction)}`}>
              {formatReduction(result.valuationReduction)}
            </strong>
            <small className="mt-1 block text-xs text-teal-700">購入価格と相続税評価額の差</small>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <span className="text-sm font-medium text-green-800">相続税の軽減見込額</span>
            <strong className={`mt-1 block text-2xl ${savingClass(result.taxSaving)}`}>
              {formatReduction(result.taxSaving)}
            </strong>
            <small className="mt-1 block text-xs text-green-700">配偶者の税額軽減後の納付税額で比較</small>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <span className="text-sm font-medium text-blue-800">税引後財産の増減</span>
            <strong className={`mt-1 block text-2xl ${savingClass(result.netProceedsDiff)}`}>
              {formatChange(result.netProceedsDiff)}
            </strong>
            <small className="mt-1 block text-xs text-blue-700">物件の時価が購入価格と同額の前提</small>
          </div>
        </div>
      </section>

      <section className={`${CARD} real-estate-evaluation`} aria-labelledby="real-estate-evaluation-heading">
        <h2 id="real-estate-evaluation-heading" className="mb-1 text-xl font-bold text-gray-800">不動産評価額の計算</h2>
        <p className="mb-4 text-sm text-gray-600">土地は貸家建付地、建物は貸家として概算しています。</p>
        <div className="overflow-x-auto table-scroll-hint">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="bg-teal-700 text-white">
              <tr>
                <th className={TH}>項目</th>
                <th className={TH}>評価の基礎</th>
                <th className={TH}>計算</th>
                <th className={TH}>相続税評価額</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className={`${TH} bg-gray-50 text-left`}>土地（貸家建付地）</th>
                <td className={TD}>{formatCurrency(input.landSelfUseValue)}</td>
                <td className={`${TD} text-center text-xs`}>1 − {formatRate(input.leaseholdRightRate)} × {formatRate(input.tenantRightRate)} × {formatRate(input.rentalRate)}</td>
                <td className={`${TD} font-bold`}>{formatCurrency(result.landAssessedValue)}</td>
              </tr>
              <tr>
                <th scope="row" className={`${TH} bg-gray-50 text-left`}>建物（貸家）</th>
                <td className={TD}>{formatCurrency(input.buildingFixedAssetTaxValue)}</td>
                <td className={`${TD} text-center text-xs`}>1 − {formatRate(input.tenantRightRate)} × {formatRate(input.rentalRate)}</td>
                <td className={`${TD} font-bold`}>{formatCurrency(result.buildingAssessedValue)}</td>
              </tr>
              <tr className="bg-teal-50 font-bold">
                <th scope="row" className={`${TH} text-left`}>合計</th>
                <td className={TD}>購入価格 {formatCurrency(result.purchasePrice)}</td>
                <td className={`${TD} text-center`}>土地評価額 ＋ 建物評価額</td>
                <td className={TD}>{formatCurrency(result.propertyAssessedValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${CARD} real-estate-comparison`} aria-labelledby="real-estate-comparison-heading">
        <h2 id="real-estate-comparison-heading" className="mb-4 text-xl font-bold text-gray-800">現状と購入後の比較</h2>
        <div className="overflow-x-auto table-scroll-hint">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className={TH}>項目</th>
                <th className={TH}>現状</th>
                <th className={TH}>不動産購入後</th>
                <th className={TH}>差額</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className={`${TH} bg-gray-50 text-left`}>現金等</th>
                <td className={TD}>{formatCurrency(current.estateValue)}</td>
                <td className={TD}>{formatCurrency(result.remainingCash)}</td>
                <td className={TD}>−{formatCurrency(result.purchasePrice)}</td>
              </tr>
              <tr>
                <th scope="row" className={`${TH} bg-gray-50 text-left`}>賃貸不動産の相続税評価額</th>
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

      <section className={`${CARD} real-estate-heirs`} aria-labelledby="real-estate-heirs-heading">
        <h2 id="real-estate-heirs-heading" className="mb-4 text-xl font-bold text-gray-800">相続人別内訳</h2>
        <div className="overflow-x-auto table-scroll-hint">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className={TH}>相続人</th>
                <th className={TH}>現状の取得額</th>
                <th className={TH}>現状の相続税</th>
                <th className={TH}><span className="sr-only">比較</span></th>
                <th className={TH}>購入後の取得額</th>
                <th className={TH}>購入後の相続税</th>
                <th className={TH}>税額差</th>
              </tr>
            </thead>
            <tbody>
              {proposed.taxResult.heirBreakdowns.map(item => {
                const before = currentBreakdowns.get(item.heirId ?? item.label);
                const difference = (before?.finalTax ?? 0) - item.finalTax;
                return (
                  <tr key={item.heirId ?? item.label}>
                    <th scope="row" className={`${TH} bg-gray-50 text-left`}>{item.label}</th>
                    <td className={TD}>{formatCurrency(before?.acquisitionAmount ?? 0)}</td>
                    <td className={TD}>{formatCurrency(before?.finalTax ?? 0)}</td>
                    <td className={`${TD} text-center text-gray-400`}><ArrowRight className="mx-auto h-4 w-4" aria-hidden="true" /></td>
                    <td className={TD}>{formatCurrency(item.acquisitionAmount)}</td>
                    <td className={TD}>{formatCurrency(item.finalTax)}</td>
                    <td className={`${TD} font-bold ${savingClass(difference)}`}>{formatReduction(difference)}</td>
                  </tr>
                );
              })}
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
