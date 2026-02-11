'use client';

import {
  DndContext,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useId } from 'react';
import { Plus, Info } from 'lucide-react';
import { InlineAddInput } from '@/components/ui/EditableInput';
import { useGiftTaxGuide } from '@/hooks/useGiftTaxGuide';
import { useEditableListEditing } from '@/hooks/useEditableListEditing';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { ResetConfirmDialog, ImportConfirmDialog, DeleteConfirmDialog, ImportErrorDialog } from '@/components/ui/ConfirmDialog';
import { SortableDocumentItem, DragOverlayItem } from '@/components/ui/SortableDocumentItem';
import { SortableCategoryCard, CategoryDragOverlay } from '@/components/ui/SortableCategoryCard';
import { EditToolbar } from '@/components/ui/EditToolbar';
import { AddCategoryForm } from '@/components/ui/AddCategoryForm';
import { PrintSection } from '@/components/ui/PrintSection';

const infoBarInputClass = 'px-3 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm text-slate-800 placeholder-slate-400';

const INFO_BAR_FIELDS = [
  { id: 'customerName', label: 'お客様名:', type: 'text', placeholder: '例：山田 太郎 様' },
  { id: 'staffName', label: '担当者名:', type: 'text', placeholder: '例：鈴木 一郎' },
  { id: 'staffPhone', label: '担当者携帯:', type: 'tel', placeholder: '例：090-1234-5678' },
] as const;

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
    documentList,
    setDocumentList,
  } = useGiftTaxGuide();

  const editing = useEditableListEditing({
    documentList,
    setDocumentList,
    staffName,
    setStaffName,
    staffPhone,
    setStaffPhone,
    customerName,
    setCustomerName,
  });

  const dnd = useDragAndDrop(documentList, setDocumentList);
  const dndId = useId();

  const valueMap = { customerName, staffName, staffPhone } as const;
  const setterMap = { customerName: setCustomerName, staffName: setStaffName, staffPhone: setStaffPhone } as const;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
      {/* ヘッダーツールバー */}
      <EditToolbar
        checkedCount={editing.checkedCount}
        totalCount={editing.totalCount}
        onExpandAll={editing.handleExpandAll}
        onShowResetDialog={() => editing.setShowResetDialog(true)}
        onJsonExport={editing.handleJsonExport}
        onFileSelect={editing.handleFileSelect}
        onPrint={handlePrint}
        onExcelExport={handleExcelExport}
        isTwoColumnPrint={isTwoColumnPrint}
        togglePrintColumn={togglePrintColumn}
        hideSubmittedInPrint={hideSubmittedInPrint}
        toggleHideSubmitted={toggleHideSubmitted}
      />

      {/* 入力バー */}
      <div className="no-print bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap items-center gap-4">
        {INFO_BAR_FIELDS.map((field) => (
          <div key={field.id} className="flex items-center gap-2">
            <label htmlFor={field.id} className="text-sm font-medium text-slate-600 whitespace-nowrap">{field.label}</label>
            <input
              type={field.type}
              id={field.id}
              className={infoBarInputClass}
              placeholder={field.placeholder}
              value={valueMap[field.id]}
              onChange={(e) => setterMap[field.id](e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* カテゴリリスト（画面表示のみ、印刷非表示） */}
      <div className="no-print">
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
              {documentList.map((category) => (
                  <SortableCategoryCard
                    key={category.id}
                    category={category}
                    editState={editing.categoryEditState}
                    handlers={editing.categoryHandlers}
                  >
                    <div className="p-4">
                      {/* 注記 */}
                      {category.note && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start text-sm text-amber-800" role="note">
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
                          {category.documents.map((doc) => (
                            <SortableDocumentItem
                              key={doc.id}
                              doc={doc}
                              categoryId={category.id}
                              isEditing={editing.editingDoc?.categoryId === category.id && editing.editingDoc?.docId === doc.id}
                              editText={editing.editText}
                              setEditText={editing.setEditText}
                              onConfirmEdit={editing.confirmEdit}
                              onCancelEdit={editing.cancelEdit}
                              docHandlers={editing.docHandlers}
                              editingSubItem={editing.editingSubItem}
                              editSubItemText={editing.editSubItemText}
                              setEditSubItemText={editing.setEditSubItemText}
                              addingSubItemTo={editing.addingSubItemTo}
                              newSubItemText={editing.newSubItemText}
                              setNewSubItemText={editing.setNewSubItemText}
                              subItemHandlers={editing.subItemHandlers}
                            />
                          ))}
                        </ul>
                      </SortableContext>

                      {/* 書類追加 */}
                      {editing.addingToCategory === category.id ? (
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
                          className="mt-3 flex items-center px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg border border-dashed border-emerald-300 transition-colors w-full justify-center"
                          aria-label={`${category.name}に書類を追加`}
                        >
                          <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
                          書類を追加
                        </button>
                      )}
                    </div>
                  </SortableCategoryCard>
              ))}

              {/* カテゴリ追加 */}
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
            </div>
          </SortableContext>

          {/* ドラッグオーバーレイ */}
          <DragOverlay>
            {dnd.isDraggingCategory && dnd.activeId && dnd.activeCategory ? (
              <CategoryDragOverlay category={dnd.activeCategory} />
            ) : dnd.activeId && dnd.activeDocument ? (
              <DragOverlayItem doc={dnd.activeDocument} />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* フッター */}
        <div className="mt-8 text-center text-sm text-slate-400">
          ※チェックを入れると提出済み（取り消し線）になります
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
      />

      {/* リセット確認ダイアログ */}
      {editing.showResetDialog && (
        <ResetConfirmDialog
          onConfirm={editing.handleResetToDefault}
          onCancel={() => editing.setShowResetDialog(false)}
        />
      )}

      {/* インポート確認ダイアログ */}
      {editing.showImportDialog && editing.importPreview && (
        <ImportConfirmDialog
          preview={editing.importPreview}
          onConfirm={editing.confirmImport}
          onCancel={editing.cancelImport}
        />
      )}

      {/* 削除確認ダイアログ */}
      {editing.deleteTarget && (
        <DeleteConfirmDialog
          message={editing.deleteDialogMessage}
          subMessage={editing.deleteDialogSubMessage}
          onConfirm={editing.confirmDelete}
          onCancel={editing.cancelDelete}
        />
      )}

      {/* インポートエラーダイアログ */}
      {editing.importError && (
        <ImportErrorDialog onDismiss={editing.dismissImportError} />
      )}
    </div>
  );
};
