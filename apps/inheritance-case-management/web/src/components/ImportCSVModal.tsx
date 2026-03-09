"use client";

import { useRef, useState, type DragEvent } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Upload, AlertTriangle, CheckCircle2, XCircle, FileText } from "lucide-react";
import { useImportCSV } from "@/hooks/use-import-csv";

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const PREVIEW_COLUMNS = [
  { key: "deceasedName", label: "被相続人氏名" },
  { key: "dateOfDeath", label: "死亡日" },
  { key: "fiscalYear", label: "年度" },
  { key: "status", label: "ステータス" },
  { key: "assignee", label: "担当者" },
] as const;

export function ImportCSVModal({ isOpen, onClose, onImportComplete }: ImportCSVModalProps) {
  const {
    step,
    parseResult,
    fileError,
    importResult,
    progress,
    handleFileSelect,
    executeImport,
    reset,
  } = useImportCSV();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleClose = () => {
    if (step === "done" && importResult && importResult.success > 0) {
      onImportComplete();
    }
    reset();
    onClose();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // input をリセットして同じファイル再選択可能に
    e.target.value = "";
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="CSV取り込み">
      {/* Step 1: ファイル選択 */}
      {step === "select" && (
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/30 hover:border-primary/50"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium">
              クリックまたはドラッグ＆ドロップでCSVファイルを選択
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              CSV出力と同じ形式 / 最大5MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={onFileChange}
            className="hidden"
          />
          {fileError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {fileError}
            </div>
          )}
        </div>
      )}

      {/* Step 2: プレビュー */}
      {step === "preview" && parseResult && (
        <div className="space-y-4">
          {/* サマリー */}
          <div className="flex gap-3 text-sm">
            <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
              取り込み可能: {parseResult.validRows.length}件
            </div>
            {parseResult.errors.length > 0 && (
              <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg">
                <XCircle className="h-4 w-4" />
                エラー: {parseResult.errors.length}件
              </div>
            )}
          </div>

          {/* データプレビュー */}
          {parseResult.validRows.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">
                プレビュー（先頭{Math.min(5, parseResult.validRows.length)}件）
              </h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      {PREVIEW_COLUMNS.map((col) => (
                        <th key={col.key} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.validRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t">
                        {PREVIEW_COLUMNS.map((col) => (
                          <td key={col.key} className="px-2 py-1.5 whitespace-nowrap">
                            {String(row[col.key] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* エラー詳細 */}
          {parseResult.errors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 text-red-700">エラー行</h3>
              <div className="max-h-32 overflow-y-auto border border-red-200 rounded-lg bg-red-50 p-2 space-y-1">
                {parseResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-700">
                    {err.row > 0 ? `${err.row}行目: ` : ""}
                    {err.message}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* アクション */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={reset}>
              戻る
            </Button>
            <Button
              size="sm"
              onClick={executeImport}
              disabled={parseResult.validRows.length === 0}
            >
              <FileText className="mr-1.5 h-4 w-4" />
              {parseResult.validRows.length}件を取り込む
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: 取り込み中 */}
      {step === "importing" && parseResult && (
        <div className="space-y-4 py-4">
          <p className="text-sm text-center">
            取り込み中... {progress} / {parseResult.validRows.length}件
          </p>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full transition-all"
              style={{
                width: `${(progress / parseResult.validRows.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Step 4: 完了 */}
      {step === "done" && importResult && (
        <div className="space-y-4">
          <div className="text-center py-2">
            {importResult.failed === 0 ? (
              <CheckCircle2 className="h-10 w-10 mx-auto text-green-600 mb-2" />
            ) : (
              <AlertTriangle className="h-10 w-10 mx-auto text-amber-500 mb-2" />
            )}
            <p className="text-sm font-medium">
              取り込み完了
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              成功: {importResult.success}件
              {importResult.failed > 0 && (
                <span className="text-red-600"> / 失敗: {importResult.failed}件</span>
              )}
            </p>
          </div>

          {importResult.failedRows.length > 0 && (
            <div className="max-h-32 overflow-y-auto border border-red-200 rounded-lg bg-red-50 p-2 space-y-1">
              {importResult.failedRows.map((row, i) => (
                <p key={i} className="text-xs text-red-700">
                  {row.index}番目「{row.deceasedName}」: {row.error}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={handleClose}>
              閉じる
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
