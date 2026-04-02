"use client";

import { Modal } from "./ui/Modal";
import { useImportCSV } from "@/hooks/use-import-csv";
import { FileSelectStep } from "./import-csv/FileSelectStep";
import { PreviewStep } from "./import-csv/PreviewStep";
import { ImportingStep } from "./import-csv/ImportingStep";
import { DoneStep } from "./import-csv/DoneStep";

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function ImportCSVModal({
  isOpen,
  onClose,
  onImportComplete,
}: ImportCSVModalProps) {
  const {
    step,
    parseResult,
    fileError,
    importResult,
    progress,
    handleFileSelect,
    executeImport,
    abortImport,
    reset,
  } = useImportCSV();

  const handleClose = () => {
    if (step === "done" && importResult && importResult.success > 0) {
      onImportComplete();
    }
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="CSV取り込み">
      {step === "select" && (
        <FileSelectStep fileError={fileError} onFileSelect={handleFileSelect} />
      )}

      {step === "preview" && parseResult && (
        <PreviewStep
          parseResult={parseResult}
          onReset={reset}
          onExecute={executeImport}
        />
      )}

      {step === "importing" && parseResult && (
        <ImportingStep
          progress={progress}
          total={parseResult.validRows.length}
          onAbort={abortImport}
        />
      )}

      {step === "done" && importResult && (
        <DoneStep importResult={importResult} onClose={handleClose} />
      )}
    </Modal>
  );
}
