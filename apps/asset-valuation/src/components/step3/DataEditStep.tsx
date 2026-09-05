import { useEffect, useMemo, useState } from 'react';
import { GripVertical, AlertTriangle, CircleAlert, Check, CloudOff, Settings } from 'lucide-react';
import { StepNavigation } from '@/components/StepNavigation';
import { CategoryNav } from '@/components/CategoryNav';
import type { Asset, AnyAssetCategory, CategoryOrderPreset } from '@/types';
import type { SortKey, SortDirection } from '@/hooks/useAssetData';
import { validateAllAssets, hasErrors } from '@/utils/validators';
import type { ValidationResult } from '@/utils/validators';
import { formatYen, formatDateTime } from '@/utils/formatters';
import { AssetTable } from './AssetTable';
import { CategoryOrderBar } from './CategoryOrderBar';
import { scrollToAsset } from './anchors';

/** ジャンプ先の行を強調しておく時間（ms） */
const FLASH_MS = 2500;

interface Props {
  assets: Asset[];
  groupedAssets: Map<string, Asset[]>;
  caseName: string;
  taxDate: string;
  onCaseNameChange: (name: string) => void;
  /** 課税時期の変更（App側で全行の再計算まで行う） */
  onTaxDateChange: (date: string) => void;
  /** 自動保存の最終時刻（ISO文字列） */
  savedAt: string | null;
  /** 自動保存に失敗しているか */
  saveError: boolean;
  onUpdateAsset: (id: string, updates: Partial<Asset>) => void;
  onDeleteAsset: (id: string) => void;
  onAddEmptyAsset: (category: AnyAssetCategory, categoryLabel: string) => void;
  onToggleFixedAssetTaxBulk: (label: string, checked: boolean) => void;
  onSortAssets: (label: string, sortBy: SortKey, direction: SortDirection) => void;
  onMoveAsset: (label: string, sourceId: string, targetId: string) => void;
  onMoveAssetsTo: (label: string, ids: string[], slot: number) => void;
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
  onExportPresets: () => void;
  onGoToStep1: () => void;
}

