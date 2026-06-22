import { useState, useCallback, useRef } from 'react';
import { TRASH_LIMIT, type EditableDocumentList, type DocListType, type Trash, type TrashItem } from '@/constants';
import {
  initializeEditableList,
  restoreDocumentToList,
  restoreCategoryToList,
} from '@/utils/editableListUtils';
import { useDocumentEditing } from './useDocumentEditing';
import { useCategoryEditing } from './useCategoryEditing';
import { useDeleteConfirm } from './useDeleteConfirm';
import { useJsonImportExport } from './useJsonImportExport';

// Re-export types for consumers
export type { DocHandlers, SubItemEditState, SubItemHandlers } from './useDocumentEditing';

type SetDocumentList = React.Dispatch<React.SetStateAction<EditableDocumentList>>;
type SetTrash = React.Dispatch<React.SetStateAction<Trash>>;

type UseEditableListEditingArgs = {
  documentList: EditableDocumentList;
  setDocumentList: SetDocumentList;
  trash: Trash;
  setTrash: SetTrash;
  clientName: string;
  setClientName: (name: string) => void;
  deceasedName: string;
  setDeceasedName: (name: string) => void;
  personInCharge: string;
  setPersonInCharge: (name: string) => void;
  personInChargeContact: string;
  setPersonInChargeContact: (contact: string) => void;
  docListType: DocListType;
};

export const useEditableListEditing = ({
  documentList,
  setDocumentList,
  trash,
  setTrash,
  clientName,
  setClientName,
  deceasedName,
  setDeceasedName,
  personInCharge,
  setPersonInCharge,
  personInChargeContact,
  setPersonInChargeContact,
  docListType,
}: UseEditableListEditingArgs) => {
  // === ゴミ箱（復元用） ===
  // trashの最新値をrefで保持（Undo通知のクロージャが古いtrashを参照しないように）
  const trashRef = useRef(trash);
  trashRef.current = trash;

  const pushToTrash = useCallback((item: TrashItem) => {
    setTrash(prev => [item, ...prev].slice(0, TRASH_LIMIT));
  }, [setTrash]);

  const restoreFromTrash = useCallback((trashId: string) => {
    const item = trashRef.current.find(t => t.trashId === trashId);
    if (!item) return;
    if (item.kind === 'document') {
      setDocumentList(list => restoreDocumentToList(list, item));
    } else {
      setDocumentList(list => restoreCategoryToList(list, item));
    }
    setTrash(prev => prev.filter(t => t.trashId !== trashId));
  }, [setDocumentList, setTrash]);

  const restoreAllFromTrash = useCallback(() => {
    // 古いものから順に復元して元の位置をできるだけ保つ
    [...trashRef.current].reverse().forEach(item => {
      if (item.kind === 'document') {
        setDocumentList(list => restoreDocumentToList(list, item));
      } else {
        setDocumentList(list => restoreCategoryToList(list, item));
      }
    });
    setTrash([]);
  }, [setDocumentList, setTrash]);

  const removeFromTrash = useCallback((trashId: string) => {
    setTrash(prev => prev.filter(t => t.trashId !== trashId));
  }, [setTrash]);

  const clearTrash = useCallback(() => {
    setTrash([]);
  }, [setTrash]);

  // === 削除確認 ===
  const deleteConfirm = useDeleteConfirm(documentList, setDocumentList, pushToTrash);

  // === 書類編集 ===
  const docEditing = useDocumentEditing(setDocumentList, deleteConfirm.requestDocumentDelete);

  // === カテゴリ編集 ===
  const catEditing = useCategoryEditing(
    documentList,
    setDocumentList,
    deleteConfirm.requestCategoryDelete,
  );

  // === JSON入出力 ===
  const jsonIO = useJsonImportExport({
    documentList,
    setDocumentList,
    trash,
    setTrash,
    clientName,
    setClientName,
    deceasedName,
    setDeceasedName,
    personInCharge,
    setPersonInCharge,
    personInChargeContact,
    setPersonInChargeContact,
    docListType,
  });

  // === リセット ===
  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleResetToDefault = useCallback(() => {
    setDocumentList(initializeEditableList(docListType));
    setShowResetDialog(false);
  }, [setDocumentList, docListType]);

  return {
    // 書類編集
    ...docEditing,
    // カテゴリ編集
    ...catEditing,
    // 削除確認
    deleteTarget: deleteConfirm.deleteTarget,
    deleteDialogMessage: deleteConfirm.deleteDialogMessage,
    deleteDialogSubMessage: deleteConfirm.deleteDialogSubMessage,
    confirmDelete: deleteConfirm.confirmDelete,
    cancelDelete: deleteConfirm.cancelDelete,
    // ゴミ箱（復元）
    restoreFromTrash,
    restoreAllFromTrash,
    removeFromTrash,
    clearTrash,
    // JSON入出力
    ...jsonIO,
    // リセット
    showResetDialog,
    setShowResetDialog,
    handleResetToDefault,
  };
};
