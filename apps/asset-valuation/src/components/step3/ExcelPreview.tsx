import { useMemo } from 'react';
import type { Asset } from '@/types';
import { CATEGORY_CONFIG, groupByLabel } from '@/types';
import { formatYen, formatDate, formatDepreciation, calcGroupTotals } from '@/utils/formatters';
import { calcWithin3YearsDate } from '@/utils/calculation';

interface Props {
  caseName: string;
  taxDate: string;
  assets: Asset[];
}

export function ExcelPreview({ caseName, taxDate, assets }: Props) {
  const threeYearsAgo = calcWithin3YearsDate(taxDate);
  const groups = useMemo(() => groupByLabel(assets), [assets]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 font-mono text-xs">
      <div className="font-bold text-sm mb-1">{caseName}</div>
      <div className="text-gray-600 mb-0.5">
        課税時期: {formatDate(taxDate)}
      </div>
      <div className="text-gray-600 mb-4">
        3年以内: {formatDate(
          `${threeYearsAgo.getFullYear()}-${String(threeYearsAgo.getMonth() + 1).padStart(2, '0')}-${String(threeYearsAgo.getDate()).padStart(2, '0')}`
        )}
      </div>

      {groups.map(([label, catAssets]) => {
        const category = catAssets[0]!.category;
        const config = CATEGORY_CONFIG[category];

        const { totalAcquisition: totalAcq, totalEvaluation: totalEval, totalBookValue: totalBook } = calcGroupTotals(catAssets);

        return (
          <div key={label} className="mb-4">
            <div className="font-bold mb-1">
              【　{label}　】
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#D9E1F2]">
                  <th className="border px-1 py-0.5 text-left w-10">NO</th>
                  <th className="border px-1 py-0.5 text-left">名称等</th>
                  <th className="border px-1 py-0.5 text-center w-20">取得年月</th>
                  <th className="border px-1 py-0.5 text-center w-20">課税時期</th>
                  <th className="border px-1 py-0.5 text-center w-12">経過</th>
                  <th className="border px-1 py-0.5 text-center w-12">耐用</th>
                  <th className="border px-1 py-0.5 text-right w-20">取得価額</th>
                  <th className="border px-1 py-0.5 text-right w-20">
                    {config.headerLabel}
                  </th>
                  <th className="border px-1 py-0.5 text-right w-20">評価額</th>
                  <th className="border px-1 py-0.5 text-right w-20">期末簿価</th>
                  <th className="border px-1 py-0.5 text-center w-24">その他</th>
                </tr>
              </thead>
              <tbody>
                {catAssets.map((a) => (
                  <tr key={a.id}>
                    <td className="border px-1 py-0.5">{a.no}</td>
                    <td className="border px-1 py-0.5 truncate max-w-[120px]">
                      {a.name}
                    </td>
                    <td className="border px-1 py-0.5 text-center">
                      {formatDate(a.acquisitionDate)}
                    </td>
                    <td className="border px-1 py-0.5 text-center">
                      {formatDate(taxDate)}
                    </td>
                    <td className="border px-1 py-0.5 text-center">
                      {a.elapsedYears}
                    </td>
                    <td className="border px-1 py-0.5 text-center">
                      {a.usefulLife}
                    </td>
                    <td className="border px-1 py-0.5 text-right">
                      {formatYen(a.acquisitionCost)}
                    </td>
                    <td className="border px-1 py-0.5 text-right">
                      {formatDepreciation(category, a.depreciationAmountOrRate)}
                    </td>
                    <td className="border px-1 py-0.5 text-right">
                      {a.evaluationAmount === null
                        ? '−'
                        : formatYen(a.evaluationAmount)}
                    </td>
                    <td className="border px-1 py-0.5 text-right">
                      {formatYen(a.bookValue)}
                    </td>
                    <td className="border px-1 py-0.5 text-center text-[9px]">
                      {a.evaluationBasis}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold border-t-2">
                  <td colSpan={6} className="border px-1 py-0.5 text-right">
                    合　計
                  </td>
                  <td className="border px-1 py-0.5 text-right">
                    {formatYen(totalAcq)}
                  </td>
                  <td className="border px-1 py-0.5" />
                  <td className="border px-1 py-0.5 text-right">
                    {formatYen(totalEval)}
                  </td>
                  <td className="border px-1 py-0.5 text-right">
                    {formatYen(totalBook)}
                  </td>
                  <td className="border px-1 py-0.5" />
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}
    </div>
  );
}
