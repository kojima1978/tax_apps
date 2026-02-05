import { useState, useCallback, useMemo } from 'react';
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

export type EditingDoc = { categoryId: string; docId: string } | null;
export type EditingSubItem = { categoryId: string; docId: string; subItemId: string } | null;
export type AddingSubItemTo = { categoryId: string; docId: string } | null;

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
}: UseEditableListEditingArgs) => {
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

  const handleRemoveDocument = useCallback((categoryId: string, docId: string) => {
    if (confirm('この書類を削除しますか？')) {
      setDocumentList(prev => removeDocument(prev, categoryId, docId));
    }
  }, [setDocumentList]);

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

  const handleRemoveCategory = useCallback((categoryId: string) => {
    const category = documentList.find((c) => c.id === categoryId);
    if (category && confirm(`「${category.name}」を削除しますか？\n※含まれる書類もすべて削除されます。`)) {
      setDocumentList(prev => removeCategory(prev, categoryId));
    }
  }, [documentList, setDocumentList]);

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

  // === リセット ===
  const handleResetToDefault = useCallback(() => {
    setDocumentList(initializeEditableList());
    setShowResetDialog(false);
  }, [setDocumentList]);

  // === JSON エクスポート/インポート ===
  const handleJsonExport = useCallback(() => {
    exportToJson(documentList, staffName, staffPhone, customerName);
  }, [documentList, staffName, staffPhone, customerName]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await readJsonFile(file);
    if (data) {
      setImportPreview(data);
      setShowImportDialog(true);
    } else {
      alert('JSONファイルの読み込みに失敗しました。\nファイル形式を確認してください。');
    }

    e.target.value = '';
  }, []);

  const confirmImport = useCallback(() => {
    if (importPreview) {
      setDocumentList(importPreview.documentList);
      if (importPreview.staffName) setStaffName(importPreview.staffName);
      if (importPreview.staffPhone) setStaffPhone(importPreview.staffPhone);
      if (importPreview.customerName) setCustomerName(importPreview.customerName);
      setShowImportDialog(false);
      setImportPreview(null);
    }
  }, [importPreview, setDocumentList, setStaffName, setStaffPhone, setCustomerName]);

  const cancelImport = useCallback(() => {
    setShowImportDialog(false);
    setImportPreview(null);
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

    // 集計値
    checkedCount,
    totalCount,

    // メモ化されたオブジェクト
    categoryEditState,
    categoryHandlers,

    // 書類ハンドラー
    handleToggleCheck,
    handleExpandAll,
    handleAddDocument,
    handleRemoveDocument,
    startEdit,
    confirmEdit,
    cancelEdit,

    // 中項目ハンドラー
    startAddSubItem,
    handleAddSubItem,
    cancelAddSubItem,
    handleRemoveSubItem,
    startSubItemEdit,
    confirmSubItemEdit,
    cancelSubItemEdit,

    // カテゴリハンドラー
    handleAddCategory,

    // リセット
    handleResetToDefault,

    // JSON
    handleJsonExport,
    handleFileSelect,
    confirmImport,
    cancelImport,
  };
};
