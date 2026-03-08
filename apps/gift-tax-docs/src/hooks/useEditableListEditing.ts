import { useState, useCallback } from 'react';
import type { EditableDocumentList } from '@/constants';
import { initializeEditableList } from '@/utils/editableListUtils';
import { useDocumentEditing } from './useDocumentEditing';
import { useSubItemEditing } from './useSubItemEditing';
import { useCategoryEditing } from './useCategoryEditing';
import { useDeleteConfirm } from './useDeleteConfirm';
import { useJsonImportExport } from './useJsonImportExport';

// Re-export types for consumers
export type { DocHandlers } from './useDocumentEditing';
export type { EditingSubItem, AddingSubItemTo, SubItemHandlers } from './useSubItemEditing';

type SetDocumentList = React.Dispatch<React.SetStateAction<EditableDocumentList>>;

type UseEditableListEditingArgs = {
  documentList: EditableDocumentList;
  setDocumentList: SetDocumentList;
  staffName: string;
  setStaffName: (name: string) => void;
  staffPhone: string;
  setStaffPhone: (phone: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  deadline: string;
  setDeadline: (v: string) => void;
};

export const useEditableListEditing = ({
  documentList,
  setDocumentList,
  staffName,
  setStaffName,
  staffPhone,
  setStaffPhone,
  customerName,
  setCustomerName,
  deadline,
  setDeadline,
}: UseEditableListEditingArgs) => {
  // === 削除確認 ===
  const deleteConfirm = useDeleteConfirm(setDocumentList);

  // === 書類編集 ===
  const docEditing = useDocumentEditing(setDocumentList, deleteConfirm.requestDocumentDelete);

  // === 中項目編集 ===
  const subItemEditing = useSubItemEditing(setDocumentList);

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
    staffName,
    setStaffName,
    staffPhone,
    setStaffPhone,
    customerName,
    setCustomerName,
    deadline,
    setDeadline,
  });

  // === リセット ===
  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleResetToDefault = useCallback(() => {
    setDocumentList(initializeEditableList());
    setShowResetDialog(false);
  }, [setDocumentList]);

  return {
    // 書類編集
    ...docEditing,
    // 中項目編集
    ...subItemEditing,
    // カテゴリ編集
    ...catEditing,
    // 削除確認（internal request関数は非公開）
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
