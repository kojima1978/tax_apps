import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { Info, AlertCircle, ChevronDown, CheckCircle2 } from 'lucide-react';
import type { PageConfig } from '../constants/pageConfig';
import { COMPANY_INFO, getFullAddress, getContactLine } from '../utils/company';
import { exportToExcel } from '../utils/excelExporter';
import { formatDate } from '../utils/helpers';
import { useJsonImport } from '../hooks/useJsonImport';
import { useFilterState } from '../hooks/useFilterState';
import type { DocumentGuideReturn } from '../hooks/useDocumentGuide';
import { DismissibleBanner } from './ui/DismissibleBanner';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { EditableCategoryTable } from './ui/EditableCategoryTable';
import { ToolbarHeader } from './ui/ToolbarHeader';
import { FilterToolbar } from './ui/FilterToolbar';
import { DocumentFormModal } from './ui/DocumentFormModal';

export type { FilterCriteria } from '../hooks/useFilterState';

const FORM_INPUT_CLASS = 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500';

interface UnifiedDocumentViewProps {
  pageConfig: PageConfig;
  guide: DocumentGuideReturn;
}

function UnifiedDocumentViewComponent({ pageConfig, guide }: UnifiedDocumentViewProps) {
  const {
    isDirty, lastSavedAt,
    clientName, deceasedName, deadline, personInCharge, personInChargeContact,
    expandedCategories, customDocuments, documentOrder,
    editedDocuments, canDelegateOverrides, specificDocNames, checkedDocuments,
    checkedDates, documentMemos, excludedDocuments, urgentDocuments, disabledCategories,
    deleteConfirmation, hasCustomizations,
    setClientName, setDeceasedName, setDeadline, setPersonInCharge, setPersonInChargeContact,
    toggleExpanded, expandAll, collapseAll,
    reorderDocuments, toggleCanDelegate,
    addSpecificName, editSpecificName, removeSpecificName, reorderSpecificNames,
    toggleDocumentCheck, toggleAllInCategory,
    setDocumentMemo, toggleExcluded, toggleUrgent, toggleCategoryDisabled,
    requestDelete, requestDeleteCategory, confirmDelete, cancelDelete,
    resetToDefault,
    exportToJson, importFromJson, getSelectedDocuments,
    // モーダル
    editingDocId, editingDocData, isModalOpen, modalVariant,
    openEditModal, openAddModal, closeModal,
    handleEditSubmit, handleAddSubmit,
  } = guide;

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { isImporting, importError, importSuccess, handleJsonImport, clearImportError, clearImportSuccess } = useJsonImport(importFromJson, pageConfig.appName);
  const [hideSubmittedInPrint, setHideSubmittedInPrint] = useState(false);
  const [noticeCollapsed, setNoticeCollapsed] = useState(false);
  const currentDate = useMemo(() => formatDate(new Date()), []);
  const filter = useFilterState();

  // フィールド値のマッピング
  const fieldValues = useMemo(() => ({
    clientName, deceasedName, deadline, personInCharge, personInChargeContact,
  }), [clientName, deceasedName, deadline, personInCharge, personInChargeContact]);
  const fieldSetters = useMemo(() => ({
    clientName: setClientName,
    deceasedName: setDeceasedName,
    deadline: setDeadline,
    personInCharge: setPersonInCharge,
    personInChargeContact: setPersonInChargeContact,
  }), [setClientName, setDeceasedName, setDeadline, setPersonInCharge, setPersonInChargeContact]);

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
        if (e.key === 's') { e.preventDefault(); exportToJson(); }
        if (e.key === 'e') { e.preventDefault(); handleExcelExport(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exportToJson, handleExcelExport]);

  const toggleHideSubmittedInPrint = useCallback(() => setHideSubmittedInPrint(p => !p), []);
  const toggleNoticeCollapsed = useCallback(() => setNoticeCollapsed(p => !p), []);

  const allDocsCompleted = useMemo(() => {
    const activeCategories = pageConfig.categories.filter(
      cat => !disabledCategories[cat.id] && (documentOrder[cat.id] || []).length > 0
    );
    if (activeCategories.length === 0) return false;
    return activeCategories.every(cat => {
      const docIds = documentOrder[cat.id] || [];
      return docIds.every(id => checkedDocuments[id] || excludedDocuments[id]);
    });
  }, [pageConfig.categories, disabledCategories, documentOrder, checkedDocuments, excludedDocuments]);

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
          onSave={exportToJson}
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
            onConfirm={() => { resetToDefault(); setShowResetConfirm(false); }}
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
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
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
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
        />

        {/* 注意事項（折りたたみ可能） */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 mb-4 print-compact-notice print:mx-2 print:mt-2 print:mb-2">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <button
              onClick={toggleNoticeCollapsed}
              className="w-full flex items-center justify-between cursor-pointer print:cursor-default"
            >
              <div className="flex items-center">
                <Info className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0 print:w-4 print:h-4" />
                <p className="font-bold text-sm text-amber-800 print:text-sm">ご確認ください</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-amber-600 transition-transform print:hidden ${noticeCollapsed ? '' : 'rotate-180'}`} />
            </button>
            <div className={`${noticeCollapsed ? 'hidden print:block' : ''} mt-2 ml-7 text-sm text-amber-800`}>
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
              onToggleExpanded={toggleExpanded}
              onReorderDocuments={reorderDocuments}
              onToggleCanDelegate={toggleCanDelegate}
              onAddSpecificName={addSpecificName}
              onEditSpecificName={editSpecificName}
              onRemoveSpecificName={removeSpecificName}
              onReorderSpecificNames={reorderSpecificNames}
              checkedDocuments={checkedDocuments}
              checkedDates={checkedDates}
              documentMemos={documentMemos}
              excludedDocuments={excludedDocuments}
              urgentDocuments={urgentDocuments}
              onToggleDocumentCheck={toggleDocumentCheck}
              onToggleAllInCategory={toggleAllInCategory}
              onSetDocumentMemo={setDocumentMemo}
              onToggleExcluded={toggleExcluded}
              onToggleUrgent={toggleUrgent}
              onToggleCategoryDisabled={toggleCategoryDisabled}
              onRemoveDocument={requestDelete}
              onRemoveCategory={requestDeleteCategory}
              hideSubmittedInPrint={hideSubmittedInPrint}
              filterCriteria={filter.criteria}
              hasActiveFilter={filter.hasActiveFilters}
              onOpenAddModal={openAddModal}
              onStartEdit={openEditModal}
            />
          ))}
        </div>

        {/* 全完了メッセージ */}
        {allDocsCompleted && (
          <div className="max-w-7xl mx-auto px-4 md:px-8 no-print">
            <div className="flex flex-col items-center justify-center py-8 px-6 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
              <p className="text-lg font-bold text-emerald-700">すべての書類が提出済み・対象外です</p>
              <p className="text-sm text-emerald-600 mt-1">資料の収集が完了しました。お疲れさまでした。</p>
            </div>
          </div>
        )}

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
          <div className="mt-8 mb-2 py-4 px-6 bg-slate-50 rounded-lg border border-slate-200 text-center print-compact-address">
            <p className="text-sm font-medium text-slate-600">{COMPANY_INFO.name}</p>
            <p className="text-xs text-slate-400 mt-1">{getFullAddress()}</p>
            <p className="text-xs text-slate-400 mt-0.5">{getContactLine()}</p>
          </div>
        </div>
      </div>

      {/* 書類編集/追加モーダル */}
      <DocumentFormModal
        isOpen={isModalOpen}
        variant={modalVariant}
        initialValues={editingDocId ? editingDocData : undefined}
        onSubmit={editingDocId ? handleEditSubmit : handleAddSubmit}
        onClose={closeModal}
      />
    </div>
  );
}

export const UnifiedDocumentView = memo(UnifiedDocumentViewComponent);
