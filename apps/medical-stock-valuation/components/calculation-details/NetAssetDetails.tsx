import { FormData } from '@/lib/types';
import { calculatePerShareValue } from '@/lib/calculations';
import { CORPORATE_TAX_RATE } from '@/lib/constants';
import { DetailTable, DetailRow, ResultBox } from './helpers';

interface NetAssetDetailsProps {
  formData: FormData;
  totalShares: number;
}

export default function NetAssetDetails({ formData, totalShares }: NetAssetDetailsProps) {
  const netAssetInheritance = formData.netAssetTaxValue;
  const netAssetBook = formData.currentPeriodNetAsset;
  const evalDiff = netAssetInheritance - netAssetBook;
  const tax = evalDiff > 0 ? evalDiff * CORPORATE_TAX_RATE : 0;
  const netAssetAdjusted = netAssetInheritance - tax;
  const N = calculatePerShareValue(netAssetAdjusted, totalShares);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold border-b-2 border-gray-300 pb-2">
        1口あたりの純資産価額方式による評価額の計算過程
      </h3>

      <div className="p-4 border border-gray-300 rounded">
        <h4 className="font-bold mb-2">【計算式】</h4>
        <p className="font-mono text-sm">
          純資産価額 = (相続税評価額による純資産 - 法人税等相当額) ÷ 総出資口数
        </p>
      </div>

      <div>
        <h4 className="font-bold mb-2">【純資産の計算】</h4>
        <DetailTable>
          <DetailRow label="①相続税評価額による純資産" value={`${netAssetInheritance.toLocaleString()}円`} />
          <DetailRow label="②帳簿価額による純資産（直前期）" value={`${netAssetBook.toLocaleString()}円`} />
          <DetailRow label="③評価差額（①-②）" value={`${evalDiff.toLocaleString()}円`} highlight />
        </DetailTable>
      </div>

      <div>
        <h4 className="font-bold mb-2">【法人税等相当額の計算】</h4>
        <DetailTable>
          <DetailRow label="評価差額" value={`${evalDiff.toLocaleString()}円`} />
          <DetailRow label="法人税等の実効税率" value={`${Math.round(CORPORATE_TAX_RATE * 100)}%`} />
          <DetailRow label="法人税等相当額" value={`${tax.toLocaleString()}円`} highlight />
        </DetailTable>
        <p className="text-xs text-gray-600 mt-2">
          ※評価差額がマイナスの場合、法人税等相当額は0円となります
        </p>
      </div>

      <div>
        <h4 className="font-bold mb-2">【調整後純資産額】</h4>
        <DetailTable>
          <DetailRow label="相続税評価額による純資産" value={`${netAssetInheritance.toLocaleString()}円`} />
          <DetailRow label="法人税等相当額" value={`-${tax.toLocaleString()}円`} />
          <DetailRow label="調整後純資産額" value={`${netAssetAdjusted.toLocaleString()}円`} highlight />
        </DetailTable>
      </div>

      <div>
        <h4 className="font-bold mb-2">【1口あたりの純資産価額】</h4>
        <DetailTable>
          <DetailRow label="調整後純資産額" value={`${netAssetAdjusted.toLocaleString()}円`} />
          <DetailRow label="総出資口数" value={`${totalShares.toLocaleString()}口`} />
        </DetailTable>
      </div>

      <ResultBox>
        <p className="font-mono text-lg">
          {netAssetAdjusted.toLocaleString()} ÷ {totalShares.toLocaleString()} = <span className="font-bold">{N.toLocaleString()}円</span>
        </p>
      </ResultBox>
    </div>
  );
}
