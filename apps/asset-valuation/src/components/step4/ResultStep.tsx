import { Download, FileJson, Settings } from 'lucide-react';
import type { Asset } from '@/types';
import { ExcelPreview } from '@/components/step3/ExcelPreview';
import { getCalculationTooltip } from '@/utils/calculation';
import { CATEGORY_ORDER } from '@/types';
import { formatYen } from '@/utils/formatters';

interface Props {
  caseName: string;
  taxDate: string;
  assets: Asset[];
  onExportExcel: () => void;
  onExportJson: () => void;
  onExportPresets: () => void;
  onBack: () => void;
}

export function ResultStep({
  caseName,
  taxDate,
  assets,
  onExportExcel,
  onExportJson,
  onExportPresets,
  onBack,
}: Props) {
  const grandTotalAcquisition = assets.reduce(
    (s, a) => s + a.acquisitionCost,
    0
  );
  const grandTotalEvaluation = assets.reduce(
    (s, a) => s + (a.evaluationAmount ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">
          Step 4: 計算結果
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Download size={16} /> Excel出力
          </button>
          <button
            onClick={onExportJson}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <FileJson size={16} /> 案件JSON保存
          </button>
          <button
            onClick={onExportPresets}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Settings size={16} /> マッピングJSON出力
          </button>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-4">
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
          {CATEGORY_ORDER.map((cat) => {
            const catAssets = assets.filter((a) => a.category === cat);
            if (catAssets.length === 0) return null;
            const total = catAssets.reduce(
              (s, a) => s + (a.evaluationAmount ?? 0),
              0
            );
            return (
              <div key={cat} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {cat}（{catAssets.length}件）
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

      {/* 計算根拠一覧 */}
      <div className="bg-gray-50 rounded-lg border p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">
          計算根拠一覧
        </h3>
        <div className="space-y-1 text-xs max-h-60 overflow-y-auto">
          {assets
            .filter((a) => a.evaluationAmount !== null)
            .map((asset) => (
              <div key={asset.id} className="flex gap-2">
                <span className="text-gray-400 w-8 text-right shrink-0">
                  {asset.no}
                </span>
                <span className="text-gray-500 w-24 truncate shrink-0">
                  {asset.name}
                </span>
                <span className="text-gray-700 whitespace-pre-line">
                  {getCalculationTooltip(asset)}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* ナビゲーション */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          ← 戻る
        </button>
      </div>
    </div>
  );
}
