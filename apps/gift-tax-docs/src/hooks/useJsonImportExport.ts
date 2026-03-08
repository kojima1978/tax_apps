import { useState, useCallback } from 'react';
import type { EditableDocumentList } from '@/constants';
import type { ExportData } from '@/utils/jsonExportImport';
import { exportToJson, readJsonFile } from '@/utils/jsonExportImport';

type SetDocumentList = React.Dispatch<React.SetStateAction<EditableDocumentList>>;

type UseJsonImportExportArgs = {
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

export const useJsonImportExport = ({
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
}: UseJsonImportExportArgs) => {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importPreview, setImportPreview] = useState<ExportData | null>(null);
  const [importError, setImportError] = useState(false);

  const handleJsonExport = useCallback(() => {
    exportToJson(documentList, staffName, staffPhone, customerName, deadline);
  }, [documentList, staffName, staffPhone, customerName, deadline]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await readJsonFile(file);
    if (data) {
      setImportPreview(data);
      setShowImportDialog(true);
    } else {
      setImportError(true);
    }

    e.target.value = '';
  }, []);

  const confirmImport = useCallback(() => {
    if (importPreview) {
      setDocumentList(importPreview.documentList);
      if (importPreview.staffName) setStaffName(importPreview.staffName);
      if (importPreview.staffPhone) setStaffPhone(importPreview.staffPhone);
      if (importPreview.customerName) setCustomerName(importPreview.customerName);
      setDeadline(importPreview.deadline || '');
      setShowImportDialog(false);
      setImportPreview(null);
    }
  }, [importPreview, setDocumentList, setStaffName, setStaffPhone, setCustomerName, setDeadline]);

  const cancelImport = useCallback(() => {
    setShowImportDialog(false);
    setImportPreview(null);
  }, []);

  const dismissImportError = useCallback(() => {
    setImportError(false);
  }, []);

  return {
    showImportDialog,
    importPreview,
    importError,
    handleJsonExport,
    handleFileSelect,
    confirmImport,
    cancelImport,
    dismissImportError,
  };
};
