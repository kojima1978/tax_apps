import { useMemo, useState, useCallback } from 'react';
import { Download, FileJson, Settings, FilePlus2, Loader2, Info, MoreHorizontal, ChevronRight } from 'lucide-react';
import { StepNavigation } from '@/components/StepNavigation';
import { scrollToCategory } from '@/components/CategoryNav';
import type { Asset } from '@/types';
import { groupByLabel } from '@/types';
import { ExcelPreview } from '@/components/step3/ExcelPreview';
import { getCalculationTooltip } from '@/utils/calculation';
import { formatYen } from '@/utils/formatters';

interface Props {
  caseName: string;
  taxDate: string;
  assets: Asset[];
  /** Step3で入れ替えたカテゴリの表示順 */
  labelOrder: string[];
  onExportExcel: () => Promise<void>;
  onExportJson: () => void;
  onExportPresets: () => void;
  onBack: () => void;
  onGoToStep1: () => void;
}

export function ResultStep({
  caseName,
  taxDate,
  assets,
  labelOrder,
  onExportExcel,
  onExportJson,
  onExportPresets,
  onBack,
  onGoToStep1,
}: Props) {
  const [excelLoading, setExcelLoading] = useState(false);

  const handleExcelExport = useCallback(async () => {
    setExcelLoading(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      await onExportExcel();
    } finally {
      setExcelLoading(false);
    }
  }, [onExportExcel]);
  const grandTotalAcquisition = assets.reduce(
    (s, a) => s + a.acquisitionCost,
    0
  );
  const grandTotalEvaluation = assets.reduce(
    (s, a) => s + (a.evaluationAmount ?? 0),
    0
  );

  const labelGroups = useMemo(
    () => groupByLabel(assets, labelOrder),
    [assets, labelOrder]
  );
  const basisGroups = useMemo(
    () =>
      groupByLabel(
        assets.filter((a) => a.evaluationAmount !== null),
        labelOrder
      ).map(([label, items]) => [label, items.sort((a, b) => a.no - b.no)] as [string, Asset[]]),
    [assets, labelOrder]
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
            className="flex min-h-11 items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {excelLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {excelLoading ? '出力中...' : 'Excel出力'}
          </button>
          <details className="relative">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50">
              <MoreHorizontal size={17} aria-hidden="true" /> その他の出力
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
              <button
                onClick={onExportJson}
                className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <FileJson size={16} aria-hidden="true" /> 保存用の案件ファイル
              </button>
              <button
                onClick={onExportPresets}
                className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <Settings size={16} aria-hidden="true" /> マッピング設定ファイル
              </button>
            </div>
          </details>
        </div>
      </div>

      {/* 印刷設定はライブラリ側で出力できないため、手順を案内する */}
      <details className="rounded-md border border-blue-200 bg-blue-50 text-xs text-blue-900">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium">
          <Info size={15} className="shrink-0" aria-hidden="true" /> Excelを印刷するときの設定
        </summary>
        <p className="border-t border-blue-200 px-3 py-3 leading-relaxed">
          Excelで開いた後に［ページレイアウト］→［印刷の向き: 横］、［拡大縮小: すべての列を1ページに印刷］を指定してください。
        </p>
      </details>

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

      {/* カテゴリ別サマリー（クリックで下の表へジャンプ） */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-1">
          カテゴリ別内訳
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          行をクリックすると下の表の該当カテゴリへ移動します。
        </p>
        <div className="space-y-1">
          {labelGroups.map(([label, catAssets]) => {
            const total = catAssets.reduce(
              (s, a) => s + (a.evaluationAmount ?? 0),
              0
            );
            const within3 = catAssets.filter((a) => a.isWithin3Years).length;
            return (
              <button
                key={label}
                onClick={() => scrollToCategory(label)}
                className="w-full flex min-h-11 justify-between items-center gap-3 text-sm px-2 py-2 -mx-2 rounded hover:bg-green-50 cursor-pointer transition-colors"
                title={`${label} へ移動`}
              >
                <span className="min-w-0 text-gray-600 flex items-center gap-2 text-left">
                  <ChevronRight size={15} className="shrink-0 text-green-600" aria-hidden="true" />
                  <span className="break-words">{label}（{catAssets.length}件）</span>
                  {within3 > 0 && (
                    <span className="px-1 rounded bg-yellow-100 border border-yellow-300 text-yellow-800 text-[10px]">
                      3年以内 {within3}件
                    </span>
                  )}
                </span>
                <span className="font-mono shrink-0">{formatYen(total)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Excelプレビュー */}
      <ExcelPreview
        caseName={caseName}
        taxDate={taxDate}
        assets={assets}
        labelOrder={labelOrder}
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
