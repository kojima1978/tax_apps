import { useState, useCallback } from 'react';
import type { EditableDocumentList } from '@/constants';
import { DIALOG_MESSAGES } from '@/constants/messages';
import { removeDocument, removeCategory } from '@/utils/editableListUtils';

type DeleteTarget =
  | { type: 'document'; categoryId: string; docId: string }
  | { type: 'category'; categoryId: string; name: string };

type SetDocumentList = React.Dispatch<React.SetStateAction<EditableDocumentList>>;

export const useDeleteConfirm = (setDocumentList: SetDocumentList) => {
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const requestDocumentDelete = useCallback((categoryId: string, docId: string) => {
    setDeleteTarget({ type: 'document', categoryId, docId });
  }, []);

  const requestCategoryDelete = useCallback((categoryId: string, name: string) => {
    setDeleteTarget({ type: 'category', categoryId, name });
  }, []);

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
      ? DIALOG_MESSAGES.delete.document
      : DIALOG_MESSAGES.delete.category(deleteTarget.name)
    : '';

  const deleteDialogSubMessage = deleteTarget?.type === 'category'
    ? DIALOG_MESSAGES.delete.categorySubMessage
    : undefined;

  return {
    deleteTarget,
    deleteDialogMessage,
    deleteDialogSubMessage,
    requestDocumentDelete,
    requestCategoryDelete,
    confirmDelete,
    cancelDelete,
  };
};
