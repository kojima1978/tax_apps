import { ResetConfirmDialog, ImportConfirmDialog, DeleteConfirmDialog, ImportErrorDialog } from '@/components/ui/ConfirmDialog';
import type { ExportData } from '@/hooks/useJsonImportExport';

type DialogsProps = {
  showResetDialog: boolean;
  onResetConfirm: () => void;
  onResetCancel: () => void;
  showImportDialog: boolean;
  importPreview: ExportData | null;
  onImportConfirm: () => void;
  onImportCancel: () => void;
  hasDeleteTarget: boolean;
  deleteDialogMessage: string;
  deleteDialogSubMessage?: string;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  importError: boolean;
  onDismissImportError: () => void;
};

export const Dialogs = ({
  showResetDialog,
  onResetConfirm,
  onResetCancel,
  showImportDialog,
  importPreview,
  onImportConfirm,
  onImportCancel,
  hasDeleteTarget,
  deleteDialogMessage,
  deleteDialogSubMessage,
  onDeleteConfirm,
  onDeleteCancel,
  importError,
  onDismissImportError,
}: DialogsProps) => (
  <>
    {showResetDialog && (
      <ResetConfirmDialog onConfirm={onResetConfirm} onCancel={onResetCancel} />
    )}
    {showImportDialog && importPreview && (
      <ImportConfirmDialog preview={importPreview} onConfirm={onImportConfirm} onCancel={onImportCancel} />
    )}
    {hasDeleteTarget && (
      <DeleteConfirmDialog
        message={deleteDialogMessage}
        subMessage={deleteDialogSubMessage}
        onConfirm={onDeleteConfirm}
        onCancel={onDeleteCancel}
      />
    )}
    {importError && (
      <ImportErrorDialog onDismiss={onDismissImportError} />
    )}
  </>
);
