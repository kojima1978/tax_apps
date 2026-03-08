import { useState, useCallback, useMemo } from 'react';
import type { EditableDocumentList } from '@/constants';
import { addSubItem, removeSubItem, updateSubItemText } from '@/utils/editableListUtils';

type SetDocumentList = React.Dispatch<React.SetStateAction<EditableDocumentList>>;

export type EditingSubItem = { categoryId: string; docId: string; subItemId: string } | null;
export type AddingSubItemTo = { categoryId: string; docId: string } | null;

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

export const useSubItemEditing = (setDocumentList: SetDocumentList) => {
  const [addingSubItemTo, setAddingSubItemTo] = useState<AddingSubItemTo>(null);
  const [newSubItemText, setNewSubItemText] = useState('');
  const [editingSubItem, setEditingSubItem] = useState<EditingSubItem>(null);
  const [editSubItemText, setEditSubItemText] = useState('');

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

  const subItemHandlers = useMemo<SubItemHandlers>(() => ({
    startAdd: startAddSubItem,
    confirmAdd: handleAddSubItem,
    cancelAdd: cancelAddSubItem,
    startEdit: startSubItemEdit,
    confirmEdit: confirmSubItemEdit,
    cancelEdit: cancelSubItemEdit,
    remove: handleRemoveSubItem,
  }), [startAddSubItem, handleAddSubItem, cancelAddSubItem, startSubItemEdit, confirmSubItemEdit, cancelSubItemEdit, handleRemoveSubItem]);

  return {
    addingSubItemTo,
    newSubItemText,
    setNewSubItemText,
    editingSubItem,
    editSubItemText,
    setEditSubItemText,
    subItemHandlers,
  };
};
