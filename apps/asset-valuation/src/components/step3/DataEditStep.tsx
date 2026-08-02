import { useMemo, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { StepNavigation } from '@/components/StepNavigation';
import { CategoryNav } from '@/components/CategoryNav';
import type { Asset, AnyAssetCategory, CategoryOrderPreset } from '@/types';
import type { SortKey, SortDirection } from '@/hooks/useAssetData';
import { validateAllAssets, hasErrors } from '@/utils/validators';
import { formatDate } from '@/utils/formatters';
import { AssetTable } from './AssetTable';
import { CategoryOrderBar } from './CategoryOrderBar';

interface Props {
  assets: Asset[];
  groupedAssets: Map<string, Asset[]>;
  taxDate: string;
  onUpdateAsset: (id: string, updates: Partial<Asset>) => void;
  onDeleteAsset: (id: string) => void;
  onAddEmptyAsset: (category: AnyAssetCategory, categoryLabel: string) => void;
  onToggleFixedAssetTaxBulk: (label: string, checked: boolean) => void;
  onSortAssets: (label: string, sortBy: SortKey, direction: SortDirection) => void;
  onMoveAsset: (label: string, sourceId: string, targetId: string) => void;
  onMoveCategory: (label: string, direction: -1 | 1) => void;
  onMoveCategoryTo: (label: string, index: number) => void;
  onApplyCategoryOrder: (order: string[]) => void;
  onResetCategoryOrder: () => void;
  onUndoOrder: () => void;
  canUndoOrder: boolean;
  orderPresets: CategoryOrderPreset[];
  onSaveOrderPreset: (name: string, order: string[]) => void;
  onDeleteOrderPreset: (name: string) => void;
  /** カテゴリ順を入れ替え済みか（標準に戻すボタンの出し分け） */
  isCustomCategoryOrder: boolean;
  onBack: () => void;
  onNext: () => void;
  onGoToStep1: () => void;
}

export function DataEditStep({
  assets,
  groupedAssets,
  taxDate,
  onUpdateAsset,
  onDeleteAsset,
  onAddEmptyAsset,
  onToggleFixedAssetTaxBulk,
  onSortAssets,
  onMoveAsset,
  onMoveCategory,
  onMoveCategoryTo,
  onApplyCategoryOrder,
  onResetCategoryOrder,
  onUndoOrder,
  canUndoOrder,
  orderPresets,
  onSaveOrderPreset,
  onDeleteOrderPreset,
  isCustomCategoryOrder,
  onBack,
  onNext,
  onGoToStep1,
}: Props) {
  const validationResults = useMemo(() => validateAllAssets(assets), [assets]);
  const errors = useMemo(() => validationResults.filter((r) => r.type === 'error'), [validationResults]);
  const warnings = useMemo(() => validationResults.filter((r) => r.type === 'warning'), [validationResults]);
  const navGroups = useMemo(() => Array.from(groupedAssets.entries()), [groupedAssets]);
  // 横スクロールを抑えるため、計算結果の列は既定で隠す
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">
        データ確認・編集
      </h2>

      {/* 凡例・件数 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-600 bg-white rounded-md border border-gray-200 px-4 py-3">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded" />
          3年以内取得
        </span>
        <span className="hidden text-gray-400 sm:inline">|</span>
        <span>全 <strong>{assets.length}</strong> 件</span>
        <span className="hidden text-gray-400 sm:inline">|</span>
        <span>課税時期 <strong>{formatDate(taxDate)}</strong></span>
        <span className="hidden text-gray-400 md:inline">|</span>
        <span className="hidden items-center gap-1 text-xs text-gray-500 md:flex">
          <GripVertical size={13} className="text-gray-400" />
          行頭をドラッグ、または ↑↓ キーでカテゴリ内の並べ替え
        </span>
        <label className="flex min-h-11 w-full items-center gap-2 rounded-md bg-gray-50 px-3 text-sm text-gray-700 cursor-pointer md:ml-auto md:w-auto md:bg-transparent md:px-0 md:text-xs">
          <input
            type="checkbox"
            checked={showDetail}
            onChange={(e) => setShowDetail(e.target.checked)}
            className="h-5 w-5 rounded cursor-pointer md:h-4 md:w-4"
          />
          詳細列（経過年数・償却額・評価根拠）
        </label>
      </div>

      {/* カテゴリ順の操作（Undo・標準に戻す・プリセット） */}
      <div className="hidden md:block">
        <CategoryOrderBar
          currentOrder={navGroups.map(([label]) => label)}
          orderPresets={orderPresets}
          onApplyOrder={onApplyCategoryOrder}
          onSavePreset={onSaveOrderPreset}
          onDeletePreset={onDeleteOrderPreset}
          onUndoOrder={onUndoOrder}
          canUndoOrder={canUndoOrder}
          onResetCategoryOrder={onResetCategoryOrder}
          isCustomCategoryOrder={isCustomCategoryOrder}
        />
      </div>

      <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-900 md:hidden">
        各資産の「編集」を押すと入力項目が開きます。カテゴリ順や一括設定は、カテゴリ見出し内の設定から変更できます。
      </p>

      {/* カテゴリ間ナビゲーション */}
      <CategoryNav groups={navGroups} />

      {/* バリデーション結果 */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
          <strong>エラー（{errors.length}件）:</strong>
          <ul className="mt-1 list-disc list-inside">
            {errors.slice(0, 5).map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
            {errors.length > 5 && <li>他 {errors.length - 5}件...</li>}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
          <strong>警告（{warnings.length}件）:</strong>
          <ul className="mt-1 list-disc list-inside">
            {warnings.slice(0, 5).map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
            {warnings.length > 5 && (
              <li>他 {warnings.length - 5}件...</li>
            )}
          </ul>
        </div>
      )}

      {/* テーブル */}
      <AssetTable
        groupedAssets={groupedAssets}
        showDetail={showDetail}
        onUpdateAsset={onUpdateAsset}
        onDeleteAsset={onDeleteAsset}
        onAddEmptyAsset={onAddEmptyAsset}
        onToggleFixedAssetTaxBulk={onToggleFixedAssetTaxBulk}
        onSortAssets={onSortAssets}
        onMoveAsset={onMoveAsset}
        onMoveCategory={onMoveCategory}
        onMoveCategoryTo={onMoveCategoryTo}
      />

      <StepNavigation
        onBack={onBack}
        onNext={onNext}
        onGoToStep1={onGoToStep1}
        nextDisabled={hasErrors(validationResults)}
      />
    </div>
  );
}
