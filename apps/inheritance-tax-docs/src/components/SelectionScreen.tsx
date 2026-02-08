'use client';

import { memo } from 'react';
import {
  RefreshCw,
  Download,
  Upload,
  X,
} from 'lucide-react';
import { CATEGORIES, type CustomDocumentItem } from '../constants/documents';
import { type ExportData } from '../utils/jsonDataManager';
import { StepIndicator } from './StepIndicator';
import { CategoryItem } from './ui/CategoryItem';
import { useJsonImport } from '../hooks/useJsonImport';

interface Stats {
  totalBuiltIn: number;
  deletedCount: number;
  customCount: number;
  activeCount: number;
}

interface SelectionScreenProps {
  clientName: string;
  deceasedName: string;
  deadline: string;
  expandedCategories: Record<string, boolean>;
  deletedDocuments: Record<string, boolean>;
  customDocuments: CustomDocumentItem[];
  documentOrder: Record<string, string[]>;
  editedDocuments: Record<string, { name?: string; description?: string; howToGet?: string }>;
  canDelegateOverrides: Record<string, boolean>;
  stats: Stats;
  onClientNameChange: (value: string) => void;
  onDeceasedNameChange: (value: string) => void;
  onDeadlineChange: (value: string) => void;
  onToggleExpanded: (categoryId: string) => void;
  onDeleteDocument: (docId: string) => void;
  onRestoreDocument: (docId: string) => void;
  onAddCustomDocument: (categoryId: string, name: string, description: string, howToGet: string) => void;
  onRemoveCustomDocument: (docId: string, categoryId: string) => void;
  onReorderDocuments: (categoryId: string, newOrder: string[]) => void;
  onEditDocument: (docId: string, changes: { name?: string; description?: string; howToGet?: string }) => void;
  onToggleCanDelegate: (docId: string, originalCanDelegate: boolean) => void;
  onRestoreAll: () => void;
  onPreview: () => void;
  onExportJson: () => void;
  onImportJson: (data: ExportData) => void;
}

function SelectionScreenComponent({
  clientName,
  deceasedName,
  deadline,
  expandedCategories,
  deletedDocuments,
  customDocuments,
  documentOrder,
  editedDocuments,
  canDelegateOverrides,
  stats,
  onClientNameChange,
  onDeceasedNameChange,
  onDeadlineChange,
  onToggleExpanded,
  onDeleteDocument,
  onRestoreDocument,
  onAddCustomDocument,
  onRemoveCustomDocument,
  onReorderDocuments,
  onEditDocument,
  onToggleCanDelegate,
  onRestoreAll,
  onPreview,
  onExportJson,
  onImportJson,
}: SelectionScreenProps) {
  const { isImporting, importError, handleJsonImport, clearImportError } = useJsonImport(onImportJson);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade-in">
      {/* ステップインジケーター */}
      <StepIndicator
        currentStep={1}
        onStepChange={(step) => step === 2 && onPreview()}
        canGoToPreview={stats.activeCount > 0}
      />

      <div className="bg-white rounded-xl shadow-lg overflow-hidden mt-4">
        {/* ヘッダー */}
        <div className="bg-blue-800 p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">相続税申告 資料準備ガイド</h1>
              <p className="text-blue-200 text-sm">
                ドラッグで並べ替え、鉛筆で編集、ゴミ箱で削除、＋で追加
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onExportJson}
                className="flex items-center px-4 py-2 rounded-lg text-white shadow font-bold text-sm bg-indigo-600 hover:bg-indigo-700"
                title="設定をJSONファイルとして保存"
              >
                <Download className="w-4 h-4 mr-1" /> 保存
              </button>
              <label
                className={`flex items-center px-4 py-2 rounded-lg text-white shadow font-bold text-sm cursor-pointer ${
                  isImporting
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
                title="JSONファイルから設定を読み込み"
              >
                <Upload className="w-4 h-4 mr-1" /> 読込
                <input
                  type="file"
                  accept=".json"
                  onChange={handleJsonImport}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* インポートエラー表示 */}
        {importError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
            <span>{importError}</span>
            <button onClick={clearImportError} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 基本情報入力 */}
        <div className="p-6 bg-blue-50 border-b border-blue-100">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">お客様名</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => onClientNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例：山田 太郎"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">被相続人名</label>
              <input
                type="text"
                value={deceasedName}
                onChange={(e) => onDeceasedNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例：山田 一郎"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">資料収集期限</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => onDeadlineChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 統計バー */}
        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm text-slate-600 flex items-center gap-4">
            <span>
              有効: <span className="font-bold text-blue-600">{stats.activeCount}</span>件
            </span>
            {stats.deletedCount > 0 && (
              <span className="text-slate-400">
                削除済み: <span className="text-red-500">{stats.deletedCount}</span>件
              </span>
            )}
            {stats.customCount > 0 && (
              <span className="text-slate-400">
                追加: <span className="text-emerald-600">{stats.customCount}</span>件
              </span>
            )}
          </div>
          {stats.deletedCount > 0 && (
            <button
              onClick={onRestoreAll}
              className="flex items-center px-3 py-1 text-sm text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> 全て復元
            </button>
          )}
        </div>

        {/* カテゴリリスト */}
        <div className="p-6 md:p-8 space-y-4">
          {CATEGORIES.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              isExpanded={expandedCategories[category.id] ?? false}
              deletedDocuments={deletedDocuments}
              customDocuments={customDocuments}
              documentOrder={documentOrder[category.id] || []}
              editedDocuments={editedDocuments}
              canDelegateOverrides={canDelegateOverrides}
              onToggleExpanded={onToggleExpanded}
              onDeleteDocument={onDeleteDocument}
              onRestoreDocument={onRestoreDocument}
              onAddCustomDocument={onAddCustomDocument}
              onRemoveCustomDocument={onRemoveCustomDocument}
              onReorderDocuments={onReorderDocuments}
              onEditDocument={onEditDocument}
              onToggleCanDelegate={onToggleCanDelegate}
            />
          ))}
        </div>

        {/* フッター */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-400">
          税理士法人 マスエージェント / 〒770-0002 徳島県徳島市春日２丁目３番３３号
        </div>
      </div>
    </div>
  );
}

export const SelectionScreen = memo(SelectionScreenComponent);
