import { useState } from 'react';
import { ArrowUpDown, Trash2, Plus } from 'lucide-react';
import type { Asset, AssetCategory } from '@/types';
import { CATEGORY_CONFIG } from '@/types';
import { formatYen, formatDate, formatDepreciation, calcGroupTotals } from '@/utils/formatters';

interface Props {
  groupedAssets: Map<string, Asset[]>;
  taxDate: string;
  onUpdateAsset: (id: string, updates: Partial<Asset>) => void;
  onDeleteAsset: (id: string) => void;
  onAddEmptyAsset: (category: AssetCategory, categoryLabel: string) => void;
  onToggleFixedAssetTaxBulk: (label: string, checked: boolean) => void;
  onSortAssets: (label: string, sortBy: 'no' | 'acquisitionDate' | 'acquisitionCost') => void;
}

export function AssetTable({
  groupedAssets,
  taxDate,
  onUpdateAsset,
  onDeleteAsset,
  onAddEmptyAsset,
  onToggleFixedAssetTaxBulk,
  onSortAssets,
}: Props) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (pendingDelete === id) {
      onDeleteAsset(id);
      setPendingDelete(null);
    } else {
      setPendingDelete(id);
    }
  };

  return (
    <div className="space-y-6">
      {Array.from(groupedAssets.entries()).map(([label, assets]) => {
        if (assets.length === 0) return null;
        const category = assets[0]!.category;
        const config = CATEGORY_CONFIG[category];

        const { totalAcquisition, totalEvaluation, totalBookValue } = calcGroupTotals(assets);

        return (
          <div key={label} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* カテゴリヘッダー */}
            <div className="bg-green-50 border-b px-4 py-2 flex items-center justify-between">
              <h3 className="font-bold text-green-800">
                {label}（{assets.length}件）
              </h3>
              <div className="flex items-center gap-2">
                {config.hasFixedAssetTaxRecord && (
                  <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assets.every((a) => a.hasFixedAssetTaxRecord)}
                      onChange={(e) => onToggleFixedAssetTaxBulk(label, e.target.checked)}
                      className="rounded cursor-pointer"
                      aria-label={`${label} 固定資産税評価明細 一括`}
                    />
                    固定資産税評価明細 一括
                  </label>
                )}
                <div className="flex gap-1">
                  <button
                    onClick={() => onSortAssets(label, 'no')}
                    className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
                    title="NO順"
                    aria-label={`${label}をNO順に並べ替え`}
                  >
                    <ArrowUpDown size={14} />
                  </button>
                </div>
                <button
                  onClick={() => onAddEmptyAsset(category, label)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer transition-colors"
                >
                  <Plus size={12} /> 行追加
                </button>
              </div>
            </div>

            {/* テーブル */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-2 py-1.5 text-left w-12">NO</th>
                    <th className="px-2 py-1.5 text-left w-40">名称</th>
                    <th className="px-2 py-1.5 text-left w-24">取得年月</th>
                    <th className="px-2 py-1.5 text-center w-24">課税時期</th>
                    <th className="px-2 py-1.5 text-center w-14">経過年数</th>
                    <th className="px-2 py-1.5 text-center w-14">耐用年数</th>
                    <th className="px-2 py-1.5 text-right w-24">取得価額</th>
                    <th className="px-2 py-1.5 text-right w-24">{config.headerLabel}</th>
                    <th className="px-2 py-1.5 text-right w-24">相続税評価額</th>
                    <th className="px-2 py-1.5 text-right w-24">期末簿価</th>
                    <th className="px-2 py-1.5 text-center w-28">評価根拠</th>
                    {config.hasFixedAssetTaxRecord && (
                      <th className="px-2 py-1.5 text-center w-16">固資税</th>
                    )}
                    {config.hasRental && (
                      <th className="px-2 py-1.5 text-center w-12">賃貸</th>
                    )}
                    <th className="px-2 py-1.5 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr
                      key={asset.id}
                      className={`border-b hover:bg-gray-50 ${
                        asset.isWithin3Years ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={asset.no || ''}
                          onChange={(e) => onUpdateAsset(asset.id, { no: Number(e.target.value) })}
                          className="w-full px-1 py-0.5 border rounded text-xs"
                          aria-label={`${asset.name || '資産'} NO`}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={asset.name}
                          onChange={(e) => onUpdateAsset(asset.id, { name: e.target.value })}
                          className="w-full px-1 py-0.5 border rounded text-xs"
                          aria-label="資産名称"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="date"
                          value={asset.acquisitionDate}
                          onChange={(e) => onUpdateAsset(asset.id, { acquisitionDate: e.target.value })}
                          className="w-full px-1 py-0.5 border rounded text-xs"
                          aria-label={`${asset.name || '資産'} 取得年月`}
                        />
                      </td>
                      <td className="px-2 py-1 text-center text-gray-600">
                        {formatDate(taxDate)}
                      </td>
                      <td className="px-2 py-1 text-center font-mono">
                        {asset.elapsedYears}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={asset.usefulLife || ''}
                          onChange={(e) => onUpdateAsset(asset.id, { usefulLife: Number(e.target.value) })}
                          className="w-full px-1 py-0.5 border rounded text-xs text-center"
                          aria-label={`${asset.name || '資産'} 耐用年数`}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={asset.acquisitionCost ? formatYen(asset.acquisitionCost) : ''}
                          onChange={(e) => {
                            const v = Number(e.target.value.replace(/,/g, ''));
                            if (!isNaN(v)) onUpdateAsset(asset.id, { acquisitionCost: v });
                          }}
                          className="w-full px-1 py-0.5 border rounded text-xs text-right font-mono"
                          aria-label={`${asset.name || '資産'} 取得価額`}
                        />
                      </td>
                      <td className="px-2 py-1 text-right font-mono">
                        {formatDepreciation(category, asset.depreciationAmountOrRate)}
                      </td>
                      <td className="px-2 py-1 text-right font-mono">
                        {asset.evaluationAmount === null ? (
                          <span className="text-gray-500">−</span>
                        ) : (
                          formatYen(asset.evaluationAmount)
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={asset.bookValue ? formatYen(asset.bookValue) : ''}
                          onChange={(e) => {
                            const v = Number(e.target.value.replace(/,/g, ''));
                            if (!isNaN(v)) onUpdateAsset(asset.id, { bookValue: v });
                          }}
                          className="w-full px-1 py-0.5 border rounded text-xs text-right font-mono"
                          aria-label={`${asset.name || '資産'} 期末簿価`}
                        />
                      </td>
                      <td className="px-2 py-1 text-center text-[10px] text-gray-600">
                        {asset.evaluationBasis}
                      </td>
                      {config.hasFixedAssetTaxRecord && (
                        <td className="px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={asset.hasFixedAssetTaxRecord}
                            onChange={(e) => onUpdateAsset(asset.id, { hasFixedAssetTaxRecord: e.target.checked })}
                            className="rounded cursor-pointer"
                            aria-label={`${asset.name || '資産'} 固定資産税評価明細`}
                          />
                        </td>
                      )}
                      {config.hasRental && (
                        <td className="px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={asset.isRental}
                            onChange={(e) => onUpdateAsset(asset.id, { isRental: e.target.checked })}
                            className="rounded cursor-pointer"
                            aria-label={`${asset.name || '資産'} 賃貸`}
                          />
                        </td>
                      )}
                      <td className="px-2 py-1">
                        <button
                          onClick={() => handleDelete(asset.id)}
                          onBlur={() => setPendingDelete(null)}
                          className={`cursor-pointer transition-colors ${
                            pendingDelete === asset.id
                              ? 'text-red-600 hover:text-red-700'
                              : 'text-gray-400 hover:text-red-500'
                          }`}
                          title={pendingDelete === asset.id ? 'もう一度クリックで削除' : '削除'}
                          aria-label={`${asset.name || '資産'} を削除`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold border-t-2">
                    <td colSpan={6} className="px-2 py-1.5 text-right">
                      合　計
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {formatYen(totalAcquisition)}
                    </td>
                    <td />
                    <td className="px-2 py-1.5 text-right font-mono">
                      {formatYen(totalEvaluation)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {formatYen(totalBookValue)}
                    </td>
                    <td colSpan={4} />
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
