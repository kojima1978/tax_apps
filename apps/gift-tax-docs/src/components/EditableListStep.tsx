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
import {
  ChevronUp,
  Plus,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  ChevronsUpDown,
  Info,
  RotateCcw,
  Download,
  Upload,
} from 'lucide-react';
import { giftData, type EditableDocumentList, type Step } from '@/constants';
import { useEditableListEditing } from '@/hooks/useEditableListEditing';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { ResetConfirmDialog, ImportConfirmDialog, DeleteConfirmDialog, ImportErrorDialog } from '@/components/ui/ConfirmDialog';
import { SortableDocumentItem, DragOverlayItem, CategoryDragOverlay } from '@/components/ui/SortableDocumentItem';
import { SortableCategoryCard } from '@/components/ui/SortableCategoryCard';

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
  // 編集状態管理フックを使用
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

  // DnD管理フックを使用
  const dnd = useDragAndDrop(documentList, setDocumentList);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
      {/* ヘッダーツールバー */}
      <div className="no-print bg-white rounded-xl shadow-lg p-4 mb-6 sticky top-4 z-10" role="toolbar" aria-label="編集ツールバー">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-800">{giftData.title}</h1>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium" aria-live="polite">
              {editing.checkedCount} / {editing.totalCount} 選択中
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => editing.handleExpandAll(true)}
              className="flex items-center px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="全て展開"
              aria-label="全カテゴリを展開"
            >
              <ChevronsUpDown className="w-4 h-4 mr-1" aria-hidden="true" />
              展開
            </button>
            <button
              onClick={() => editing.handleExpandAll(false)}
              className="flex items-center px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="全て折りたたむ"
              aria-label="全カテゴリを折りたたむ"
            >
              <ChevronUp className="w-4 h-4 mr-1" aria-hidden="true" />
              折畳
            </button>
            <button
              onClick={() => editing.setShowResetDialog(true)}
              className="flex items-center px-3 py-2 text-sm bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors"
              title="デフォルトに戻す"
              aria-label="編集内容をリセット"
            >
              <RotateCcw className="w-4 h-4 mr-1" aria-hidden="true" />
              リセット
            </button>
            <div className="w-px h-6 bg-slate-300 mx-2" aria-hidden="true" />
            <button
              onClick={editing.handleJsonExport}
              className="flex items-center px-3 py-2 text-sm bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg transition-colors"
              title="JSONで出力"
              aria-label="JSONファイルとして出力"
            >
              <Download className="w-4 h-4 mr-1" aria-hidden="true" />
              出力
            </button>
            <label
              className="flex items-center px-3 py-2 text-sm bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg transition-colors cursor-pointer"
              title="JSONを取り込み"
            >
              <Upload className="w-4 h-4 mr-1" aria-hidden="true" />
              取込
              <input
                type="file"
                accept=".json"
                onChange={editing.handleFileSelect}
                className="hidden"
                aria-label="JSONファイルを選択"
              />
            </label>
            <div className="w-px h-6 bg-slate-300 mx-2" aria-hidden="true" />
            <button
              onClick={() => setStep('result')}
              className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              aria-label="印刷プレビューを表示"
            >
              <Printer className="w-4 h-4 mr-2" aria-hidden="true" />
              印刷プレビュー
            </button>
            <button
              onClick={handleExcelExport}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              aria-label="Excelファイルとして出力"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" aria-hidden="true" />
              Excel
            </button>
            <button
              onClick={resetToMenu}
              className="flex items-center px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-colors"
              aria-label="トップメニューに戻る"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

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
                            onToggleCheck={editing.handleToggleCheck}
                            onStartEdit={editing.startEdit}
                            onRemove={editing.handleRemoveDocument}
                            onAddSubItem={editing.startAddSubItem}
                            editingSubItem={editing.editingSubItem}
                            editSubItemText={editing.editSubItemText}
                            setEditSubItemText={editing.setEditSubItemText}
                            onStartSubItemEdit={editing.startSubItemEdit}
                            onConfirmSubItemEdit={editing.confirmSubItemEdit}
                            onCancelSubItemEdit={editing.cancelSubItemEdit}
                            onRemoveSubItem={editing.handleRemoveSubItem}
                            addingSubItemTo={editing.addingSubItemTo}
                            newSubItemText={editing.newSubItemText}
                            setNewSubItemText={editing.setNewSubItemText}
                            onConfirmAddSubItem={editing.handleAddSubItem}
                            onCancelAddSubItem={editing.cancelAddSubItem}
                          />
                        ))}
                      </ul>
                    </SortableContext>

                    {/* 書類追加 */}
                    {editing.addingToCategory === category.id ? (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="text"
                          value={editing.newDocText}
                          onChange={(e) => editing.setNewDocText(e.target.value)}
                          placeholder="書類名を入力..."
                          className="flex-grow px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          autoFocus
                          aria-label="新しい書類名を入力"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') editing.handleAddDocument(category.id);
                            if (e.key === 'Escape') editing.cancelAddDocument();
                          }}
                        />
                        <button
                          onClick={() => editing.handleAddDocument(category.id)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          追加
                        </button>
                        <button
                          onClick={editing.cancelAddDocument}
                          className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                        >
                          キャンセル
                        </button>
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
          {editing.isAddingCategory ? (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden p-4">
              <h3 className="font-bold text-slate-800 mb-3">新しいカテゴリを追加</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={editing.newCategoryName}
                  onChange={(e) => editing.setNewCategoryName(e.target.value)}
                  placeholder="カテゴリ名を入力..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                  aria-label="新しいカテゴリ名を入力"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') editing.handleAddCategory();
                    if (e.key === 'Escape') editing.cancelAddCategory();
                  }}
                />
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.newCategoryIsSpecial}
                    onChange={(e) => editing.setNewCategoryIsSpecial(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  />
                  <span className={editing.newCategoryIsSpecial ? 'text-purple-600 font-medium' : ''}>
                    特例カテゴリとして追加
                  </span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={editing.handleAddCategory}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    追加
                  </button>
                  <button
                    onClick={editing.cancelAddCategory}
                    className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => editing.setIsAddingCategory(true)}
              className="w-full flex items-center justify-center px-6 py-4 text-emerald-600 hover:bg-emerald-50 rounded-xl border-2 border-dashed border-emerald-300 transition-colors font-medium"
              aria-label="新しいカテゴリを追加"
            >
              <Plus className="w-5 h-5 mr-2" aria-hidden="true" />
              新しいカテゴリを追加
            </button>
          )}
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
