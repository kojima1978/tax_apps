import { useState, useCallback, useMemo, useRef } from 'react';
import type { EditableDocumentList } from '@/constants';
import {
  toggleCategoryExpand,
  toggleAllInCategory,
  expandAllCategories,
  addCategory,
  updateCategoryName,
  toggleCategorySpecial,
} from '@/utils/editableListUtils';

type SetDocumentList = React.Dispatch<React.SetStateAction<EditableDocumentList>>;

export const useCategoryEditing = (
  documentList: EditableDocumentList,
  setDocumentList: SetDocumentList,
  requestDelete: (categoryId: string, name: string) => void,
) => {
  // documentListの最新値をrefで保持（handleRemoveCategoryの依存配列から除外するため）
  const documentListRef = useRef(documentList);
  documentListRef.current = documentList;

  // === カテゴリ編集状態 ===
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIsSpecial, setNewCategoryIsSpecial] = useState(false);

  // === 展開/折りたたみハンドラー ===
  const handleToggleExpand = useCallback((categoryId: string) => {
    setDocumentList(prev => toggleCategoryExpand(prev, categoryId));
  }, [setDocumentList]);

  const handleToggleAllInCategory = useCallback((categoryId: string, checked: boolean) => {
    setDocumentList(prev => toggleAllInCategory(prev, categoryId, checked));
  }, [setDocumentList]);

  const handleExpandAll = useCallback((expand: boolean) => {
    setDocumentList(prev => expandAllCategories(prev, expand));
  }, [setDocumentList]);

  // === カテゴリ追加/削除 ===
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
    const category = documentListRef.current.find(c => c.id === categoryId);
    if (category) {
      requestDelete(categoryId, category.name);
    }
  }, [requestDelete]);

  // === カテゴリ名編集 ===
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

  // === メモ化オブジェクト ===
  const categoryEditState = useMemo(() => ({
    editingId: editingCategory,
    editName: editCategoryName,
    setEditName: setEditCategoryName,
    confirm: confirmCategoryEdit,
    cancel: cancelCategoryEdit,
  }), [editingCategory, editCategoryName, confirmCategoryEdit, cancelCategoryEdit]);

  const categoryHandlers = useMemo(() => ({
    toggleExpand: handleToggleExpand,
    toggleSpecial: handleToggleCategorySpecial,
    startEdit: startCategoryEdit,
    remove: handleRemoveCategory,
    toggleAll: handleToggleAllInCategory,
  }), [handleToggleExpand, handleToggleCategorySpecial, startCategoryEdit, handleRemoveCategory, handleToggleAllInCategory]);

  return {
    isAddingCategory,
    setIsAddingCategory,
    newCategoryName,
    setNewCategoryName,
    newCategoryIsSpecial,
    setNewCategoryIsSpecial,
    handleAddCategory,
    cancelAddCategory,
    handleExpandAll,
    categoryEditState,
    categoryHandlers,
  };
};
