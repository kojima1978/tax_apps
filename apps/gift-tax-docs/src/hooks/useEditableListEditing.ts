import { useState, useCallback, useMemo, useRef } from 'react';
import type { EditableDocumentList } from '@/constants';
import type { ExportData } from '@/utils/jsonExportImport';
import {
  toggleDocumentCheck,
  toggleCategoryExpand,
  toggleAllInCategory,
  expandAllCategories,
  addDocumentToCategory,
  removeDocument,
  updateDocumentText,
  addSubItem,
  removeSubItem,
  updateSubItemText,
  addCategory,
  removeCategory,
  updateCategoryName,
  toggleCategorySpecial,
  initializeEditableList,
} from '@/utils/editableListUtils';
import { exportToJson, readJsonFile } from '@/utils/jsonExportImport';

type EditingDoc = { categoryId: string; docId: string } | null;
export type EditingSubItem = { categoryId: string; docId: string; subItemId: string } | null;
export type AddingSubItemTo = { categoryId: string; docId: string } | null;

type DeleteTarget =
  | { type: 'document'; categoryId: string; docId: string }
  | { type: 'category'; categoryId: string; name: string };

/** 書類操作ハンドラー（メモ化用） */
export type DocHandlers = {
  toggleCheck: (categoryId: string, docId: string) => void;
  startEdit: (categoryId: string, docId: string, currentText: string) => void;
  remove: (categoryId: string, docId: string) => void;
};

/** 中項目操作ハンドラー（メモ化用） */
export type SubItemHandlers = {
  startAdd: (categoryId: string, docId: string) => void;
  confirmAdd: (categoryId: string, docId: string) => void;
  cancelAdd: () => void;
  startEdit: (categoryId: string, docId: string, subItemId: string, text: string) => void;
  confirmEdit: () => void;
  cancelEdit: () => void;
  remove: (categoryId: string, docId: string, subItemId: string) => void;
};

type SetDocumentList = React.Dispatch<React.SetStateAction<EditableDocumentList>>;

