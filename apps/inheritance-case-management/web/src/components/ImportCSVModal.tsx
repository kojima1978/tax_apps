"use client";

import { useRef, useState, type DragEvent } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import {
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  RefreshCw,
  Square,
  Download,
  Info,
} from "lucide-react";
import { useImportCSV } from "@/hooks/use-import-csv";
import { downloadCSVTemplate } from "@/lib/export-csv";
import { DEFAULTABLE_FIELDS } from "@/lib/import-csv";
import { CASE_STATUS_OPTIONS, ACCEPTANCE_STATUS_OPTIONS } from "@/types/constants";

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const FIELD_GUIDE = {
  required: [
    { name: "被相続人氏名", note: "必須" },
    { name: "死亡日", note: "必須 / YYYY-MM-DD形式" },
    { name: "年度", note: "必須 / 2000〜2100" },
  ],
  withDefaults: [
    { name: "進み具合", note: CASE_STATUS_OPTIONS.join(" / ") },
    { name: "対応状況", note: "対応中 / 対応終了 / 未分割" },
    { name: "受託状況", note: ACCEPTANCE_STATUS_OPTIONS.join(" / ") },
    { name: "財産評価額・相続税額・見積額・報酬額", note: "0以上の整数" },
  ],
  optional: [
    { name: "担当者_氏名 / _部署名", note: "未登録なら自動作成" },
    { name: "紹介者_会社名 / _氏名 / _部署名", note: "未登録なら自動作成" },
    { name: "紹介料率(%)・紹介料", note: "任意" },
    { name: "連絡先N_氏名/電話/メール", note: "最大10件" },
    { name: "ID", note: "既存案件の更新時のみ" },
  ],
} as const;

const PREVIEW_COLUMNS = [
  { key: "mode", label: "モード" },
  { key: "deceasedName", label: "被相続人氏名" },
  { key: "dateOfDeath", label: "死亡日" },
  { key: "fiscalYear", label: "年度" },
  { key: "status", label: "進み具合" },
] as const;

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

  const newCount =
    parseResult?.validRows.filter((r) => r.mode === "create").length ?? 0;
  const updateCount =
    parseResult?.validRows.filter((r) => r.mode === "update").length ?? 0;

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
            <p className="text-xs text-muted-foreground mt-0.5">
              ID列あり→既存案件を更新 / ID列なし→新規作成
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={onFileChange}
            className="hidden"
          />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                downloadCSVTemplate();
              }}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              テンプレートCSVをダウンロード
            </button>
          </div>
          <details className="text-xs border rounded-lg">
            <summary className="px-3 py-2 cursor-pointer font-medium text-muted-foreground hover:text-foreground select-none">
              項目ガイド（必須・任意の一覧）
            </summary>
            <div className="px-3 pb-3 space-y-2">
              <div>
                <p className="font-medium text-red-600 mb-0.5">必須項目（最低限これだけでOK）</p>
                {FIELD_GUIDE.required.map((f) => (
                  <div key={f.name} className="flex justify-between gap-2 text-muted-foreground">
                    <span>{f.name}</span>
                    <span className="text-red-600 shrink-0">{f.note}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="font-medium text-sky-600 mb-0.5">任意（空欄ならデフォルト値）</p>
                {FIELD_GUIDE.withDefaults.map((f) => (
                  <div key={f.name} className="flex justify-between gap-2 text-muted-foreground">
                    <span>{f.name}</span>
                    <span className="shrink-0">{f.note}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="font-medium text-muted-foreground mb-0.5">任意</p>
                {FIELD_GUIDE.optional.map((f) => (
                  <div key={f.name} className="flex justify-between gap-2 text-muted-foreground">
                    <span>{f.name}</span>
                    <span className="shrink-0">{f.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </details>
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
          {/* サマリーバッジ */}
          <div className="flex flex-wrap gap-2 text-sm">
            {newCount > 0 && (
              <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
                新規作成: {newCount}件
              </div>
            )}
            {updateCount > 0 && (
              <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg">
                <RefreshCw className="h-4 w-4" />
                更新: {updateCount}件
              </div>
            )}
            {parseResult.errors.length > 0 && (
              <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg">
                <XCircle className="h-4 w-4" />
                エラー: {parseResult.errors.length}件
              </div>
            )}
            {parseResult.warnings.length > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                警告: {parseResult.warnings.length}件
              </div>
            )}
          </div>

          {/* デフォルト値通知 */}
          {parseResult.validRows.some((r) => r.defaultedFields.length > 0) && (
            <div className="flex items-start gap-2 text-xs bg-sky-50 text-sky-700 border border-sky-200 p-2.5 rounded-lg">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">空欄の項目にデフォルト値が適用されます:</p>
                <p className="mt-0.5">
                  {[...new Set(
                    parseResult.validRows.flatMap((r) =>
                      r.defaultedFields.map((f) => DEFAULTABLE_FIELDS[f])
                    )
                  )].join("、")}
                </p>
              </div>
            </div>
          )}

          {/* データプレビュー */}
          {parseResult.validRows.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">
                プレビュー（先頭
                {Math.min(5, parseResult.validRows.length)}件）
              </h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      {PREVIEW_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className="px-2 py-1.5 text-left font-medium whitespace-nowrap"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.validRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t">
                        {PREVIEW_COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            className="px-2 py-1.5 whitespace-nowrap"
                          >
                            {col.key === "mode" ? (
                              row.mode === "update" ? (
                                <span className="text-blue-600 font-medium">
                                  更新
                                </span>
                              ) : (
                                <span className="text-green-600 font-medium">
                                  新規
                                </span>
                              )
                            ) : (
                              String(
                                (row.data as Record<string, unknown>)[
                                  col.key
                                ] ?? ""
                              )
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 警告 */}
          {parseResult.warnings.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 text-amber-700">警告</h3>
              <div className="max-h-32 overflow-y-auto border border-amber-200 rounded-lg bg-amber-50 p-2 space-y-1">
                {parseResult.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-700">
                    {w.row > 0 ? `${w.row}行目: ` : ""}
                    {w.message}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* エラー詳細 */}
          {parseResult.errors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 text-red-700">
                エラー行
              </h3>
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
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={abortImport}>
              <Square className="mr-1.5 h-3 w-3" />
              中止
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: 完了 */}
      {step === "done" && importResult && (
        <div className="space-y-4">
          <div className="text-center py-2">
            {importResult.failed === 0 && importResult.skipped === 0 ? (
              <CheckCircle2 className="h-10 w-10 mx-auto text-green-600 mb-2" />
            ) : (
              <AlertTriangle className="h-10 w-10 mx-auto text-amber-500 mb-2" />
            )}
            <p className="text-sm font-medium">
              {importResult.skipped > 0 ? "取り込み中止" : "取り込み完了"}
            </p>
            <div className="text-sm text-muted-foreground mt-1 flex flex-wrap justify-center gap-x-3">
              {importResult.createdCount > 0 && (
                <span className="text-green-600">
                  新規: {importResult.createdCount}件
                </span>
              )}
              {importResult.updatedCount > 0 && (
                <span className="text-blue-600">
                  更新: {importResult.updatedCount}件
                </span>
              )}
              {importResult.failed > 0 && (
                <span className="text-red-600">
                  失敗: {importResult.failed}件
                </span>
              )}
              {importResult.skipped > 0 && (
                <span className="text-gray-500">
                  スキップ: {importResult.skipped}件
                </span>
              )}
            </div>
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
