import { useMemo, useState, useCallback } from 'react';
import { Download, FileJson, Settings, FilePlus2, Loader2 } from 'lucide-react';
import { StepNavigation } from '@/components/StepNavigation';
import type { Asset } from '@/types';
import { groupByLabel } from '@/types';
import { ExcelPreview } from '@/components/step3/ExcelPreview';
import { getCalculationTooltip } from '@/utils/calculation';
import { formatYen } from '@/utils/formatters';

interface Props {
  caseName: string;
  taxDate: string;
  assets: Asset[];
  onExportExcel: () => void;
  onExportJson: () => void;
  onExportPresets: () => void;
  onBack: () => void;
  onGoToStep1: () => void;
}

export function ResultStep({
  caseName,
  taxDate,
  assets,
  onExportExcel,
  onExportJson,
  onExportPresets,
  onBack,
  onGoToStep1,
}: Props) {
  const [excelLoading, setExcelLoading] = useState(false);

  const handleExcelExport = useCallback(() => {
    setExcelLoading(true);
    // requestAnimationFrameでUIを更新してから同期処理を実行
    requestAnimationFrame(() => {
      try {
        onExportExcel();
      } finally {
        setExcelLoading(false);
      }
    });
  }, [onExportExcel]);
  const grandTotalAcquisition = assets.reduce(
    (s, a) => s + a.acquisitionCost,
    0
  );
  const grandTotalEvaluation = assets.reduce(
    (s, a) => s + (a.evaluationAmount ?? 0),
    0
  );

  const labelGroups = useMemo(() => groupByLabel(assets), [assets]);
  const basisGroups = useMemo(
    () =>
      groupByLabel(
        assets.filter((a) => a.evaluationAmount !== null)
      ).map(([label, items]) => [label, items.sort((a, b) => a.no - b.no)] as [string, Asset[]]),
    [assets]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-800">
          計算結果
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExcelExport}
            disabled={excelLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {excelLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {excelLoading ? '出力中...' : 'Excel出力'}
          </button>
          <button
            onClick={onExportJson}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <FileJson size={16} /> 案件JSON保存
          </button>
          <button
            onClick={onExportPresets}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <Settings size={16} /> マッピングJSON出力
          </button>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">取得価額合計</div>
          <div className="text-2xl font-bold font-mono text-gray-800">
            ¥{formatYen(grandTotalAcquisition)}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="text-sm text-green-600">相続税評価額合計</div>
          <div className="text-2xl font-bold font-mono text-green-800">
            ¥{formatYen(grandTotalEvaluation)}
          </div>
        </div>
      </div>

      {/* カテゴリ別サマリー */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">
          カテゴリ別内訳
        </h3>
        <div className="space-y-1">
          {labelGroups.map(([label, catAssets]) => {
            const total = catAssets.reduce(
              (s, a) => s + (a.evaluationAmount ?? 0),
              0
            );
            return (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {label}（{catAssets.length}件）
                </span>
                <span className="font-mono">{formatYen(total)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Excelプレビュー */}
      <ExcelPreview
        caseName={caseName}
        taxDate={taxDate}
        assets={assets}
      />

      {/* 計算根拠一覧（カテゴリ別・NO昇順） */}
      <div className="bg-gray-50 rounded-lg border p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">
          計算根拠一覧
        </h3>
        <div className="space-y-4 text-xs max-h-80 overflow-y-auto">
          {basisGroups.map(([label, catAssets]) => {
            return (
              <div key={label}>
                <div className="text-xs font-bold text-green-700 mb-1">
                  {label}
                </div>
                <div className="space-y-1 pl-2">
                  {catAssets.map((asset) => (
                    <div key={asset.id} className="flex gap-2">
                      <span className="text-gray-500 w-8 text-right shrink-0">
                        {asset.no}
                      </span>
                      <span className="text-gray-600 w-24 truncate shrink-0">
                        {asset.name}
                      </span>
                      <span className="text-gray-700 whitespace-pre-line">
                        {getCalculationTooltip(asset)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <StepNavigation
        onBack={onBack}
        onNext={onGoToStep1}
        onGoToStep1={onGoToStep1}
        nextLabel="新規案件を開始"
        nextIcon={<FilePlus2 size={16} />}
      />
    </div>
  );
}
