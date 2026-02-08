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
import { Plus, Info } from 'lucide-react';
import { InlineAddInput } from '@/components/ui/EditableInput';
import type { EditableDocumentList, Step } from '@/constants';
import { useEditableListEditing } from '@/hooks/useEditableListEditing';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { ResetConfirmDialog, ImportConfirmDialog, DeleteConfirmDialog, ImportErrorDialog } from '@/components/ui/ConfirmDialog';
import { SortableDocumentItem, DragOverlayItem } from '@/components/ui/SortableDocumentItem';
import { SortableCategoryCard, CategoryDragOverlay } from '@/components/ui/SortableCategoryCard';
import { EditToolbar } from '@/components/ui/EditToolbar';
import { AddCategoryForm } from '@/components/ui/AddCategoryForm';

type EditableListStepProps = {
  documentList: EditableDocumentList;
  setDocumentList: React.Dispatch<React.SetStateAction<EditableDocumentList>>;
  setStep: (step: Step) => void;
  resetToMenu: () => void;
  handleExcelExport: () => void;
  staffName: string;
  setStaffName: (name: string) => void;
  staffPhone: string;
  setStaffPhone: (phone: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
};

export const EditableListStep = ({
  documentList,
  setDocumentList,
  setStep,
  resetToMenu,
  handleExcelExport,
  staffName,
  setStaffName,
  staffPhone,
  setStaffPhone,
  customerName,
  setCustomerName,
}: EditableListStepProps) => {
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
        onPreview={() => setStep('result')}
        onExcelExport={handleExcelExport}
        onResetToMenu={resetToMenu}
      />

      {/* カテゴリリスト */}
      <DndContext
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
            {documentList.map((category) => {
              const categoryCheckedCount = category.documents.filter((d) => d.checked).length;
              const allChecked = category.documents.length > 0 && categoryCheckedCount === category.documents.length;
              const someChecked = categoryCheckedCount > 0 && !allChecked;

              return (
                <SortableCategoryCard
                  key={category.id}
                  category={category}
                  checkedCount={categoryCheckedCount}
                  allChecked={allChecked}
                  someChecked={someChecked}
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
              );
            })}

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
        ※チェックを入れた書類が印刷対象になります
      </div>

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
