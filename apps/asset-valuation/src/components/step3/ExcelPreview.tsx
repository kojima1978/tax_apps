import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import type { Asset } from '@/types';
import { CATEGORY_CONFIG, groupByLabel } from '@/types';
import { categorySectionId } from '@/components/CategoryNav';
import { formatYen, formatDate, formatDepreciation, calcGroupTotals } from '@/utils/formatters';
import { calcWithin3YearsDate } from '@/utils/calculation';

interface Props {
  caseName: string;
  taxDate: string;
  assets: Asset[];
  /** Step3で入れ替えたカテゴリの表示順 */
  labelOrder: string[];
}

export function ExcelPreview({ caseName, taxDate, assets, labelOrder }: Props) {
  const threeYearsAgo = calcWithin3YearsDate(taxDate);
  const groups = useMemo(
    () => groupByLabel(assets, labelOrder),
    [assets, labelOrder]
  );
  // 折りたたみ中のカテゴリ（既定は全展開）
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const allCollapsed = collapsed.size >= groups.length && groups.length > 0;

  const toggleGroup = (label: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(label)) next.add(label);
      return next;
    });
  };

  const toggleAll = () =>
    setCollapsed(allCollapsed ? new Set() : new Set(groups.map(([l]) => l)));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 font-mono text-xs sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="font-bold text-sm mb-1">{caseName}</div>
        {groups.length > 1 && (
          <button
            onClick={toggleAll}
            className="flex items-center gap-1 px-2 py-1 text-xs font-sans rounded border border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700 cursor-pointer transition-colors"
          >
            {allCollapsed ? <ChevronsUpDown size={12} /> : <ChevronsDownUp size={12} />}
            {allCollapsed ? 'すべて展開' : 'すべて折りたたむ'}
          </button>
        )}
      </div>
      <div className="text-gray-600 mb-0.5">
        課税時期: {formatDate(taxDate)}
      </div>
      {/* Excel側は和暦書式（R05.07.02）だが、プレビューは他の日付にそろえて西暦表記 */}
      <div className="text-gray-600 mb-4">
        3年以内: {formatDate(threeYearsAgo)}
      </div>

      {groups.map(([label, catAssets]) => {
        const category = catAssets[0]!.category;
        const config = CATEGORY_CONFIG[category];

        const { totalAcquisition: totalAcq, totalEvaluation: totalEval, totalBookValue: totalBook } = calcGroupTotals(catAssets);
        const isCollapsed = collapsed.has(label);

        return (
          <div
            key={label}
            id={categorySectionId(label)}
            className="mb-4 scroll-mt-16"
          >
            {/* 見出しクリックで折りたたみ。閉じているときは件数と評価額合計だけ見せる */}
            <button
              onClick={() => toggleGroup(label)}
              className="w-full flex items-center gap-1 font-bold mb-1 text-left cursor-pointer hover:text-green-700 transition-colors"
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              【　{label}　】
              {isCollapsed && (
                <span className="font-normal text-gray-500">
                  {catAssets.length}件 / 評価額 {formatYen(totalEval)}
                </span>
              )}
            </button>
            <div className={`space-y-2 sm:hidden ${isCollapsed ? 'hidden' : ''}`}>
              {catAssets.map((asset) => (
                <div key={asset.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 font-sans">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-500">NO {asset.no}</p>
                      <p className="break-words text-sm font-semibold text-slate-900">{asset.name}</p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-bold text-emerald-800">
                      {asset.evaluationAmount === null ? '―' : `${formatYen(asset.evaluationAmount)}円`}
                    </span>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div><dt>取得年月</dt><dd className="mt-0.5 text-slate-900">{formatDate(asset.acquisitionDate)}</dd></div>
                    <div><dt>取得価額</dt><dd className="mt-0.5 font-mono text-slate-900">{formatYen(asset.acquisitionCost)}円</dd></div>
                  </dl>
                </div>
              ))}
              <div className="flex justify-between rounded-md bg-slate-100 px-3 py-2 text-sm font-bold">
                <span>合計</span><span>{formatYen(totalEval)}円</span>
              </div>
            </div>
            <div className={`hidden overflow-x-auto sm:block ${isCollapsed ? 'sm:hidden' : ''}`}>
            <table className="w-full min-w-[960px] border-collapse">
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
          </div>
        );
      })}
    </div>
  );
}
