import { useState, useCallback, useMemo, useRef } from 'react';
import type { EditableDocumentList } from '@/constants';
import {
  toggleCategoryExpand,
  expandAllCategories,
  toggleCategoryDisabled,
  addCategory,
  updateCategoryName,
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

  // === 展開/折りたたみハンドラー ===
  const handleToggleExpand = useCallback((categoryId: string) => {
    setDocumentList(prev => toggleCategoryExpand(prev, categoryId));
  }, [setDocumentList]);

  const handleExpandAll = useCallback((expand: boolean) => {
    setDocumentList(prev => expandAllCategories(prev, expand));
  }, [setDocumentList]);

  // === カテゴリ無効化 ===
  const handleToggleCategoryDisabled = useCallback((categoryId: string) => {
    setDocumentList(prev => toggleCategoryDisabled(prev, categoryId));
  }, [setDocumentList]);

  // === カテゴリ追加/削除 ===
  const handleAddCategory = useCallback(() => {
    if (newCategoryName.trim()) {
      setDocumentList(prev => addCategory(prev, newCategoryName.trim()));
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  }, [setDocumentList, newCategoryName]);

  const cancelAddCategory = useCallback(() => {
    setIsAddingCategory(false);
    setNewCategoryName('');
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
    toggleDisabled: handleToggleCategoryDisabled,
    startEdit: startCategoryEdit,
    remove: handleRemoveCategory,
  }), [handleToggleExpand, handleToggleCategoryDisabled, startCategoryEdit, handleRemoveCategory]);

  return {
    isAddingCategory,
    setIsAddingCategory,
    newCategoryName,
    setNewCategoryName,
    handleAddCategory,
    cancelAddCategory,
    handleExpandAll,
    categoryEditState,
    categoryHandlers,
  };
};