type UseEditableListEditingArgs = {
  documentList: EditableDocumentList;
  setDocumentList: SetDocumentList;
  staffName: string;
  setStaffName: (name: string) => void;
  staffPhone: string;
  setStaffPhone: (phone: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  deadline: string;
  setDeadline: (v: string) => void;
};

export const useEditableListEditing = ({
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
}: UseEditableListEditingArgs) => {
  // documentListの最新値をrefで保持（handleRemoveCategoryの依存配列から除外するため）
  const documentListRef = useRef(documentList);
  documentListRef.current = documentList;

  // === 書類編集状態 ===
  const [editingDoc, setEditingDoc] = useState<EditingDoc>(null);
  const [editText, setEditText] = useState('');
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newDocText, setNewDocText] = useState('');

  // === カテゴリ編集状態 ===
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIsSpecial, setNewCategoryIsSpecial] = useState(false);

  // === 中項目編集状態 ===
  const [addingSubItemTo, setAddingSubItemTo] = useState<AddingSubItemTo>(null);
  const [newSubItemText, setNewSubItemText] = useState('');
  const [editingSubItem, setEditingSubItem] = useState<EditingSubItem>(null);
  const [editSubItemText, setEditSubItemText] = useState('');

  // === ダイアログ状態 ===
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importPreview, setImportPreview] = useState<ExportData | null>(null);
  const [importError, setImportError] = useState(false);

  // === 削除確認ダイアログ状態 ===
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // === 集計値（メモ化） ===
  const { checkedCount, totalCount } = useMemo(() => ({
    checkedCount: documentList.reduce(
      (acc, cat) => acc + cat.documents.filter((d) => d.checked).length,
      0
    ),
    totalCount: documentList.reduce((acc, cat) => acc + cat.documents.length, 0),
  }), [documentList]);

  // === 書類ハンドラー（関数アップデートで安定参照） ===
  const handleToggleCheck = useCallback((categoryId: string, docId: string) => {
    setDocumentList(prev => toggleDocumentCheck(prev, categoryId, docId));
  }, [setDocumentList]);

  const handleToggleExpand = useCallback((categoryId: string) => {
    setDocumentList(prev => toggleCategoryExpand(prev, categoryId));
  }, [setDocumentList]);

  const handleToggleAllInCategory = useCallback((categoryId: string, checked: boolean) => {
    setDocumentList(prev => toggleAllInCategory(prev, categoryId, checked));
  }, [setDocumentList]);

  const handleExpandAll = useCallback((expand: boolean) => {
    setDocumentList(prev => expandAllCategories(prev, expand));
  }, [setDocumentList]);

  const handleAddDocument = useCallback((categoryId: string) => {
    if (newDocText.trim()) {
      setDocumentList(prev => addDocumentToCategory(prev, categoryId, newDocText.trim()));
      setNewDocText('');
      setAddingToCategory(null);
    }
  }, [setDocumentList, newDocText]);

  const cancelAddDocument = useCallback(() => {
    setAddingToCategory(null);
    setNewDocText('');
  }, []);

  const handleRemoveDocument = useCallback((categoryId: string, docId: string) => {
    setDeleteTarget({ type: 'document', categoryId, docId });
  }, []);

  const startEdit = useCallback((categoryId: string, docId: string, currentText: string) => {
    setEditingDoc({ categoryId, docId });
    setEditText(currentText);
  }, []);

  const confirmEdit = useCallback(() => {
    if (editingDoc && editText.trim()) {
      setDocumentList(prev =>
        updateDocumentText(prev, editingDoc.categoryId, editingDoc.docId, editText.trim())
      );
    }
    setEditingDoc(null);
    setEditText('');
  }, [setDocumentList, editingDoc, editText]);

  const cancelEdit = useCallback(() => {
    setEditingDoc(null);
    setEditText('');
  }, []);

  // === 中項目ハンドラー ===
  const startAddSubItem = useCallback((categoryId: string, docId: string) => {
    setAddingSubItemTo({ categoryId, docId });
  }, []);

  const handleAddSubItem = useCallback((categoryId: string, docId: string) => {
    if (newSubItemText.trim()) {
      setDocumentList(prev => addSubItem(prev, categoryId, docId, newSubItemText.trim()));
      setNewSubItemText('');
      setAddingSubItemTo(null);
    }
  }, [setDocumentList, newSubItemText]);

  const cancelAddSubItem = useCallback(() => {
    setAddingSubItemTo(null);
    setNewSubItemText('');
  }, []);

  const handleRemoveSubItem = useCallback((categoryId: string, docId: string, subItemId: string) => {
    setDocumentList(prev => removeSubItem(prev, categoryId, docId, subItemId));
  }, [setDocumentList]);

  const startSubItemEdit = useCallback((categoryId: string, docId: string, subItemId: string, currentText: string) => {
    setEditingSubItem({ categoryId, docId, subItemId });
    setEditSubItemText(currentText);
  }, []);

  const confirmSubItemEdit = useCallback(() => {
    if (editingSubItem && editSubItemText.trim()) {
      setDocumentList(prev =>
        updateSubItemText(
          prev,
          editingSubItem.categoryId,
          editingSubItem.docId,
          editingSubItem.subItemId,
          editSubItemText.trim()
        )
      );
    }
    setEditingSubItem(null);
    setEditSubItemText('');
  }, [setDocumentList, editingSubItem, editSubItemText]);

  const cancelSubItemEdit = useCallback(() => {
    setEditingSubItem(null);
    setEditSubItemText('');
  }, []);

  // === カテゴリハンドラー ===
  const handleAddCategory = useCallback(() => {
    if (newCategoryName.trim()) {
      setDocumentList(prev => addCategory(prev, newCategoryName.trim(), newCategoryIsSpecial));
      setNewCategoryName('');
      setNewCategoryIsSpecial(false);
      setIsAddingCategory(false);
    }
  }, [setDocumentList, newCategoryName, newCategoryIsSpecial]);

  const cancelAddCategory = useCallback(() => {
    setIsAddingCategory(false);
    setNewCategoryName('');
    setNewCategoryIsSpecial(false);
  }, []);

  const handleRemoveCategory = useCallback((categoryId: string) => {
    const category = documentListRef.current.find((c) => c.id === categoryId);
    if (category) {
      setDeleteTarget({ type: 'category', categoryId, name: category.name });
    }
  }, []);

  const startCategoryEdit = useCallback((categoryId: string, currentName: string) => {
    setEditingCategory(categoryId);
    setEditCategoryName(currentName);
  }, []);

  const confirmCategoryEdit = useCallback(() => {
    if (editingCategory && editCategoryName.trim()) {
      setDocumentList(prev => updateCategoryName(prev, editingCategory, editCategoryName.trim()));
    }
    setEditingCategory(null);
    setEditCategoryName('');
  }, [setDocumentList, editingCategory, editCategoryName]);

  const cancelCategoryEdit = useCallback(() => {
    setEditingCategory(null);
    setEditCategoryName('');
  }, []);

  const handleToggleCategorySpecial = useCallback((categoryId: string) => {
    setDocumentList(prev => toggleCategorySpecial(prev, categoryId));
  }, [setDocumentList]);

  // === 削除確認 ===
  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'document') {
      setDocumentList(prev => removeDocument(prev, deleteTarget.categoryId, deleteTarget.docId));
    } else {
      setDocumentList(prev => removeCategory(prev, deleteTarget.categoryId));
    }
    setDeleteTarget(null);
  }, [deleteTarget, setDocumentList]);

  const cancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const deleteDialogMessage = deleteTarget
    ? deleteTarget.type === 'document'
      ? 'この書類を削除しますか？'
      : `「${deleteTarget.name}」を削除しますか？`
    : '';

  const deleteDialogSubMessage = deleteTarget?.type === 'category'
    ? '含まれる書類もすべて削除されます。'
    : undefined;

  // === リセット ===
  const handleResetToDefault = useCallback(() => {
    setDocumentList(initializeEditableList());
    setShowResetDialog(false);
  }, [setDocumentList]);

  // === JSON エクスポート/インポート ===
  const handleJsonExport = useCallback(() => {
    exportToJson(documentList, staffName, staffPhone, customerName, deadline);
  }, [documentList, staffName, staffPhone, customerName, deadline]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await readJsonFile(file);
    if (data) {
      setImportPreview(data);
      setShowImportDialog(true);
    } else {
      setImportError(true);
    }

    e.target.value = '';
  }, []);

  const confirmImport = useCallback(() => {
    if (importPreview) {
      setDocumentList(importPreview.documentList);
      if (importPreview.staffName) setStaffName(importPreview.staffName);
      if (importPreview.staffPhone) setStaffPhone(importPreview.staffPhone);
      if (importPreview.customerName) setCustomerName(importPreview.customerName);
      setDeadline(importPreview.deadline || '');
      setShowImportDialog(false);
      setImportPreview(null);
    }
  }, [importPreview, setDocumentList, setStaffName, setStaffPhone, setCustomerName, setDeadline]);

  const cancelImport = useCallback(() => {
    setShowImportDialog(false);
    setImportPreview(null);
  }, []);

  const dismissImportError = useCallback(() => {
    setImportError(false);
  }, []);

  // === カテゴリ編集状態オブジェクト（メモ化） ===
  const categoryEditState = useMemo(() => ({
    editingId: editingCategory,
    editName: editCategoryName,
    setEditName: setEditCategoryName,
    confirm: confirmCategoryEdit,
    cancel: cancelCategoryEdit,
  }), [editingCategory, editCategoryName, confirmCategoryEdit, cancelCategoryEdit]);

  // === カテゴリハンドラーオブジェクト（メモ化） ===
  const categoryHandlers = useMemo(() => ({
    toggleExpand: handleToggleExpand,
    toggleSpecial: handleToggleCategorySpecial,
    startEdit: startCategoryEdit,
    remove: handleRemoveCategory,
    toggleAll: handleToggleAllInCategory,
  }), [handleToggleExpand, handleToggleCategorySpecial, startCategoryEdit, handleRemoveCategory, handleToggleAllInCategory]);

  // === 書類ハンドラーオブジェクト（メモ化） ===
  const docHandlers = useMemo(() => ({
    toggleCheck: handleToggleCheck,
    startEdit,
    remove: handleRemoveDocument,
  }), [handleToggleCheck, startEdit, handleRemoveDocument]);

  // === 中項目ハンドラーオブジェクト（メモ化） ===
  const subItemHandlers = useMemo(() => ({
    startAdd: startAddSubItem,
    confirmAdd: handleAddSubItem,
    cancelAdd: cancelAddSubItem,
    startEdit: startSubItemEdit,
    confirmEdit: confirmSubItemEdit,
    cancelEdit: cancelSubItemEdit,
    remove: handleRemoveSubItem,
  }), [startAddSubItem, handleAddSubItem, cancelAddSubItem, startSubItemEdit, confirmSubItemEdit, cancelSubItemEdit, handleRemoveSubItem]);

  return {
    // 書類編集状態
    editingDoc,
    editText,
    setEditText,
    addingToCategory,
    setAddingToCategory,
    newDocText,
    setNewDocText,

    // カテゴリ編集状態
    isAddingCategory,
    setIsAddingCategory,
    newCategoryName,
    setNewCategoryName,
    newCategoryIsSpecial,
    setNewCategoryIsSpecial,

    // 中項目編集状態
    addingSubItemTo,
    newSubItemText,
    setNewSubItemText,
    editingSubItem,
    editSubItemText,
    setEditSubItemText,

    // ダイアログ状態
    showResetDialog,
    setShowResetDialog,
    showImportDialog,
    importPreview,
    importError,
    dismissImportError,
    deleteTarget,
    deleteDialogMessage,
    deleteDialogSubMessage,
    confirmDelete,
    cancelDelete,

    // 集計値
    checkedCount,
    totalCount,

    // メモ化されたオブジェクト
    categoryEditState,
    categoryHandlers,
    docHandlers,
    subItemHandlers,

    // 書類ハンドラー（個別参照も維持）
    handleExpandAll,
    handleAddDocument,
    cancelAddDocument,
    confirmEdit,
    cancelEdit,

    // カテゴリハンドラー
    handleAddCategory,
    cancelAddCategory,

    // リセット
    handleResetToDefault,

    // JSON
    handleJsonExport,
    handleFileSelect,
    confirmImport,
    cancelImport,
  };
};
