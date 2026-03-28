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
import { Plus } from 'lucide-react';
import { useInheritanceTaxGuide } from '@/hooks/useInheritanceTaxGuide';
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
import { Dialogs } from '@/components/ui/Dialogs';
import { DocumentFormModal } from '@/components/ui/DocumentFormModal';
import { TOAST_MESSAGES } from '@/constants/messages';

export const EditableListStep = () => {
  const {
    docListType,
    isTwoColumnPrint,
    hideSubmittedInPrint,
    currentDate,
    clientName,
    deceasedName,
    personInCharge,
    personInChargeContact,
    documentList,
    handleDocListTypeChange,
    handlePrint,
    handleExcelExport,
    togglePrintColumn,
    toggleHideSubmitted,
    setClientName,
    setDeceasedName,
    setPersonInCharge,
    setPersonInChargeContact,
    setDocumentList,
  } = useInheritanceTaxGuide();

  const { toasts, addToast, removeToast } = useToast();

  const editing = useEditableListEditing({
    documentList,
    setDocumentList,
    clientName,
    setClientName,
    deceasedName,
    setDeceasedName,
    personInCharge,
    setPersonInCharge,
    personInChargeContact,
    setPersonInChargeContact,
    docListType,
  });

  const dnd = useDragAndDrop(documentList, setDocumentList);
  const dndId = useId();
  const { isDark, toggleDark } = useDarkMode();

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

  // ─── 書類追加/編集モーダル ───
  // editingDoc は { categoryId, docId } — 編集モーダル
  // addingToCategoryId — 追加モーダル

  const editingDocData = useMemo(() => {
    if (!editing.editingDoc) return null;
    const cat = documentList.find(c => c.id === editing.editingDoc?.categoryId);
    const doc = cat?.documents.find(d => d.id === editing.editingDoc?.docId);
    return doc ?? null;
  }, [editing.editingDoc, documentList]);

  const handleAddDocSave = useCallback((values: { name: string; description: string; howToGet: string }) => {
    if (editing.addingToCategoryId) {
      editing.handleAddDocument(editing.addingToCategoryId, values.name, values.description, values.howToGet);
      addToast(TOAST_MESSAGES.documentAdded, 'success');
    }
  }, [editing.addingToCategoryId, editing.handleAddDocument, addToast]);

  const handleEditDocSave = useCallback((values: { name: string; description: string; howToGet: string }) => {
    if (editing.editingDoc) {
      editing.handleUpdateFields(editing.editingDoc.categoryId, editing.editingDoc.docId, values);
      editing.closeEditModal();
    }
  }, [editing.editingDoc, editing.handleUpdateFields, editing.closeEditModal]);

  return (
    <div className="w-full animate-fade-in">
      {/* ヘッダーツールバー */}
      <EditToolbar
        docListType={docListType}
        onDocListTypeChange={handleDocListTypeChange}
        clientName={clientName}
        onClientNameChange={setClientName}
        deceasedName={deceasedName}
        onDeceasedNameChange={setDeceasedName}
        personInCharge={personInCharge}
        onPersonInChargeChange={setPersonInCharge}
        personInChargeContact={personInChargeContact}
        onPersonInChargeContactChange={setPersonInChargeContact}
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
        isDark={isDark}
        toggleDark={toggleDark}
        isExporting={isExporting}
      />

      <div className="p-4 md:px-8 md:py-6">
        {/* カテゴリリスト（画面表示のみ、印刷非表示） */}
        <div className="no-print">
          {/* 空状態 */}
          {documentList.length === 0 ? (
            <EmptyState />
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
                  {documentList.map((category, catIdx) => (
                    <SortableCategoryCard
                      key={category.id}
                      category={category}
                      categoryNumber={catIdx + 1}
                      editState={editing.categoryEditState}
                      handlers={editing.categoryHandlers}
                      toggleAll={editing.docHandlers.toggleAll}
                    >
                      <div className="p-4">
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
                                docHandlers={editing.docHandlers}
                                subItemEditState={editing.subItemEditState}
                                subItemHandlers={editing.subItemHandlers}
                              />
                            ))}
                          </ul>
                        </SortableContext>

                        {/* 書類追加ボタン */}
                        <button
                          onClick={() => editing.setAddingToCategoryId(category.id)}
                          className="mt-3 flex items-center px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg border border-dashed border-emerald-300 dark:border-emerald-700 transition-all w-full justify-center hover:border-emerald-400 dark:hover:border-emerald-600"
                          aria-label={`${category.name}に書類を追加`}
                        >
                          <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
                          書類を追加
                        </button>
                      </div>
                    </SortableCategoryCard>
                  ))}

                  {/* カテゴリ追加 */}
                  <AddCategoryForm
                    isAdding={editing.isAddingCategory}
                    setIsAdding={editing.setIsAddingCategory}
                    name={editing.newCategoryName}
                    setName={editing.setNewCategoryName}
                    onAdd={editing.handleAddCategory}
                    onCancel={editing.cancelAddCategory}
                  />
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
        documentList={documentList}
        isTwoColumnPrint={isTwoColumnPrint}
        hideSubmittedInPrint={hideSubmittedInPrint}
        currentDate={currentDate}
        personInCharge={personInCharge}
        personInChargeContact={personInChargeContact}
        clientName={clientName}
        deceasedName={deceasedName}
        docListType={docListType}
      />

      {/* 書類追加モーダル */}
      {editing.addingToCategoryId && (
        <DocumentFormModal
          mode="add"
          onSave={handleAddDocSave}
          onClose={editing.cancelAddDocument}
        />
      )}

      {/* 書類編集モーダル */}
      {editing.editingDoc && editingDocData && (
        <DocumentFormModal
          mode="edit"
          initialValues={{
            name: editingDocData.name,
            description: editingDocData.description,
            howToGet: editingDocData.howToGet,
          }}
          onSave={handleEditDocSave}
          onClose={editing.closeEditModal}
        />
      )}

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
