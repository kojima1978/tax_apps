import { useState, useCallback } from 'react';
import type { EditableDocumentList, DocListType } from '@/constants';
import { initializeEditableList } from '@/utils/editableListUtils';
import { useDocumentEditing } from './useDocumentEditing';
import { useCategoryEditing } from './useCategoryEditing';
import { useDeleteConfirm } from './useDeleteConfirm';
import { useJsonImportExport } from './useJsonImportExport';

// Re-export types for consumers
export type { DocHandlers, SubItemEditState, SubItemHandlers } from './useDocumentEditing';

type SetDocumentList = React.Dispatch<React.SetStateAction<EditableDocumentList>>;

type UseEditableListEditingArgs = {
  documentList: EditableDocumentList;
  setDocumentList: SetDocumentList;
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
  // === 削除確認 ===
  const deleteConfirm = useDeleteConfirm(setDocumentList);

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
    // JSON入出力
    ...jsonIO,
    // リセット
    showResetDialog,
    setShowResetDialog,
    handleResetToDefault,
  };
};
