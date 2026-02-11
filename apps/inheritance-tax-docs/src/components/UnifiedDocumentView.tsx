'use client';

import { memo, useState } from 'react';
import {
  FileSpreadsheet,
  FileDown,
  Download,
  Upload,
  RefreshCw,
  Info,
  AlertCircle,
  Home,
} from 'lucide-react';
import { CATEGORIES, type CategoryData, type DocumentItem, type CustomDocumentItem, type DocChanges } from '../constants/documents';
import { exportToExcel } from '../utils/excelExporter';
import { type ExportData } from '../utils/jsonDataManager';
import { formatDate, formatDeadline } from '../utils/helpers';
import { useJsonImport } from '../hooks/useJsonImport';
import { DismissibleBanner } from './ui/DismissibleBanner';
import { EditableCategoryTable } from './ui/EditableCategoryTable';

interface Stats {
  totalBuiltIn: number;
  deletedCount: number;
  customCount: number;
  activeCount: number;
}

interface UnifiedDocumentViewProps {
  clientName: string;
  deceasedName: string;
  deadline: string;
  personInCharge: string;
  personInChargeContact: string;
  expandedCategories: Record<string, boolean>;
  deletedDocuments: Record<string, boolean>;
  customDocuments: CustomDocumentItem[];
  documentOrder: Record<string, string[]>;
  editedDocuments: Record<string, DocChanges>;
  canDelegateOverrides: Record<string, boolean>;
  specificDocNames: Record<string, string[]>;
  stats: Stats;
  onClientNameChange: (value: string) => void;
  onDeceasedNameChange: (value: string) => void;
  onDeadlineChange: (value: string) => void;
  onPersonInChargeChange: (value: string) => void;
  onPersonInChargeContactChange: (value: string) => void;
  onToggleExpanded: (categoryId: string) => void;
  onDeleteDocument: (docId: string) => void;
  onRestoreDocument: (docId: string) => void;
  onDeleteAllInCategory: (categoryId: string) => void;
  onRestoreAllInCategory: (categoryId: string) => void;
  onRemoveCustomDocument: (docId: string, categoryId: string) => void;
  onReorderDocuments: (categoryId: string, newOrder: string[]) => void;
  onToggleCanDelegate: (docId: string, originalCanDelegate: boolean) => void;
  onAddSpecificName: (docId: string, name: string) => void;
  onEditSpecificName: (docId: string, index: number, name: string) => void;
  onRemoveSpecificName: (docId: string, index: number) => void;
  onRestoreAll: () => void;
  onExportJson: () => void;
  onImportJson: (data: ExportData) => void;
  onOpenAddModal: (categoryId: string) => void;
  onStartEdit: (docId: string) => void;
  getSelectedDocuments: () => { category: CategoryData; documents: (DocumentItem | CustomDocumentItem)[] }[];
}

