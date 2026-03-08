import { useState, useCallback, useMemo } from 'react';
import type { EditableDocumentList } from '@/constants';
import {
  toggleDocumentCheck,
  addDocumentToCategory,
  updateDocumentText,
} from '@/utils/editableListUtils';

type SetDocumentList = React.Dispatch<React.SetStateAction<EditableDocumentList>>;

type EditingDoc = { categoryId: string; docId: string } | null;

/** 書類操作ハンドラー（メモ化用） */
export type DocHandlers = {
  toggleCheck: (categoryId: string, docId: string) => void;
  startEdit: (categoryId: string, docId: string, currentText: string) => void;
  remove: (categoryId: string, docId: string) => void;
};

export const useDocumentEditing = (
  setDocumentList: SetDocumentList,
  requestDelete: (categoryId: string, docId: string) => void,
) => {
  const [editingDoc, setEditingDoc] = useState<EditingDoc>(null);
  const [editText, setEditText] = useState('');
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newDocText, setNewDocText] = useState('');

  const handleToggleCheck = useCallback((categoryId: string, docId: string) => {
    setDocumentList(prev => toggleDocumentCheck(prev, categoryId, docId));
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

  const docHandlers = useMemo<DocHandlers>(() => ({
    toggleCheck: handleToggleCheck,
    startEdit,
    remove: requestDelete,
  }), [handleToggleCheck, startEdit, requestDelete]);

  return {
    editingDoc,
    editText,
    setEditText,
    addingToCategory,
    setAddingToCategory,
    newDocText,
    setNewDocText,
    handleAddDocument,
    cancelAddDocument,
    confirmEdit,
    cancelEdit,
    docHandlers,
  };
};
