import { useMemo } from 'react';
import { StepNavigation } from '@/components/StepNavigation';
import type { Asset, AssetCategory } from '@/types';
import { validateAllAssets, hasErrors } from '@/utils/validators';
import { AssetTable } from './AssetTable';

interface Props {
  assets: Asset[];
  groupedAssets: Map<string, Asset[]>;
  taxDate: string;
  onUpdateAsset: (id: string, updates: Partial<Asset>) => void;
  onDeleteAsset: (id: string) => void;
  onAddEmptyAsset: (category: AssetCategory, categoryLabel: string) => void;
  onToggleFixedAssetTaxBulk: (label: string, checked: boolean) => void;
  onSortAssets: (label: string, sortBy: 'no' | 'acquisitionDate' | 'acquisitionCost') => void;
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
  onBack,
  onNext,
  onGoToStep1,
}: Props) {
  const validationResults = useMemo(() => validateAllAssets(assets), [assets]);
  const errors = useMemo(() => validationResults.filter((r) => r.type === 'error'), [validationResults]);
  const warnings = useMemo(() => validationResults.filter((r) => r.type === 'warning'), [validationResults]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">
        データ確認・編集
      </h2>

      {/* 3年以内ハイライト凡例 */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-50 border border-yellow-200 rounded" />
          3年以内取得
        </span>
        <span>全{assets.length}件</span>
      </div>

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
        taxDate={taxDate}
        onUpdateAsset={onUpdateAsset}
        onDeleteAsset={onDeleteAsset}
        onAddEmptyAsset={onAddEmptyAsset}
        onToggleFixedAssetTaxBulk={onToggleFixedAssetTaxBulk}
        onSortAssets={onSortAssets}
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
