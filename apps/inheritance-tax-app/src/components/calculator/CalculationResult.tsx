import React from 'react';
import type { DetailedTaxCalculationResult } from '../../types';
import { formatCurrency, formatPercent } from '../../utils';
import { CARD } from '../tableStyles';
import { PrintHeader } from '../PrintHeader';
import { PrintCautions } from '../PrintCautions';
import { CALCULATOR_PRINT_CAUTIONS } from '../../constants/cautionMessages';
import { CalculationPremise } from './CalculationPremise';
import { CalculationSteps } from './CalculationSteps';
import { CalculationBasisDetails } from './CalculationBasisDetails';
import { HeirBreakdownTable } from './HeirBreakdownTable';

interface CalculationResultProps {
  result: DetailedTaxCalculationResult;
}

/**
 * 「相続税額合計 ＞＞ ○○」の右側に出す見出し。
 * 総額が下がったことを見せる表示なので、配偶者の税額軽減が効いていて、かつ
 * 2割加算を差し引いても実際に減っている場合だけ対比にする（該当しなければ null）。
 * 2割加算だけの場合は金額が増えるため、この対比では誤読を招く。
 */
function getAdjustedLabel(result: DetailedTaxCalculationResult): string | null {
  const hasSpouseDeduction = (result.spouseDeductionDetail?.actualDeduction ?? 0) > 0;
  if (!hasSpouseDeduction || result.totalFinalTax >= result.totalTax) return null;

  const hasSurcharge = result.heirBreakdowns.some(b => b.surchargeAmount > 0);
  return hasSurcharge ? '特例・加算の反映後' : '配偶者の特例を使うと';
}

/**
 * お客様配布用の1枚もの（A4横）を意識した構成。
 * 前提 → 結論 → 誰がいくら納めるか → どう計算したか → 注意事項 の順で、
 * 上から読むだけで説明が完結するようにしている。
 */
export const CalculationResult: React.FC<CalculationResultProps> = ({ result }) => {
  // 負担率は「納付税額 ÷ 遺産総額」。result.effectiveTaxRate は「相続税の総額 ÷ 遺産総額」なので
  // 比較表示の左（相続税額合計）側にはそのまま使えるが、右（納付税額）側には使えない。
  const burdenRate = result.estateValue > 0 ? (result.totalFinalTax / result.estateValue) * 100 : 0;

  // 配偶者の特例で税額が下がる場合だけ「本来の総額 ＞＞ 実際の納付税額」の対比で見せる
  const adjustedLabel = getAdjustedLabel(result);

  return (
    <div className="calc-result-body space-y-4 md:space-y-6">
      <PrintHeader title="相続税シミュレーション" />
      <CalculationPremise result={result} />

      {/* 結論 */}
      <div className={`${CARD} calc-summary-card`}>
        <h3 className="mb-3 text-base md:text-lg font-bold text-slate-800">試算結果</h3>

        <div className="calc-headline rounded-xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 px-4 py-5 text-center">
          {adjustedLabel ? (
            /* 金額どうしが同じ行に並ぶよう、3行×3列のグリッドに明示配置する */
            <div className="calc-headline-compare grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-2 md:gap-x-3">
              <p className="calc-headline-label col-start-1 row-start-1 text-xs md:text-sm font-medium text-slate-500">
                相続税額合計
              </p>
              <p className="calc-headline-value col-start-1 row-start-2 mt-1 text-2xl md:text-4xl font-bold tabular-nums tracking-tight text-slate-500">
                {formatCurrency(result.totalTax)}
              </p>
              <p className="calc-headline-sub col-start-1 row-start-3 mt-1 text-xs text-slate-500">
                （遺産総額の <span className="tabular-nums">{formatPercent(result.effectiveTaxRate)}</span>）
              </p>

              <span
                className="calc-headline-arrow col-start-2 row-start-1 row-span-3 self-center text-xl md:text-2xl font-bold text-green-600"
                aria-hidden="true"
              >
                ＞＞
              </span>

              <p className="calc-headline-label col-start-3 row-start-1 text-xs md:text-sm font-medium text-green-700">
                {adjustedLabel}
              </p>
              <p className="calc-headline-value col-start-3 row-start-2 mt-1 text-2xl md:text-4xl font-bold tabular-nums tracking-tight text-green-800">
                {formatCurrency(result.totalFinalTax)}
              </p>
            </div>
          ) : (
            <>
              <p className="calc-headline-label text-xs md:text-sm font-medium text-green-700">
                相続税額合計（納付税額）
              </p>
              <p className="calc-headline-value mt-1 text-3xl md:text-4xl font-bold tabular-nums tracking-tight text-green-800">
                {formatCurrency(result.totalFinalTax)}
              </p>
              <p className="calc-headline-sub mt-2 text-xs text-slate-600">
                （遺産総額の{' '}
                <span className="font-semibold tabular-nums text-slate-800">{formatPercent(burdenRate)}</span>）
              </p>
            </>
          )}
        </div>
      </div>

      {/* 誰がいくら納めるか */}
      <HeirBreakdownTable
        breakdowns={result.heirBreakdowns}
        totalFinalTax={result.totalFinalTax}
      />

      {/* どう計算したか */}
      <CalculationSteps result={result} />

      {/* 税理士向けの詳細根拠（画面のみ・折りたたみ） */}
      <CalculationBasisDetails result={result} />

      <PrintCautions items={CALCULATOR_PRINT_CAUTIONS} />
    </div>
  );
};