function UnifiedDocumentViewComponent({
  clientName,
  deceasedName,
  deadline,
  personInCharge,
  personInChargeContact,
  expandedCategories,
  deletedDocuments,
  customDocuments,
  documentOrder,
  editedDocuments,
  canDelegateOverrides,
  specificDocNames,
  stats,
  onClientNameChange,
  onDeceasedNameChange,
  onDeadlineChange,
  onPersonInChargeChange,
  onPersonInChargeContactChange,
  onToggleExpanded,
  onDeleteDocument,
  onRestoreDocument,
  onDeleteAllInCategory,
  onRestoreAllInCategory,
  onRemoveCustomDocument,
  onReorderDocuments,
  onToggleCanDelegate,
  onAddSpecificName,
  onEditSpecificName,
  onRemoveSpecificName,
  onRestoreAll,
  onExportJson,
  onImportJson,
  onOpenAddModal,
  onStartEdit,
  getSelectedDocuments,
}: UnifiedDocumentViewProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const { isImporting, importError, importSuccess, handleJsonImport, clearImportError, clearImportSuccess } = useJsonImport(onImportJson);
  const currentDate = formatDate(new Date());

  const handlePrint = () => { window.print(); };

  const handleExcelExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const results = getSelectedDocuments();
      exportToExcel({ results, clientName, deceasedName, deadline, specificDocNames, personInCharge, personInChargeContact });
    } catch (error) {
      console.error('Excel export failed:', error);
      setExportError('Excelファイルの出力に失敗しました。もう一度お試しください。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden print-compact">

        {/* ヘッダー + ツールバー（スクリーン用） */}
        <header className="bg-blue-800 p-6 text-white no-print">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <a href="/" title="ポータルに戻る" className="opacity-70 hover:opacity-100 transition-opacity">
                <Home className="w-6 h-6" />
              </a>
              <div>
                <h1 className="text-2xl font-bold mb-1">相続税申告 資料準備ガイド</h1>
                <p className="text-blue-200 text-sm">
                  テーブル上で直接 編集・削除・並べ替え・代行切替ができます
                </p>
              </div>
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
                  isImporting ? 'bg-slate-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
                }`}
                title="JSONファイルから設定を読み込み"
              >
                <Upload className="w-4 h-4 mr-1" /> 読込
                <input type="file" accept=".json" onChange={handleJsonImport} disabled={isImporting} className="hidden" />
              </label>
              <button
                onClick={handleExcelExport}
                disabled={isExporting}
                className={`flex items-center px-4 py-2 rounded-lg text-white shadow font-bold text-sm bg-emerald-600 hover:bg-emerald-700 ${
                  isExporting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" /> {isExporting ? '出力中...' : 'Excel'}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center px-4 py-2 rounded-lg text-white shadow font-bold text-sm bg-blue-600 hover:bg-blue-700"
              >
                <FileDown className="w-4 h-4 mr-1" /> 印刷
              </button>
            </div>
          </div>
        </header>

        {/* 印刷用ヘッダー */}
        <div className="hidden print:block print-compact-header border-b-2 border-blue-800 pb-4 mb-4 px-6 pt-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2 print-compact-title">
                相続税申告 資料準備ガイド
              </h1>
              <p className="text-slate-600 print-compact-subtitle">
                以下の書類をご準備の上、ご来所・ご郵送ください。
              </p>
            </div>
            <div className="text-right text-sm text-slate-500 print:text-xs">
              <p>発行日: {currentDate}</p>
              <p>税理士法人 マスエージェント</p>
            </div>
          </div>
          {(clientName || deceasedName || deadline || personInCharge || personInChargeContact) && (
            <div className="mt-4 p-4 bg-white border border-blue-200 rounded-lg grid grid-cols-3 gap-4 print-compact-info">
              {clientName && (
                <div>
                  <span className="text-xs text-slate-500 print:text-[9px]">お客様名</span>
                  <p className="font-bold text-slate-800 print:text-xs">{clientName} 様</p>
                </div>
              )}
              {deceasedName && (
                <div>
                  <span className="text-xs text-slate-500 print:text-[9px]">被相続人</span>
                  <p className="font-bold text-slate-800 print:text-xs">{deceasedName} 様</p>
                </div>
              )}
              {deadline && (
                <div>
                  <span className="text-xs text-slate-500 print:text-[9px]">資料収集期限（目安）</span>
                  <p className="font-bold text-slate-800 print:text-xs">{formatDeadline(deadline)}</p>
                </div>
              )}
              {personInCharge && (
                <div>
                  <span className="text-xs text-slate-500 print:text-[9px]">担当者</span>
                  <p className="font-bold text-slate-800 print:text-xs">{personInCharge}</p>
                </div>
              )}
              {personInChargeContact && (
                <div>
                  <span className="text-xs text-slate-500 print:text-[9px]">担当者連絡先</span>
                  <p className="font-bold text-slate-800 print:text-xs">{personInChargeContact}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* エラー表示 */}
        <DismissibleBanner message={exportError} onDismiss={() => setExportError(null)} variant="error" />
        <DismissibleBanner message={importError} onDismiss={clearImportError} variant="error" />
        <DismissibleBanner message={importSuccess ? 'データを読み込みました。' : null} onDismiss={clearImportSuccess} variant="success" />

        {/* 基本情報入力（スクリーン用） */}
        <div className="p-6 bg-blue-50 border-b border-blue-100 no-print">
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
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">担当者</label>
              <input
                type="text"
                value={personInCharge}
                onChange={(e) => onPersonInChargeChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例：佐藤 花子"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">担当者連絡先</label>
              <input
                type="text"
                value={personInChargeContact}
                onChange={(e) => onPersonInChargeContactChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例：088-632-6228"
              />
            </div>
          </div>
        </div>

        {/* 統計バー（スクリーン用） */}
        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 no-print">
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

        {/* 注意事項 */}
        <div className="mx-6 mt-6 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg print-compact-notice print:mx-2 print:mt-2 print:mb-2">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0 print:w-4 print:h-4" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1 print:mb-0 print:text-xs">ご確認ください</p>
              <ul className="list-disc list-inside space-y-1 print:space-y-0">
                <li>
                  資料は原本、コピー、データなどどのような形でお送りいただいても結構です。原本はスキャンやコピーを行った後、すべてお返しいたします。
                </li>
                <li>
                  代行欄に<span className="bg-amber-200 px-1 rounded print:px-0.5">可</span>と記載されている書類は弊社で取得代行を行うことが可能です。詳しくは担当者にお尋ねください。
                </li>
                <li>
                  身分関係書類は原則として相続開始日から10日を経過した日以後に取得したものが必要となります。
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* カテゴリテーブル群 */}
        <div className="p-6 space-y-4 print:space-y-1 print:p-2">
          {CATEGORIES.map((category) => (
            <EditableCategoryTable
              key={category.id}
              category={category}
              isExpanded={expandedCategories[category.id] ?? false}
              deletedDocuments={deletedDocuments}
              customDocuments={customDocuments}
              documentOrder={documentOrder[category.id] || []}
              editedDocuments={editedDocuments}
              canDelegateOverrides={canDelegateOverrides}
              specificDocNames={specificDocNames}
              onToggleExpanded={onToggleExpanded}
              onDeleteDocument={onDeleteDocument}
              onRestoreDocument={onRestoreDocument}
              onDeleteAllInCategory={onDeleteAllInCategory}
              onRestoreAllInCategory={onRestoreAllInCategory}
              onRemoveCustomDocument={onRemoveCustomDocument}
              onReorderDocuments={onReorderDocuments}
              onToggleCanDelegate={onToggleCanDelegate}
              onAddSpecificName={onAddSpecificName}
              onEditSpecificName={onEditSpecificName}
              onRemoveSpecificName={onRemoveSpecificName}
              onOpenAddModal={onOpenAddModal}
              onStartEdit={onStartEdit}
            />
          ))}
        </div>

        {/* 留意事項 + フッター */}
        <div className="mx-6 mb-6 mt-4 pt-6 border-t border-slate-300 print-compact-footer print:mx-2 print:mb-2 print:mt-2">
          <div className="flex items-start bg-slate-50 p-4 rounded-lg border border-slate-200 print-compact-footer-box">
            <AlertCircle className="w-5 h-5 text-slate-500 mr-2 mt-0.5 flex-shrink-0 print:w-4 print:h-4" />
            <div className="text-sm text-slate-600 space-y-1 print:space-y-0">
              <p><strong>ご留意事項</strong></p>
              <p>・原本が必要な書類と、コピーで対応可能な書類がございます。ご不明な点は担当者にご確認ください。</p>
              <p>・公的機関（市役所等）で取得する証明書は、原則として発行後3ヶ月以内のものをご用意ください。</p>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-slate-400 print-compact-address">
            〒770-0002 徳島県徳島市春日２丁目３番３３号 / TEL 088-632-6228 / FAX 088-631-9870
          </div>
        </div>
      </div>
    </div>
  );
}

export const UnifiedDocumentView = memo(UnifiedDocumentViewComponent);
