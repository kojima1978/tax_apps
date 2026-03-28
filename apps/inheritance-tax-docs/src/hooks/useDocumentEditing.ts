import { useState, useCallback, useMemo } from 'react';
import type { EditableDocumentList } from '@/constants';
import {
  toggleDocumentCheck,
  toggleDocumentExcluded,
  toggleDocumentUrgent,
  toggleDocumentCanDelegate,
  updateDocumentFields,
  addDocumentToCategory,
  addSpecificName,
  removeSpecificName,
  updateSpecificNameText,
  toggleAllInCategory,
} from '@/utils/editableListUtils';

type SetDocumentList = React.Dispatch<React.SetStateAction<EditableDocumentList>>;

type EditingDoc = { categoryId: string; docId: string } | null;

/** 書類操作ハンドラー（メモ化用） */
export type DocHandlers = {
  toggleCheck: (categoryId: string, docId: string) => void;
  toggleExcluded: (categoryId: string, docId: string) => void;
  toggleUrgent: (categoryId: string, docId: string) => void;
  toggleCanDelegate: (categoryId: string, docId: string) => void;
  startEdit: (categoryId: string, docId: string) => void;
  remove: (categoryId: string, docId: string) => void;
  toggleAll: (categoryId: string, checked: boolean) => void;
};

/** 個別名編集状態 */
export type SubItemEditState = {
  editingSubItem: { categoryId: string; docId: string; nameId: string } | null;
  editSubItemText: string;
  setEditSubItemText: (text: string) => void;
  addingSubItemTo: { categoryId: string; docId: string } | null;
  newSubItemText: string;
  setNewSubItemText: (text: string) => void;
};

/** 個別名操作ハンドラー */
export type SubItemHandlers = {
  startAdd: (categoryId: string, docId: string) => void;
  confirmAdd: (categoryId: string, docId: string) => void;
  cancelAdd: () => void;
  startEdit: (categoryId: string, docId: string, nameId: string, text: string) => void;
  confirmEdit: () => void;
  cancelEdit: () => void;
  remove: (categoryId: string, docId: string, nameId: string) => void;
};

