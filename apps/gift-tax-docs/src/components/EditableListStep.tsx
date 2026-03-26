import {
  DndContext,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useId, useState, useMemo, useCallback } from 'react';
import { Plus, Info, Search } from 'lucide-react';
import { InlineAddInput } from '@/components/ui/EditableInput';
import { useGiftTaxGuide } from '@/hooks/useGiftTaxGuide';
import { useEditableListEditing } from '@/hooks/useEditableListEditing';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useToast } from '@/hooks/useToast';
import { useDarkMode } from '@/hooks/useDarkMode';
import { SortableDocumentItem, DragOverlayItem } from '@/components/ui/SortableDocumentItem';
import { SortableCategoryCard, CategoryDragOverlay } from '@/components/ui/SortableCategoryCard';
import { EditToolbar } from '@/components/ui/EditToolbar';
import { AddCategoryForm } from '@/components/ui/AddCategoryForm';
import { PrintSection } from '@/components/ui/PrintSection';
import { ToastContainer } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { InfoBar } from '@/components/ui/InfoBar';
import { Dialogs } from '@/components/ui/Dialogs';
import { TOAST_MESSAGES } from '@/constants/messages';

export const EditableListStep = () => {
  const {
    isTwoColumnPrint,
    results,
    currentDate,
    handlePrint,
    handleExcelExport,
    togglePrintColumn,
    toggleHideSubmitted,
    hideSubmittedInPrint,
    staffName,
    setStaffName,
    staffPhone,
    setStaffPhone,
    customerName,
    setCustomerName,
    deadline,
    setDeadline,
    documentList,
    setDocumentList,
  } = useGiftTaxGuide();

  const { toasts, addToast, removeToast } = useToast();

  const editing = useEditableListEditing({
    documentList,
    setDocumentList,
    staffName,
    setStaffName,
    staffPhone,
    setStaffPhone,
    customerName,
    setCustomerName,
    deadline,
    setDeadline,
  });

  const dnd = useDragAndDrop(documentList, setDocumentList);
  const dndId = useId();
  const { isDark, toggleDark } = useDarkMode();

  // ─── 検索 ───
  const [searchQuery, setSearchQuery] = useState('');

  // ドラッグオーバーレイ用の番号を算出
  const dragOverlayCatNumber = useMemo(() => {
    if (!dnd.activeCategory) return undefined;
    const idx = documentList.findIndex(c => c.id === dnd.activeCategory?.id);
    return idx !== -1 ? idx + 1 : undefined;
  }, [dnd.activeCategory, documentList]);

  const dragOverlayDocNumber = useMemo(() => {
    if (!dnd.activeDocument) return undefined;
    for (const cat of documentList) {
      const idx = cat.documents.findIndex(d => d.id === dnd.activeDocument?.id);
      if (idx !== -1) return `${idx + 1}`;
    }
    return undefined;
  }, [dnd.activeDocument, documentList]);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return documentList;
    const q = searchQuery.trim().toLowerCase();
    return documentList
      .map(cat => ({
        ...cat,
        documents: cat.documents.filter(
          doc => doc.text.toLowerCase().includes(q) ||
                 doc.subItems.some(s => s.text.toLowerCase().includes(q))
        ),
      }))
      .filter(cat => cat.documents.length > 0 || cat.name.toLowerCase().includes(q));
  }, [documentList, searchQuery]);

  // ─── ローディング ───
  const [isExporting, setIsExporting] = useState(false);

  const handleExcelExportWithLoading = useCallback(async () => {
    setIsExporting(true);
    try {
      await Promise.resolve(handleExcelExport());
      addToast(TOAST_MESSAGES.excelExportSuccess, 'success');
    } catch {
      addToast(TOAST_MESSAGES.excelExportError, 'error');
    } finally {
      setIsExporting(false);
    }
  }, [handleExcelExport, addToast]);

  const handleJsonExportWithToast = useCallback(() => {
    editing.handleJsonExport();
    addToast(TOAST_MESSAGES.jsonExportSuccess, 'success');
  }, [editing.handleJsonExport, addToast]);

  const handleResetWithToast = useCallback(() => {
    editing.handleResetToDefault();
    addToast(TOAST_MESSAGES.resetSuccess, 'info');
  }, [editing.handleResetToDefault, addToast]);

  const handleImportWithToast = useCallback(() => {
    editing.confirmImport();
    addToast(TOAST_MESSAGES.importSuccess, 'success');
  }, [editing.confirmImport, addToast]);

  const infoBarValues = { customerName, staffName, staffPhone, deadline } as const;
  const infoBarSetters = { customerName: setCustomerName, staffName: setStaffName, staffPhone: setStaffPhone, deadline: setDeadline } as const;

  const isSearching = searchQuery.trim() !== '';
  const displayList = isSearching ? filteredList : documentList;

  return (
    <div className="w-full animate-fade-in">
      {/* ヘッダーツールバー */}
      <EditToolbar
        onExpandAll={editing.handleExpandAll}
        onShowResetDialog={() => editing.setShowResetDialog(true)}
        onJsonExport={handleJsonExportWithToast}
        onFileSelect={editing.handleFileSelect}
        onPrint={handlePrint}
        onExcelExport={handleExcelExportWithLoading}
        isTwoColumnPrint={isTwoColumnPrint}
        togglePrintColumn={togglePrintColumn}
        hideSubmittedInPrint={hideSubmittedInPrint}
        toggleHideSubmitted={toggleHideSubmitted}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isDark={isDark}
        toggleDark={toggleDark}
        isExporting={isExporting}
      />

      <div className="p-4 md:px-8 md:py-6">
      {/* 入力バー */}
      <InfoBar values={infoBarValues} setters={infoBarSetters} />

      {/* カテゴリリスト（画面表示のみ、印刷非表示） */}
      <div className="no-print">
        {/* 検索結果カウント */}
        {isSearching && (
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Search className="w-4 h-4" aria-hidden="true" />
            <span>「{searchQuery}」の検索結果: {filteredList.reduce((acc, c) => acc + c.documents.length, 0)} 件</span>
          </div>
        )}

        {/* 空状態 */}
        {displayList.length === 0 ? (
          <EmptyState isSearching={isSearching} onClearSearch={() => setSearchQuery('')} />
        ) : (
          <DndContext
            id={dndId}
            sensors={dnd.sensors}
            collisionDetection={closestCenter}
            onDragStart={dnd.handleDragStart}
            onDragEnd={dnd.handleDragEnd}
          >
            <SortableContext
              items={documentList.map((c) => `category-${c.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {displayList.map((category, catIdx) => (
                    <SortableCategoryCard
                      key={category.id}
                      category={category}
                      categoryNumber={catIdx + 1}
                      editState={editing.categoryEditState}
                      handlers={editing.categoryHandlers}
                    >
                      <div className="p-4">
                        {/* 注記 */}
                        {category.note && (
                          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start text-sm text-amber-800 dark:text-amber-300" role="note">
                            <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                            {category.note}
                          </div>
                        )}

                        {/* 書類リスト */}
                        <SortableContext
                          items={category.documents.map((d) => d.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <ul className="space-y-2">
                            {category.documents.map((doc, docIdx) => (
                              <SortableDocumentItem
                                key={doc.id}
                                doc={doc}
                                categoryId={category.id}
                                docNumber={`${docIdx + 1}`}
                                isEditing={editing.editingDoc?.categoryId === category.id && editing.editingDoc?.docId === doc.id}
                                editText={editing.editText}
                                setEditText={editing.setEditText}
                                onConfirmEdit={editing.confirmEdit}
                                onCancelEdit={editing.cancelEdit}
                                docHandlers={editing.docHandlers}
                                subItemEditState={editing.subItemEditState}
                                subItemHandlers={editing.subItemHandlers}
                              />
                            ))}
                          </ul>
                        </SortableContext>

                        {/* 書類追加 */}
                        {!isSearching && (
                          editing.addingToCategory === category.id ? (
                            <div className="mt-3 flex items-center gap-2">
                              <InlineAddInput
                                value={editing.newDocText}
                                onChange={editing.setNewDocText}
                                onConfirm={() => editing.handleAddDocument(category.id)}
                                onCancel={editing.cancelAddDocument}
                                placeholder="書類名を入力..."
                                ariaLabel="新しい書類名を入力"
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => editing.setAddingToCategory(category.id)}
                              className="mt-3 flex items-center px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg border border-dashed border-emerald-300 dark:border-emerald-700 transition-all w-full justify-center hover:border-emerald-400 dark:hover:border-emerald-600"
                              aria-label={`${category.name}に書類を追加`}
                            >
                              <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
                              書類を追加
                            </button>
                          )
                        )}
                      </div>
                    </SortableCategoryCard>
                ))}

                {/* カテゴリ追加（検索中は非表示） */}
                {!isSearching && (
                  <AddCategoryForm
                    isAdding={editing.isAddingCategory}
                    setIsAdding={editing.setIsAddingCategory}
                    name={editing.newCategoryName}
                    setName={editing.setNewCategoryName}
                    isSpecial={editing.newCategoryIsSpecial}
                    setIsSpecial={editing.setNewCategoryIsSpecial}
                    onAdd={editing.handleAddCategory}
                    onCancel={editing.cancelAddCategory}
                  />
                )}
              </div>
            </SortableContext>

            {/* ドラッグオーバーレイ */}
            <DragOverlay>
              {dnd.isDraggingCategory && dnd.activeId && dnd.activeCategory ? (
                <CategoryDragOverlay category={dnd.activeCategory} categoryNumber={dragOverlayCatNumber} />
              ) : dnd.activeId && dnd.activeDocument ? (
                <DragOverlayItem doc={dnd.activeDocument} docNumber={dragOverlayDocNumber} />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* フッター */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            ※チェックを入れると提出済み（取り消し線）になります
          </p>
        </div>
      </div>
      </div>

      {/* 印刷専用セクション */}
      <PrintSection
        results={results}
        isTwoColumnPrint={isTwoColumnPrint}
        currentDate={currentDate}
        staffName={staffName}
        staffPhone={staffPhone}
        customerName={customerName}
        deadline={deadline}
      />

      {/* ダイアログ群 */}
      <Dialogs
        showResetDialog={editing.showResetDialog}
        onResetConfirm={handleResetWithToast}
        onResetCancel={() => editing.setShowResetDialog(false)}
        showImportDialog={editing.showImportDialog}
        importPreview={editing.importPreview}
        onImportConfirm={handleImportWithToast}
        onImportCancel={editing.cancelImport}
        hasDeleteTarget={!!editing.deleteTarget}
        deleteDialogMessage={editing.deleteDialogMessage}
        deleteDialogSubMessage={editing.deleteDialogSubMessage}
        onDeleteConfirm={editing.confirmDelete}
        onDeleteCancel={editing.cancelDelete}
        importError={!!editing.importError}
        onDismissImportError={editing.dismissImportError}
      />

      {/* トースト通知 */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};
