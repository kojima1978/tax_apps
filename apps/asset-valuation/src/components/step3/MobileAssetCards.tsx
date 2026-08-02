import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react';
import type { Asset, AnyAssetCategory, AssetCategory } from '@/types';
import { CATEGORY_CONFIG } from '@/types';
import type { SortDirection, SortKey } from '@/hooks/useAssetData';
import { CategorySelect } from '@/components/CategorySelect';
import { categorySectionId } from '@/components/CategoryNav';
import { calcGroupTotals, formatDate, formatYen } from '@/utils/formatters';

interface Props {
  groups: [string, Asset[]][];
  showDetail: boolean;
  onUpdateAsset: (id: string, updates: Partial<Asset>) => void;
  onDeleteAsset: (id: string) => void;
  onAddEmptyAsset: (category: AnyAssetCategory, categoryLabel: string) => void;
  onToggleFixedAssetTaxBulk: (label: string, checked: boolean) => void;
  onSortAssets: (label: string, sortBy: SortKey, direction: SortDirection) => void;
  onMoveAsset: (label: string, sourceId: string, targetId: string) => void;
  onMoveCategory: (label: string, direction: -1 | 1) => void;
}

const fieldClass =
  'min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500';

export function MobileAssetCards({
  groups,
  showDetail,
  onUpdateAsset,
  onDeleteAsset,
  onAddEmptyAsset,
  onToggleFixedAssetTaxBulk,
  onSortAssets,
  onMoveAsset,
  onMoveCategory,
}: Props) {
  const [openAsset, setOpenAsset] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const changeCategory = (asset: Asset, category: AssetCategory) => {
    onUpdateAsset(asset.id, { category, categoryLabel: category });
  };

  return (
    <div className="space-y-5 md:hidden">
      {groups.map(([label, assets], groupIndex) => {
        const category = assets[0]!.category;
        const config = CATEGORY_CONFIG[category];
        const totals = calcGroupTotals(assets);
        const within3 = assets.filter((asset) => asset.isWithin3Years).length;

        return (
          <section
            key={label}
            id={categorySectionId(label)}
            className="scroll-mt-20 overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm"
          >
            <div className="border-b border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-emerald-700">{groupIndex + 1}番目のカテゴリ</p>
                  <h3 className="mt-1 break-words text-base font-bold leading-snug text-emerald-950">
                    {label}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-emerald-800">
                    <span>{assets.length}件</span>
                    <span>評価額 {formatYen(totals.totalEvaluation)}円</span>
                    {within3 > 0 && (
                      <span className="rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-amber-900">
                        3年以内 {within3}件
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onAddEmptyAsset(category, label)}
                  className="flex min-h-11 shrink-0 items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  <Plus size={16} aria-hidden="true" /> 行追加
                </button>
              </div>

              <details className="mt-3 rounded-lg border border-emerald-200 bg-white">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700">
                  <Settings2 size={16} aria-hidden="true" /> カテゴリの並び替え・一括設定
                </summary>
                <div className="space-y-3 border-t border-emerald-100 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onMoveCategory(label, -1)}
                      disabled={groupIndex === 0}
                      className="flex min-h-11 items-center justify-center gap-1 rounded-md border border-slate-300 text-sm disabled:opacity-40"
                    >
                      <ArrowUp size={16} aria-hidden="true" /> 上へ
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveCategory(label, 1)}
                      disabled={groupIndex === groups.length - 1}
                      className="flex min-h-11 items-center justify-center gap-1 rounded-md border border-slate-300 text-sm disabled:opacity-40"
                    >
                      <ArrowDown size={16} aria-hidden="true" /> 下へ
                    </button>
                    <button
                      type="button"
                      onClick={() => onSortAssets(label, 'no', 'asc')}
                      className="min-h-11 rounded-md border border-slate-300 px-2 text-sm"
                    >
                      NO順
                    </button>
                    <button
                      type="button"
                      onClick={() => onSortAssets(label, 'acquisitionDate', 'asc')}
                      className="min-h-11 rounded-md border border-slate-300 px-2 text-sm"
                    >
                      取得年月順
                    </button>
                  </div>
                  {config.hasFixedAssetTaxRecord && (
                    <label className="flex min-h-11 items-center gap-3 rounded-md bg-slate-50 px-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={assets.every((asset) => asset.hasFixedAssetTaxRecord)}
                        onChange={(event) => onToggleFixedAssetTaxBulk(label, event.target.checked)}
                        className="h-5 w-5 rounded"
                      />
                      固定資産税評価明細を一括設定
                    </label>
                  )}
                </div>
              </details>
            </div>

            <div className="divide-y divide-slate-200">
              {assets.map((asset, assetIndex) => {
                const isOpen = openAsset === asset.id;
                return (
                  <article key={asset.id} className={asset.isWithin3Years ? 'bg-amber-50/60' : 'bg-white'}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-500">NO {asset.no}</p>
                          <h4 className="mt-0.5 break-words font-semibold text-slate-900">
                            {asset.name || '名称未入力'}
                          </h4>
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                            <Calendar size={14} aria-hidden="true" /> {formatDate(asset.acquisitionDate) || '取得年月未入力'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOpenAsset(isOpen ? null : asset.id)}
                          className="flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700"
                          aria-expanded={isOpen}
                        >
                          <Pencil size={15} aria-hidden="true" /> {isOpen ? '閉じる' : '編集'}
                        </button>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                        <div>
                          <dt className="text-xs text-slate-500">取得価額</dt>
                          <dd className="mt-0.5 font-mono font-semibold">{formatYen(asset.acquisitionCost)}円</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">相続税評価額</dt>
                          <dd className="mt-0.5 font-mono font-semibold text-emerald-800">
                            {asset.evaluationAmount === null ? '―' : `${formatYen(asset.evaluationAmount)}円`}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {isOpen && (
                      <div className="space-y-4 border-t border-slate-200 bg-slate-50 p-4">
                        <div>
                          <label htmlFor={`mobile-name-${asset.id}`} className="mb-1 block text-sm font-medium text-slate-700">資産名称</label>
                          <input
                            id={`mobile-name-${asset.id}`}
                            value={asset.name}
                            onChange={(event) => onUpdateAsset(asset.id, { name: event.target.value })}
                            className={fieldClass}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor={`mobile-no-${asset.id}`} className="mb-1 block text-sm font-medium text-slate-700">NO</label>
                            <input
                              id={`mobile-no-${asset.id}`}
                              type="number"
                              inputMode="numeric"
                              value={asset.no || ''}
                              onChange={(event) => onUpdateAsset(asset.id, { no: Number(event.target.value) })}
                              className={fieldClass}
                            />
                          </div>
                          <div>
                            <label htmlFor={`mobile-life-${asset.id}`} className="mb-1 block text-sm font-medium text-slate-700">耐用年数</label>
                            <input
                              id={`mobile-life-${asset.id}`}
                              type="number"
                              inputMode="numeric"
                              value={asset.usefulLife || ''}
                              onChange={(event) => onUpdateAsset(asset.id, { usefulLife: Number(event.target.value) })}
                              className={fieldClass}
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor={`mobile-date-${asset.id}`} className="mb-1 block text-sm font-medium text-slate-700">取得年月日</label>
                          <input
                            id={`mobile-date-${asset.id}`}
                            type="date"
                            value={asset.acquisitionDate}
                            onChange={(event) => onUpdateAsset(asset.id, { acquisitionDate: event.target.value })}
                            className={fieldClass}
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label htmlFor={`mobile-acq-${asset.id}`} className="mb-1 block text-sm font-medium text-slate-700">取得価額</label>
                            <input
                              id={`mobile-acq-${asset.id}`}
                              type="number"
                              inputMode="numeric"
                              value={asset.acquisitionCost || ''}
                              onChange={(event) => onUpdateAsset(asset.id, { acquisitionCost: Number(event.target.value) })}
                              className={fieldClass}
                            />
                          </div>
                          <div>
                            <label htmlFor={`mobile-book-${asset.id}`} className="mb-1 block text-sm font-medium text-slate-700">期末簿価</label>
                            <input
                              id={`mobile-book-${asset.id}`}
                              type="number"
                              inputMode="numeric"
                              value={asset.bookValue || ''}
                              onChange={(event) => onUpdateAsset(asset.id, { bookValue: Number(event.target.value) })}
                              className={fieldClass}
                            />
                          </div>
                        </div>
                        <div>
                          <span className="mb-1 block text-sm font-medium text-slate-700">カテゴリ</span>
                          <CategorySelect value={asset.category} onChange={(value) => changeCategory(asset, value)} />
                        </div>
                        <div className="space-y-2">
                          {config.hasFixedAssetTaxRecord && (
                            <label className="flex min-h-11 items-center gap-3 rounded-md bg-white px-3 text-sm">
                              <input
                                type="checkbox"
                                checked={asset.hasFixedAssetTaxRecord}
                                onChange={(event) => onUpdateAsset(asset.id, { hasFixedAssetTaxRecord: event.target.checked })}
                                className="h-5 w-5 rounded"
                              />
                              固定資産税評価明細あり
                            </label>
                          )}
                          {config.hasRental && (
                            <label className="flex min-h-11 items-center gap-3 rounded-md bg-white px-3 text-sm">
                              <input
                                type="checkbox"
                                checked={asset.isRental}
                                onChange={(event) => onUpdateAsset(asset.id, { isRental: event.target.checked })}
                                className="h-5 w-5 rounded"
                              />
                              賃貸資産
                            </label>
                          )}
                        </div>
                        {showDetail && (
                          <dl className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700">
                            <div className="flex justify-between gap-3"><dt>経過年数</dt><dd>{asset.elapsedYears}年</dd></div>
                            <div className="mt-1 flex justify-between gap-3"><dt>評価根拠</dt><dd className="text-right">{asset.evaluationBasis}</dd></div>
                          </dl>
                        )}
                        <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              const target = assets[assetIndex - 1];
                              if (target) onMoveAsset(label, asset.id, target.id);
                            }}
                            disabled={assetIndex === 0}
                            className="flex min-h-11 items-center justify-center gap-1 rounded-md border border-slate-300 text-sm disabled:opacity-40"
                          >
                            <ChevronUp size={16} aria-hidden="true" /> 上へ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const target = assets[assetIndex + 1];
                              if (target) onMoveAsset(label, asset.id, target.id);
                            }}
                            disabled={assetIndex === assets.length - 1}
                            className="flex min-h-11 items-center justify-center gap-1 rounded-md border border-slate-300 text-sm disabled:opacity-40"
                          >
                            <ChevronDown size={16} aria-hidden="true" /> 下へ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (pendingDelete === asset.id) {
                                onDeleteAsset(asset.id);
                                setPendingDelete(null);
                              } else {
                                setPendingDelete(asset.id);
                              }
                            }}
                            className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-300 text-sm font-medium text-red-700"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                            {pendingDelete === asset.id ? 'もう一度押して削除' : 'この資産を削除'}
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
