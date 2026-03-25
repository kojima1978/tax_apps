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

      {/* 凡例・件数 */}
      <div className="flex items-center gap-4 text-sm text-gray-600 bg-white rounded-md border border-gray-200 px-4 py-2">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded" />
          3年以内取得
        </span>
        <span className="text-gray-400">|</span>
        <span>全 <strong>{assets.length}</strong> 件</span>
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
