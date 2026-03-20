import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { Info, AlertCircle } from 'lucide-react';
import { type CustomDocumentItem, type DocChanges } from '../constants/documents';
import type { PageConfig } from '../constants/pageConfig';
import { COMPANY_INFO, getFullAddress, getContactLine } from '../utils/company';
import { exportToExcel } from '../utils/excelExporter';
import { type ExportData } from '../utils/jsonDataManager';
import { formatDate } from '../utils/helpers';
import { useJsonImport } from '../hooks/useJsonImport';
import { useFilterState } from '../hooks/useFilterState';
import { DismissibleBanner } from './ui/DismissibleBanner';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { EditableCategoryTable } from './ui/EditableCategoryTable';
import { ToolbarHeader } from './ui/ToolbarHeader';
import { FilterToolbar } from './ui/FilterToolbar';

export type { FilterCriteria } from '../hooks/useFilterState';

const FORM_INPUT_CLASS = 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500';

interface UnifiedDocumentViewProps {
  pageConfig: PageConfig;
  isDirty: boolean;
  lastSavedAt: string | null;
  clientName: string;
  deceasedName: string;
  deadline: string;
  personInCharge: string;
  personInChargeContact: string;
  expandedCategories: Record<string, boolean>;
  customDocuments: CustomDocumentItem[];
  documentOrder: Record<string, string[]>;
  editedDocuments: Record<string, DocChanges>;
  canDelegateOverrides: Record<string, boolean>;
  specificDocNames: Record<string, string[]>;
  checkedDocuments: Record<string, boolean>;
  checkedDates: Record<string, string>;
  documentMemos: Record<string, string>;
  excludedDocuments: Record<string, boolean>;
  urgentDocuments: Record<string, boolean>;
  disabledCategories: Record<string, boolean>;
  deleteConfirmation: { type: 'document' | 'category'; name: string } | null;
  hasCustomizations: boolean;
  onClientNameChange: (value: string) => void;
  onDeceasedNameChange: (value: string) => void;
  onDeadlineChange: (value: string) => void;
  onPersonInChargeChange: (value: string) => void;
  onPersonInChargeContactChange: (value: string) => void;
  onToggleExpanded: (categoryId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onReorderDocuments: (categoryId: string, newOrder: string[]) => void;
  onToggleCanDelegate: (docId: string, originalCanDelegate: boolean) => void;
  onAddSpecificName: (docId: string, name: string) => void;
  onEditSpecificName: (docId: string, index: number, name: string) => void;
  onRemoveSpecificName: (docId: string, index: number) => void;
  onReorderSpecificNames: (docId: string, newNames: string[]) => void;
  onToggleDocumentCheck: (docId: string) => void;
  onToggleAllInCategory: (categoryId: string, checked: boolean) => void;
  onSetDocumentMemo: (docId: string, memo: string) => void;
  onToggleExcluded: (docId: string) => void;
  onToggleUrgent: (docId: string) => void;
  onToggleCategoryDisabled: (categoryId: string) => void;
  onRemoveDocument: (docId: string, categoryId: string, name: string) => void;
  onRemoveCategory: (categoryId: string, name: string) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onResetToDefault: () => void;
  onExportJson: () => void;
  onImportJson: (data: ExportData) => void;
  onOpenAddModal: (categoryId: string) => void;
  onStartEdit: (docId: string) => void;
  getSelectedDocuments: () => import('../constants/documents').CategoryDocuments[];
}

function UnifiedDocumentViewComponent(props: UnifiedDocumentViewProps) {
  const {
    pageConfig, isDirty, lastSavedAt,
    clientName, deceasedName, deadline, personInCharge, personInChargeContact,
    expandedCategories, customDocuments, documentOrder,
    editedDocuments, canDelegateOverrides, specificDocNames, checkedDocuments,
    checkedDates, documentMemos, excludedDocuments, urgentDocuments, disabledCategories,
    deleteConfirmation, hasCustomizations,
    onClientNameChange, onDeceasedNameChange, onDeadlineChange,
    onPersonInChargeChange, onPersonInChargeContactChange,
    onToggleExpanded, onExpandAll, onCollapseAll,
    onReorderDocuments, onToggleCanDelegate,
    onAddSpecificName, onEditSpecificName, onRemoveSpecificName, onReorderSpecificNames,
    onToggleDocumentCheck, onToggleAllInCategory,
    onSetDocumentMemo, onToggleExcluded, onToggleUrgent, onToggleCategoryDisabled,
    onRemoveDocument, onRemoveCategory,
    onConfirmDelete, onCancelDelete, onResetToDefault,
    onExportJson, onImportJson, onOpenAddModal, onStartEdit,
    getSelectedDocuments,
  } = props;

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { isImporting, importError, importSuccess, handleJsonImport, clearImportError, clearImportSuccess } = useJsonImport(onImportJson, pageConfig.appName);
  const [hideSubmittedInPrint, setHideSubmittedInPrint] = useState(false);
  const currentDate = useMemo(() => formatDate(new Date()), []);
  const filter = useFilterState();

  // フィールド値のマッピング
  const fieldValues = useMemo(() => ({
    clientName, deceasedName, deadline, personInCharge, personInChargeContact,
  }), [clientName, deceasedName, deadline, personInCharge, personInChargeContact]);
  const fieldSetters = useMemo(() => ({
    clientName: onClientNameChange,
    deceasedName: onDeceasedNameChange,
    deadline: onDeadlineChange,
    personInCharge: onPersonInChargeChange,
    personInChargeContact: onPersonInChargeContactChange,
  }), [onClientNameChange, onDeceasedNameChange, onDeadlineChange, onPersonInChargeChange, onPersonInChargeContactChange]);

  // 未保存変更の離脱警告
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleExcelExport = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const results = getSelectedDocuments();
      exportToExcel({
        results, clientName, deceasedName, deadline, specificDocNames, checkedDocuments, urgentDocuments, personInCharge, personInChargeContact,
        excelTitle: pageConfig.excelTitle,
        filenamePrefix: pageConfig.filenamePrefix,
      });
    } catch (error) {
      console.error('Excel export failed:', error);
      setExportError('Excelファイルの出力に失敗しました。もう一度お試しください。');
    } finally {
      setIsExporting(false);
    }
  }, [getSelectedDocuments, clientName, deceasedName, deadline, specificDocNames, checkedDocuments, urgentDocuments, personInCharge, personInChargeContact, pageConfig.excelTitle, pageConfig.filenamePrefix]);

  // B4: キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') { e.preventDefault(); onExportJson(); }
        if (e.key === 'e') { e.preventDefault(); handleExcelExport(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExportJson, handleExcelExport]);

  const toggleHideSubmittedInPrint = useCallback(() => setHideSubmittedInPrint(p => !p), []);

  return (
    <div className="animate-fade-in">
      <div className="bg-white overflow-hidden print-compact">

        {/* A3: ヘッダー + ツールバー */}
        <ToolbarHeader
          title={pageConfig.title}
          subtitle={pageConfig.subtitle}
          navLinks={pageConfig.navLinks}
          isDirty={isDirty}
          lastSavedAt={lastSavedAt}
          hasCustomizations={hasCustomizations}
          isExporting={isExporting}
          isImporting={isImporting}
          onSave={onExportJson}
          onExcelExport={handleExcelExport}
          onReset={() => setShowResetConfirm(true)}
          onJsonImport={handleJsonImport}
        />

        {/* 印刷用ヘッダー */}
        <div className="hidden print:block print-compact-header border-b-2 border-emerald-800 pb-4 mb-4 px-4 md:px-8 pt-4 max-w-7xl mx-auto">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2 print-compact-title">
                {pageConfig.title}
              </h1>
              <p className="text-slate-600 print-compact-subtitle">
                {pageConfig.printSubtitle}
              </p>
            </div>
            <div className="text-right text-sm text-slate-500 print:text-sm">
              <p>発行日: {currentDate}</p>
              <p>{COMPANY_INFO.name}</p>
            </div>
          </div>
          {pageConfig.printInfoFields.some(f => fieldValues[f.key]) && (
            <div className="mt-4 p-4 bg-white border border-emerald-200 rounded-lg grid grid-cols-3 gap-4 print-compact-info">
              {pageConfig.printInfoFields.filter(f => fieldValues[f.key]).map(({ key, label, format }) => (
                <div key={key}>
                  <span className="text-xs text-slate-500 print:text-xs">{label}</span>
                  <p className="font-bold text-slate-800 print:text-sm">{format ? format(fieldValues[key]) : fieldValues[key]}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 初期化確認ダイアログ */}
        {showResetConfirm && (
          <ConfirmDialog
            title="書類設定を初期化"
            onConfirm={() => { onResetToDefault(); setShowResetConfirm(false); }}
            onCancel={() => setShowResetConfirm(false)}
            confirmLabel="初期化する"
          >
            <p className="text-sm text-slate-600 mb-1">
              以下のカスタマイズがすべてリセットされます:
            </p>
            <ul className="text-sm text-slate-500 list-disc list-inside mb-4 space-y-0.5">
              <li>追加した書類</li>
              <li>並び替え</li>
              <li>名称・説明の変更</li>
              <li>代行可否の変更</li>
              <li>具体的な書類名</li>
              <li>メモ・対象外設定</li>
            </ul>
            <p className="text-xs text-slate-400 mb-4">
              ※ お客様名・被相続人名・期限・担当者情報は保持されます。
            </p>
          </ConfirmDialog>
        )}

        {/* 削除確認ダイアログ */}
        {deleteConfirmation && (
          <ConfirmDialog
            title={deleteConfirmation.type === 'document' ? '書類を削除' : 'カテゴリを削除'}
            onConfirm={onConfirmDelete}
            onCancel={onCancelDelete}
          >
            <p className="text-sm text-slate-600 mb-4">
              「{deleteConfirmation.name}」を削除しますか？
            </p>
          </ConfirmDialog>
        )}

        {/* エラー表示 */}
        <DismissibleBanner message={exportError} onDismiss={() => setExportError(null)} variant="error" />
        <DismissibleBanner message={importError} onDismiss={clearImportError} variant="error" />
        <DismissibleBanner message={importSuccess ? 'データを読み込みました。' : null} onDismiss={clearImportSuccess} variant="success" />

        {/* 基本情報入力（スクリーン用） */}
        <div className="bg-emerald-50 border-b border-emerald-100 no-print">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          {pageConfig.inputRows.map(({ cols, fields }, ri) => (
            <div key={ri} className={`grid ${cols} gap-4${ri > 0 ? ' mt-4' : ''}`}>
              {fields.map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm text-slate-600 mb-1">{label}</label>
                  <input
                    type={type ?? 'text'}
                    value={fieldValues[key]}
                    onChange={(e) => fieldSetters[key](e.target.value)}
                    className={FORM_INPUT_CLASS}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          ))}
          </div>
        </div>

        {/* B1/B2/B3: ツールバー（展開/折りたたみ、フィルター、検索） */}
        <FilterToolbar
          filter={filter}
          hideSubmittedInPrint={hideSubmittedInPrint}
          onToggleHideSubmittedInPrint={toggleHideSubmittedInPrint}
          onExpandAll={onExpandAll}
          onCollapseAll={onCollapseAll}
        />

        {/* 注意事項 */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg print-compact-notice print:mx-2 print:mt-2 print:mb-2">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0 print:w-4 print:h-4" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1 print:mb-0 print:text-sm">ご確認ください</p>
              <ul className="list-disc list-inside space-y-1 print:space-y-0">
                {pageConfig.noticeItems.map((item, i) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* カテゴリテーブル群 */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-4 print:space-y-1 print:p-2">
          {pageConfig.categories.filter((category) => (documentOrder[category.id] || []).length > 0).map((category, index) => (
            <EditableCategoryTable
              key={category.id}
              category={category}
              categoryIndex={index + 1}
              isExpanded={expandedCategories[category.id] ?? false}
              isDisabled={disabledCategories[category.id] ?? false}
              customDocuments={customDocuments}
              documentOrder={documentOrder[category.id] || []}
              editedDocuments={editedDocuments}
              canDelegateOverrides={canDelegateOverrides}
              specificDocNames={specificDocNames}
              onToggleExpanded={onToggleExpanded}
              onReorderDocuments={onReorderDocuments}
              onToggleCanDelegate={onToggleCanDelegate}
              onAddSpecificName={onAddSpecificName}
              onEditSpecificName={onEditSpecificName}
              onRemoveSpecificName={onRemoveSpecificName}
              onReorderSpecificNames={onReorderSpecificNames}
              checkedDocuments={checkedDocuments}
              checkedDates={checkedDates}
              documentMemos={documentMemos}
              excludedDocuments={excludedDocuments}
              urgentDocuments={urgentDocuments}
              onToggleDocumentCheck={onToggleDocumentCheck}
              onToggleAllInCategory={onToggleAllInCategory}
              onSetDocumentMemo={onSetDocumentMemo}
              onToggleExcluded={onToggleExcluded}
              onToggleUrgent={onToggleUrgent}
              onToggleCategoryDisabled={onToggleCategoryDisabled}
              onRemoveDocument={onRemoveDocument}
              onRemoveCategory={onRemoveCategory}
              hideSubmittedInPrint={hideSubmittedInPrint}
              filterCriteria={filter.criteria}
              onOpenAddModal={onOpenAddModal}
              onStartEdit={onStartEdit}
            />
          ))}
        </div>

        {/* 留意事項 + フッター */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 mb-6 mt-4 pt-6 border-t border-slate-300 print-compact-footer print:mx-2 print:mb-2 print:mt-2">
          <div className="flex items-start bg-slate-50 p-4 rounded-lg border border-slate-200 print-compact-footer-box">
            <AlertCircle className="w-5 h-5 text-slate-500 mr-2 mt-0.5 flex-shrink-0 print:w-4 print:h-4" />
            <div className="text-sm text-slate-600 space-y-1 print:space-y-0">
              <p><strong>ご留意事項</strong></p>
              <p>・原本が必要な書類と、コピーで対応可能な書類がございます。ご不明な点は担当者にご確認ください。</p>
              <p>・公的機関（市役所等）で取得する証明書は、原則として発行後3ヶ月以内のものをご用意ください。</p>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-slate-400 print-compact-address">
            {getFullAddress()} / {getContactLine()}
          </div>
        </div>
      </div>
    </div>
  );
}

export const UnifiedDocumentView = memo(UnifiedDocumentViewComponent);
