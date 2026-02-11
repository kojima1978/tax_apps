import { FormData } from '@/lib/types';
import { toWareki } from '@/lib/date-utils';
import { calculatePerShareValue, calculateComparisonRatio, calculateAverageRatio } from '@/lib/calculations';
import { DetailTable, DetailRow, ResultBox } from './helpers';

interface SimilarIndustryDetailsProps {
  formData: FormData;
  totalShares: number;
  sizeMultiplier: number;
}

export default function SimilarIndustryDetails({ formData, totalShares, sizeMultiplier }: SimilarIndustryDetailsProps) {
  const similarData = formData.similarIndustryData || {
    profit_per_share: 0,
    net_asset_per_share: 0,
    average_stock_price: 0,
  };

  const A = similarData.average_stock_price;
  const C = similarData.profit_per_share;
  const D = similarData.net_asset_per_share;

  const profitPrev = formData.currentPeriodProfit;
  const profit2Prev = formData.previousPeriodProfit;
  const profitPrevPerShare = calculatePerShareValue(profitPrev, totalShares);
  const avgProfit12 = (profitPrev + profit2Prev) / 2;
  const profitAvgPerShare12 = calculatePerShareValue(avgProfit12, totalShares);
  const c = Math.min(profitPrevPerShare, profitAvgPerShare12);
  const d = calculatePerShareValue(formData.netAssetTaxValue, totalShares);

  const ratioC = calculateComparisonRatio(c, C);
  const ratioD = calculateComparisonRatio(d, D);
  const avgRatio = calculateAverageRatio(ratioC, ratioD);
  const S_50 = Math.floor(A * avgRatio * sizeMultiplier);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold border-b-2 border-gray-300 pb-2">
        1口あたりの類似業種比準価額方式による評価額の計算過程
      </h3>

      <div className="p-4 border border-gray-300 rounded">
        <h4 className="font-bold mb-2">【計算式】</h4>
        <p className="font-mono text-sm">
          類似業種比準価額 = A × [(c/C + d/D) ÷ 2] × 斟酌率
        </p>
      </div>

      <div>
        <h4 className="font-bold mb-2">【類似業種の数値】</h4>
        <DetailTable>
          <DetailRow label={`A：類似業種の${formData?.fiscalYear ? `${toWareki(formData.fiscalYear)}年度` : '令和6年度'}平均株価`} value={`${A.toLocaleString()}円`} />
          <DetailRow label="C：類似業種の1口あたり利益" value={`${C.toLocaleString()}円`} />
          <DetailRow label="D：類似業種の1口あたり純資産" value={`${D.toLocaleString()}円`} />
        </DetailTable>
      </div>

      <div>
        <h4 className="font-bold mb-2">【評価会社の数値（1口50円あたり）】</h4>
        <DetailTable>
          <DetailRow label="c：評価会社の1口あたり利益" value={`${c.toLocaleString()}円`} />
          <DetailRow label="直前期の利益" value={`${profitPrevPerShare.toLocaleString()}円`} sub />
          <DetailRow label="直前期と直前々期の平均" value={`${profitAvgPerShare12.toLocaleString()}円`} sub border />
          <DetailRow label="d：評価会社の1口あたり純資産（相続税評価額）" value={`${d.toLocaleString()}円`} />
        </DetailTable>
      </div>

      <div>
        <h4 className="font-bold mb-2">【比準割合の計算】</h4>
        <DetailTable>
          <DetailRow label="利益比準割合 (c/C)" value={ratioC.toFixed(2)} />
          <DetailRow label="純資産比準割合 (d/D)" value={ratioD.toFixed(2)} />
          <DetailRow label="平均比準割合 [(c/C + d/D) ÷ 2]" value={avgRatio.toFixed(2)} highlight />
        </DetailTable>
        <p className="text-xs text-gray-600 mt-2">
          ※医療法人は配当がないため、利益と純資産の2要素で計算します
        </p>
      </div>

      <div>
        <h4 className="font-bold mb-2">【斟酌率】</h4>
        <p className="text-sm">会社規模による斟酌率: {sizeMultiplier}</p>
      </div>

      <ResultBox>
        <p className="font-mono text-lg">
          {A.toLocaleString()} × {avgRatio.toFixed(2)} × {sizeMultiplier} = <span className="font-bold">{S_50.toLocaleString()}円</span>
        </p>
      </ResultBox>
    </div>
  );
}
