import { useState, useCallback } from 'react';
import type { EditableDocumentList } from '@/constants';
import { removeDocument, removeCategory } from '@/utils/editableListUtils';

type DeleteTarget =
  | { type: 'document'; categoryId: string; docId: string }
  | { type: 'category'; categoryId: string; name: string }
  | { type: 'specificName'; categoryId: string; documentId: string; nameId: string };

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
    } else if (deleteTarget.type === 'category') {
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
      : deleteTarget.type === 'category'
        ? `「${deleteTarget.name}」を削除しますか？`
        : ''
    : '';

  const deleteDialogSubMessage = deleteTarget?.type === 'category'
    ? '含まれる書類もすべて削除されます。'
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
