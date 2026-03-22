import { ArrowUpDown, Trash2, Plus } from 'lucide-react';
import type { Asset, AssetCategory } from '@/types';
import { CATEGORY_CONFIG, CATEGORY_ORDER } from '@/types';
import { formatYen, formatDate } from '@/utils/formatters';

interface Props {
  groupedAssets: Map<AssetCategory, Asset[]>;
  taxDate: string;
  onUpdateAsset: (id: string, updates: Partial<Asset>) => void;
  onDeleteAsset: (id: string) => void;
  onAddEmptyAsset: (category: AssetCategory) => void;
  onToggleFixedAssetTaxBulk: (category: AssetCategory, checked: boolean) => void;
  onSortAssets: (category: AssetCategory, sortBy: 'no' | 'acquisitionDate' | 'acquisitionCost') => void;
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
  return (
    <div className="space-y-6">
      {CATEGORY_ORDER.map((category) => {
        const assets = groupedAssets.get(category);
        if (!assets || assets.length === 0) return null;
        const config = CATEGORY_CONFIG[category];

        const totalAcquisition = assets.reduce((s, a) => s + a.acquisitionCost, 0);
        const totalEvaluation = assets.reduce(
          (s, a) => s + (a.evaluationAmount ?? 0),
          0
        );
        const totalBookValue = assets.reduce((s, a) => s + a.bookValue, 0);

        return (
          <div key={category} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* カテゴリヘッダー */}
            <div className="bg-green-50 border-b px-4 py-2 flex items-center justify-between">
              <h3 className="font-bold text-green-800">
                {config.label}（{assets.length}件）
              </h3>
              <div className="flex items-center gap-2">
                {config.hasFixedAssetTaxRecord && (
                  <label className="flex items-center gap-1 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={assets.every((a) => a.hasFixedAssetTaxRecord)}
                      onChange={(e) => onToggleFixedAssetTaxBulk(category, e.target.checked)}
                      className="rounded"
                    />
                    固定資産税評価明細 一括
                  </label>
                )}
                <div className="flex gap-1">
                  <button
                    onClick={() => onSortAssets(category, 'no')}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="NO順"
                  >
                    <ArrowUpDown size={14} />
                  </button>
                </div>
                <button
                  onClick={() => onAddEmptyAsset(category)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
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
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={asset.name}
                          onChange={(e) => onUpdateAsset(asset.id, { name: e.target.value })}
                          className="w-full px-1 py-0.5 border rounded text-xs"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="date"
                          value={asset.acquisitionDate}
                          onChange={(e) => onUpdateAsset(asset.id, { acquisitionDate: e.target.value })}
                          className="w-full px-1 py-0.5 border rounded text-xs"
                        />
                      </td>
                      <td className="px-2 py-1 text-center text-gray-500">
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
                        />
                      </td>
                      <td className="px-2 py-1 text-right font-mono">
                        {category === '建物'
                          ? formatYen(Math.floor(asset.depreciationAmountOrRate))
                          : asset.depreciationAmountOrRate.toFixed(3)}
                      </td>
                      <td className="px-2 py-1 text-right font-mono">
                        {asset.evaluationAmount === null ? (
                          <span className="text-gray-400">−</span>
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
                        />
                      </td>
                      <td className="px-2 py-1 text-center text-[10px] text-gray-500">
                        {asset.evaluationBasis}
                      </td>
                      {config.hasFixedAssetTaxRecord && (
                        <td className="px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={asset.hasFixedAssetTaxRecord}
                            onChange={(e) => onUpdateAsset(asset.id, { hasFixedAssetTaxRecord: e.target.checked })}
                            className="rounded"
                          />
                        </td>
                      )}
                      {config.hasRental && (
                        <td className="px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={asset.isRental}
                            onChange={(e) => onUpdateAsset(asset.id, { isRental: e.target.checked })}
                            className="rounded"
                          />
                        </td>
                      )}
                      <td className="px-2 py-1">
                        <button
                          onClick={() => onDeleteAsset(asset.id)}
                          className="text-gray-400 hover:text-red-500"
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