export const useDocumentEditing = (
  setDocumentList: SetDocumentList,
  requestDelete: (categoryId: string, docId: string) => void,
) => {
  const [editingDoc, setEditingDoc] = useState<EditingDoc>(null);
  const [addingToCategoryId, setAddingToCategoryId] = useState<string | null>(null);

  // === 個別名編集状態 ===
  const [editingSubItem, setEditingSubItem] = useState<{ categoryId: string; docId: string; nameId: string } | null>(null);
  const [editSubItemText, setEditSubItemText] = useState('');
  const [addingSubItemTo, setAddingSubItemTo] = useState<{ categoryId: string; docId: string } | null>(null);
  const [newSubItemText, setNewSubItemText] = useState('');

  // === チェック ===
  const handleToggleCheck = useCallback((categoryId: string, docId: string) => {
    setDocumentList(prev => toggleDocumentCheck(prev, categoryId, docId));
  }, [setDocumentList]);

  const handleToggleAllInCategory = useCallback((categoryId: string, checked: boolean) => {
    setDocumentList(prev => toggleAllInCategory(prev, categoryId, checked));
  }, [setDocumentList]);

  // === 対象外・緊急・代行 ===
  const handleToggleExcluded = useCallback((categoryId: string, docId: string) => {
    setDocumentList(prev => toggleDocumentExcluded(prev, categoryId, docId));
  }, [setDocumentList]);

  const handleToggleUrgent = useCallback((categoryId: string, docId: string) => {
    setDocumentList(prev => toggleDocumentUrgent(prev, categoryId, docId));
  }, [setDocumentList]);

  const handleToggleCanDelegate = useCallback((categoryId: string, docId: string) => {
    setDocumentList(prev => toggleDocumentCanDelegate(prev, categoryId, docId));
  }, [setDocumentList]);

  // === フィールド更新 ===
  const handleUpdateFields = useCallback((categoryId: string, docId: string, fields: { name?: string; description?: string; howToGet?: string }) => {
    setDocumentList(prev => updateDocumentFields(prev, categoryId, docId, fields));
  }, [setDocumentList]);

  // === 書類追加 ===
  const handleAddDocument = useCallback((categoryId: string, name: string, description: string, howToGet: string) => {
    setDocumentList(prev => addDocumentToCategory(prev, categoryId, name, description, howToGet));
    setAddingToCategoryId(null);
  }, [setDocumentList]);

  const cancelAddDocument = useCallback(() => {
    setAddingToCategoryId(null);
  }, []);

  // === 編集モーダル ===
  const startEdit = useCallback((categoryId: string, docId: string) => {
    setEditingDoc({ categoryId, docId });
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingDoc(null);
  }, []);

  // === 個別名 ===
  const handleAddSpecificName = useCallback((categoryId: string, docId: string, text: string) => {
    setDocumentList(prev => addSpecificName(prev, categoryId, docId, text));
  }, [setDocumentList]);

  const handleRemoveSpecificName = useCallback((categoryId: string, docId: string, nameId: string) => {
    setDocumentList(prev => removeSpecificName(prev, categoryId, docId, nameId));
  }, [setDocumentList]);

  const handleUpdateSpecificName = useCallback((categoryId: string, docId: string, nameId: string, text: string) => {
    setDocumentList(prev => updateSpecificNameText(prev, categoryId, docId, nameId, text));
  }, [setDocumentList]);

  // === 個別名の追加/編集ハンドラー ===
  const startSubItemAdd = useCallback((categoryId: string, docId: string) => {
    setAddingSubItemTo({ categoryId, docId });
    setNewSubItemText('');
  }, []);

  const confirmSubItemAdd = useCallback((categoryId: string, docId: string) => {
    if (newSubItemText.trim()) {
      handleAddSpecificName(categoryId, docId, newSubItemText.trim());
    }
    setAddingSubItemTo(null);
    setNewSubItemText('');
  }, [newSubItemText, handleAddSpecificName]);

  const cancelSubItemAdd = useCallback(() => {
    setAddingSubItemTo(null);
    setNewSubItemText('');
  }, []);

  const startSubItemEdit = useCallback((categoryId: string, docId: string, nameId: string, text: string) => {
    setEditingSubItem({ categoryId, docId, nameId });
    setEditSubItemText(text);
  }, []);

  const confirmSubItemEdit = useCallback(() => {
    if (editingSubItem && editSubItemText.trim()) {
      handleUpdateSpecificName(editingSubItem.categoryId, editingSubItem.docId, editingSubItem.nameId, editSubItemText.trim());
    }
    setEditingSubItem(null);
    setEditSubItemText('');
  }, [editingSubItem, editSubItemText, handleUpdateSpecificName]);

  const cancelSubItemEdit = useCallback(() => {
    setEditingSubItem(null);
    setEditSubItemText('');
  }, []);

  const removeSubItem = useCallback((categoryId: string, docId: string, nameId: string) => {
    handleRemoveSpecificName(categoryId, docId, nameId);
  }, [handleRemoveSpecificName]);

  // === メモ化ハンドラーオブジェクト ===
  const docHandlers = useMemo<DocHandlers>(() => ({
    toggleCheck: handleToggleCheck,
    toggleExcluded: handleToggleExcluded,
    toggleUrgent: handleToggleUrgent,
    toggleCanDelegate: handleToggleCanDelegate,
    startEdit,
    remove: requestDelete,
    toggleAll: handleToggleAllInCategory,
  }), [handleToggleCheck, handleToggleExcluded, handleToggleUrgent, handleToggleCanDelegate, startEdit, requestDelete, handleToggleAllInCategory]);

  const subItemEditState = useMemo<SubItemEditState>(() => ({
    editingSubItem,
    editSubItemText,
    setEditSubItemText,
    addingSubItemTo,
    newSubItemText,
    setNewSubItemText,
  }), [editingSubItem, editSubItemText, addingSubItemTo, newSubItemText]);

  const subItemHandlers = useMemo<SubItemHandlers>(() => ({
    startAdd: startSubItemAdd,
    confirmAdd: confirmSubItemAdd,
    cancelAdd: cancelSubItemAdd,
    startEdit: startSubItemEdit,
    confirmEdit: confirmSubItemEdit,
    cancelEdit: cancelSubItemEdit,
    remove: removeSubItem,
  }), [startSubItemAdd, confirmSubItemAdd, cancelSubItemAdd, startSubItemEdit, confirmSubItemEdit, cancelSubItemEdit, removeSubItem]);

  return {
    editingDoc,
    addingToCategoryId,
    setAddingToCategoryId,
    handleAddDocument,
    cancelAddDocument,
    handleUpdateFields,
    closeEditModal,
    handleAddSpecificName,
    handleRemoveSpecificName,
    handleUpdateSpecificName,
    docHandlers,
    subItemEditState,
    subItemHandlers,
  };
};
