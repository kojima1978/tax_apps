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
import { Plus, Info, Search, User, Calendar, Phone, UserCheck } from 'lucide-react';
import { InlineAddInput } from '@/components/ui/EditableInput';
import { useGiftTaxGuide } from '@/hooks/useGiftTaxGuide';
import { useEditableListEditing } from '@/hooks/useEditableListEditing';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useToast } from '@/hooks/useToast';
import { useDarkMode } from '@/hooks/useDarkMode';
import { ResetConfirmDialog, ImportConfirmDialog, DeleteConfirmDialog, ImportErrorDialog } from '@/components/ui/ConfirmDialog';
import { SortableDocumentItem, DragOverlayItem } from '@/components/ui/SortableDocumentItem';
import { SortableCategoryCard, CategoryDragOverlay } from '@/components/ui/SortableCategoryCard';
import { EditToolbar } from '@/components/ui/EditToolbar';
import { AddCategoryForm } from '@/components/ui/AddCategoryForm';
import { PrintSection } from '@/components/ui/PrintSection';
import { ToastContainer } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';

const infoBarInputClass = 'pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 bg-slate-50 dark:bg-slate-800/50 transition-all w-full';

const INFO_BAR_FIELDS = [
  { id: 'customerName', label: 'お客様名', type: 'text', placeholder: '例：山田 太郎 様', icon: User },
  { id: 'deadline', label: '資料収集期限', type: 'text', placeholder: '例：3月末まで', icon: Calendar },
  { id: 'staffName', label: '担当者名', type: 'text', placeholder: '例：鈴木 一郎', icon: UserCheck },
  { id: 'staffPhone', label: '担当者携帯', type: 'tel', placeholder: '例：090-1234-5678', icon: Phone },
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
      addToast('Excelファイルを出力しました', 'success');
    } catch {
      addToast('Excel出力に失敗しました', 'error');
    } finally {
      setIsExporting(false);
    }
  }, [handleExcelExport, addToast]);

  const handleJsonExportWithToast = useCallback(() => {
    editing.handleJsonExport();
    addToast('JSONファイルを出力しました', 'success');
  }, [editing.handleJsonExport, addToast]);

  const handleResetWithToast = useCallback(() => {
    editing.handleResetToDefault();
    addToast('初期状態にリセットしました', 'info');
  }, [editing.handleResetToDefault, addToast]);

  const handleImportWithToast = useCallback(() => {
    editing.confirmImport();
    addToast('データを取り込みました', 'success');
  }, [editing.confirmImport, addToast]);

  const valueMap = { customerName, staffName, staffPhone, deadline } as const;
  const setterMap = { customerName: setCustomerName, staffName: setStaffName, staffPhone: setStaffPhone, deadline: setDeadline } as const;

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
      <div className="no-print bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow dark:shadow-slate-900/50 p-4 mb-6 transition-colors border border-white/50 dark:border-slate-700/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {INFO_BAR_FIELDS.map((field) => {
            const Icon = field.icon;
            return (
              <div key={field.id}>
                <label htmlFor={field.id} className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{field.label}</label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  <input
                    type={field.type}
                    id={field.id}
                    className={infoBarInputClass}
                    placeholder={field.placeholder}
                    value={valueMap[field.id]}
                    onChange={(e) => setterMap[field.id](e.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

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

      {/* リセット確認ダイアログ */}
      {editing.showResetDialog && (
        <ResetConfirmDialog
          onConfirm={handleResetWithToast}
          onCancel={() => editing.setShowResetDialog(false)}
        />
      )}

      {/* インポート確認ダイアログ */}
      {editing.showImportDialog && editing.importPreview && (
        <ImportConfirmDialog
          preview={editing.importPreview}
          onConfirm={handleImportWithToast}
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

      {/* トースト通知 */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};
