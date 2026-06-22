import { useState, useCallback, useRef } from 'react';
import type { EditableDocumentList, TrashItem } from '@/constants';
import {
  removeDocument,
  removeCategory,
  makeTrashedDocument,
  makeTrashedCategory,
} from '@/utils/editableListUtils';

type DeleteTarget =
  | { type: 'document'; categoryId: string; docId: string }
  | { type: 'category'; categoryId: string; name: string }
  | { type: 'specificName'; categoryId: string; documentId: string; nameId: string };

type SetDocumentList = React.Dispatch<React.SetStateAction<EditableDocumentList>>;

export const useDeleteConfirm = (
  documentList: EditableDocumentList,
  setDocumentList: SetDocumentList,
  pushToTrash: (item: TrashItem) => void,
) => {
  // documentListの最新値をrefで保持（削除直前のリストからゴミ箱エントリを生成するため）
  const listRef = useRef(documentList);
  listRef.current = documentList;

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const requestDocumentDelete = useCallback((categoryId: string, docId: string) => {
    setDeleteTarget({ type: 'document', categoryId, docId });
  }, []);

  const requestCategoryDelete = useCallback((categoryId: string, name: string) => {
    setDeleteTarget({ type: 'category', categoryId, name });
  }, []);

  // 削除を確定。退避したゴミ箱エントリを返す（Undo通知用）
  const confirmDelete = useCallback((): TrashItem | null => {
    if (!deleteTarget) return null;
    let trashed: TrashItem | null = null;

    if (deleteTarget.type === 'document') {
      trashed = makeTrashedDocument(listRef.current, deleteTarget.categoryId, deleteTarget.docId);
      if (trashed) pushToTrash(trashed);
      setDocumentList(prev => removeDocument(prev, deleteTarget.categoryId, deleteTarget.docId));
    } else if (deleteTarget.type === 'category') {
      trashed = makeTrashedCategory(listRef.current, deleteTarget.categoryId);
      if (trashed) pushToTrash(trashed);
      setDocumentList(prev => removeCategory(prev, deleteTarget.categoryId));
    }

    setDeleteTarget(null);
    return trashed;
  }, [deleteTarget, setDocumentList, pushToTrash]);

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
    ? '含まれる書類もすべて削除されます。（ゴミ箱から復元できます）'
    : deleteTarget?.type === 'document'
      ? 'ゴミ箱から復元できます。'
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