export function DataEditStep({
  assets,
  groupedAssets,
  caseName,
  taxDate,
  onCaseNameChange,
  onTaxDateChange,
  savedAt,
  saveError,
  onUpdateAsset,
  onDeleteAsset,
  onAddEmptyAsset,
  onToggleFixedAssetTaxBulk,
  onSortAssets,
  onMoveAsset,
  onMoveAssetsTo,
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
  onExportPresets,
  onGoToStep1,
}: Props) {
  const missingBasicInfo = !caseName.trim() || !taxDate;
  const validationResults = useMemo(() => validateAllAssets(assets), [assets]);
  const errors = useMemo(() => validationResults.filter((r) => r.type === 'error'), [validationResults]);
  const warnings = useMemo(() => validationResults.filter((r) => r.type === 'warning'), [validationResults]);
  const navGroups = useMemo(() => Array.from(groupedAssets.entries()), [groupedAssets]);
  // 横スクロールを抑えるため、計算結果の列は既定で隠す
  const [showDetail, setShowDetail] = useState(false);
  // エラー一覧からジャンプした直後の行（一時的に強調する）
  const [flashAssetId, setFlashAssetId] = useState<string | null>(null);

  const assetById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets]
  );

  const totals = useMemo(
    () => ({
      acquisition: assets.reduce((s, a) => s + a.acquisitionCost, 0),
      evaluation: assets.reduce((s, a) => s + (a.evaluationAmount ?? 0), 0),
    }),
    [assets]
  );

  /** カテゴリごとのエラー・警告件数（カテゴリチップのバッジ用） */
  const issueCounts = useMemo(() => {
    const counts = new Map<string, { errors: number; warnings: number }>();
    for (const result of validationResults) {
      const label = assetById.get(result.assetId)?.categoryLabel;
      if (!label) continue;
      const current = counts.get(label) ?? { errors: 0, warnings: 0 };
      if (result.type === 'error') current.errors += 1;
      else current.warnings += 1;
      counts.set(label, current);
    }
    return counts;
  }, [validationResults, assetById]);

  useEffect(() => {
    if (!flashAssetId) return;
    const timer = setTimeout(() => setFlashAssetId(null), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flashAssetId]);

  /** エラー・警告から該当行へ移動する */
  const jumpToAsset = (assetId: string) => {
    setFlashAssetId(assetId);
    // requestAnimationFrame は非表示タブでは発火しないため、スクロールは直接呼ぶ
    scrollToAsset(assetId);
  };

  /** エラー・警告の一覧（クリックで該当行へジャンプ） */
  const issueList = (results: ValidationResult[], type: 'error' | 'warning') => (
    <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto">
      {results.map((result, i) => {
        const asset = assetById.get(result.assetId);
        return (
          <li key={`${result.assetId}-${result.field}-${i}`}>
            <button
              type="button"
              onClick={() => jumpToAsset(result.assetId)}
              className={`flex w-full items-baseline gap-2 rounded px-1 py-0.5 text-left transition-colors cursor-pointer ${
                type === 'error' ? 'hover:bg-red-100' : 'hover:bg-yellow-100'
              }`}
              title="該当行へ移動"
            >
              <span className="shrink-0 font-mono tabular-nums opacity-70">
                NO {asset?.no || '—'}
              </span>
              <span className="min-w-0 shrink truncate">
                {asset?.name || '（名称未入力）'}
              </span>
              <span className="shrink-0 text-[11px] opacity-70">
                {asset?.categoryLabel}
              </span>
              <span className="min-w-0">{result.message}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-gray-800">
          データ確認・編集
        </h2>
        <button
          type="button"
          onClick={onExportPresets}
          className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm transition-colors hover:bg-gray-50 cursor-pointer"
        >
          <Settings size={16} aria-hidden="true" /> マッピング設定ファイルを出力
        </button>
      </div>
      {missingBasicInfo && (
        <p role="status" className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          案件名・課税時期を入力してください。課税時期を設定すると評価額が再計算され、基本情報とデータの確認後に計算結果へ進めます。
        </p>
      )}

      {/* 合計と保存状態。スクロールしても金額を見失わないよう画面上部に固定する（高さ2.25rem固定） */}
      <div className="sticky top-14 z-30 -mx-4 hidden h-9 items-center gap-x-4 overflow-hidden border-b border-gray-200 bg-white/95 px-4 text-xs backdrop-blur md:flex">
        <span className="shrink-0 text-gray-600">
          全 <strong className="text-sm text-gray-800">{assets.length}</strong> 件
        </span>
        <span className="shrink-0 text-gray-600">
          取得価額合計{' '}
          <strong className="font-mono text-sm text-gray-800">
            ¥{formatYen(totals.acquisition)}
          </strong>
        </span>
        <span className="shrink-0 text-green-700">
          相続税評価額合計{' '}
          <strong className="font-mono text-sm text-green-800">
            {taxDate ? `¥${formatYen(totals.evaluation)}` : '課税時期を入力してください'}
          </strong>
        </span>
        {errors.length > 0 && (
          <span className="flex shrink-0 items-center gap-1 text-red-700">
            <CircleAlert size={13} aria-hidden="true" /> エラー {errors.length}件
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1 text-gray-500">
          {saveError ? (
            <>
              <CloudOff size={13} className="text-red-600" aria-hidden="true" />
              <span className="text-red-600">自動保存できません</span>
            </>
          ) : savedAt ? (
            <>
              <Check size={13} className="text-green-600" aria-hidden="true" />
              自動保存 {formatDateTime(savedAt)}
            </>
          ) : null}
        </span>
      </div>

      {/* 凡例・基本情報 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-600 bg-white rounded-md border border-gray-200 px-4 py-3">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded" />
          3年以内取得
        </span>
        <span className="hidden text-gray-400 sm:inline">|</span>
        <label className="flex items-center gap-1.5">
          案件名 <span className="text-red-500">*</span>
          <input
            type="text"
            required
            value={caseName}
            onChange={(e) => onCaseNameChange(e.target.value)}
            placeholder="株式会社〇〇〇 様"
            className={`min-h-11 w-52 rounded border px-2 py-1 text-sm ${
              caseName.trim() ? 'border-gray-300' : 'border-red-300 bg-red-50'
            }`}
            aria-label="案件名"
          />
        </label>
        <label className="flex items-center gap-1.5">
          課税時期 <span className="text-red-500">*</span>
          <input
            type="date"
            required
            value={taxDate}
            onChange={(e) => onTaxDateChange(e.target.value)}
            className={`min-h-11 rounded border px-2 py-1 text-sm ${
              taxDate ? 'border-gray-300' : 'border-red-300 bg-red-50'
            }`}
            aria-label="課税時期（変更すると全行を再計算）"
            title="変更すると全行の経過年数・評価額を再計算します"
          />
        </label>
        <span className="hidden text-gray-400 md:inline">|</span>
        <span className="hidden items-center gap-1 text-xs text-gray-500 md:flex">
          <GripVertical size={13} className="text-gray-400" />
          行頭のチェックで選択（Shift+クリックで範囲）→「ここに挿入」でまとめて移動。Enterで次の行へ
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
      <CategoryNav groups={navGroups} issueCounts={issueCounts} />

      {/* バリデーション結果（クリックで該当行へ移動） */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
          <strong className="flex items-center gap-1.5">
            <CircleAlert size={15} aria-hidden="true" />
            エラー（{errors.length}件）
            <span className="text-xs font-normal opacity-80">
              クリックすると該当行へ移動します
            </span>
          </strong>
          {issueList(errors, 'error')}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
          <strong className="flex items-center gap-1.5">
            <AlertTriangle size={15} aria-hidden="true" />
            警告（{warnings.length}件）
            <span className="text-xs font-normal opacity-80">
              クリックすると該当行へ移動します
            </span>
          </strong>
          {issueList(warnings, 'warning')}
        </div>
      )}

      {/* テーブル */}
      <AssetTable
        groupedAssets={groupedAssets}
        showDetail={showDetail}
        flashAssetId={flashAssetId}
        onUpdateAsset={onUpdateAsset}
        onDeleteAsset={onDeleteAsset}
        onAddEmptyAsset={onAddEmptyAsset}
        onToggleFixedAssetTaxBulk={onToggleFixedAssetTaxBulk}
        onSortAssets={onSortAssets}
        onMoveAsset={onMoveAsset}
        onMoveAssetsTo={onMoveAssetsTo}
        onMoveCategory={onMoveCategory}
        onMoveCategoryTo={onMoveCategoryTo}
      />

      <StepNavigation
        onBack={onBack}
        onNext={onNext}
        onGoToStep1={onGoToStep1}
        nextDisabled={missingBasicInfo || hasErrors(validationResults)}
      />
    </div>
  );
}
