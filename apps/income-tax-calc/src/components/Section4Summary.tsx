import { formatYen } from '@/lib/utils';
import type { TaxResult } from '@/lib/tax-calc';

interface Props {
  result: TaxResult;
}

export default function Section4Summary({ result }: Props) {
  return (
    <section className="animate-fade-in">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-800 text-white px-4 py-2.5">
          <h2 className="text-sm font-bold tracking-wide">参考：住民税（概算）・税額合計</h2>
        </div>
        <div className="px-4 py-3 space-y-3">
          {/* 住民税 */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="field-label-symbol bg-purple-100 text-purple-800">住</span>
              <div>
                <span className="text-sm font-medium text-gray-900">住民税（概算）</span>
                <div className="text-xs text-gray-500">所得割10% + 均等割5,000円</div>
              </div>
            </div>
            <div className="font-mono-num text-sm font-medium text-gray-900 text-right">
              {formatYen(result.residentTax)}<span className="text-xs font-normal text-gray-500 ml-0.5">円</span>
            </div>
          </div>

          {/* 税額合計 */}
          <div className="border-t-2 border-gray-300 pt-3">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg px-5 py-4 flex items-center justify-between">
              <div>
                <div className="text-white text-sm font-bold">税額合計</div>
                <div className="text-blue-200 text-xs mt-0.5">所得税 + 復興特別所得税 + 住民税</div>
              </div>
              <div className="font-mono-num text-2xl font-bold text-white">
                {formatYen(result.grandTotal)}<span className="text-sm font-normal ml-1">円</span>
              </div>
            </div>
          </div>

          {/* 内訳 */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-red-50 rounded-lg p-2.5">
              <div className="text-xs text-red-600">所得税</div>
              <div className="font-mono-num text-sm font-bold text-red-800 mt-0.5">{formatYen(result.incomeTax)}</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-2.5">
              <div className="text-xs text-orange-600">復興特別所得税</div>
              <div className="font-mono-num text-sm font-bold text-orange-800 mt-0.5">{formatYen(result.reconstructionTax)}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-2.5">
              <div className="text-xs text-purple-600">住民税（概算）</div>
              <div className="font-mono-num text-sm font-bold text-purple-800 mt-0.5">{formatYen(result.residentTax)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
