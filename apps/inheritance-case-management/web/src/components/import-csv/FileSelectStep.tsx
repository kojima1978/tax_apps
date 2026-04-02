import { useRef, useState, type DragEvent } from "react";
import { Upload, AlertTriangle, Download } from "lucide-react";
import { downloadCSVTemplate } from "@/lib/export-csv";
import { CASE_STATUS_OPTIONS, ACCEPTANCE_STATUS_OPTIONS } from "@/types/constants";

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

const GUIDE_SECTIONS = [
  { items: FIELD_GUIDE.required, label: "必須項目（最低限これだけでOK）", labelClass: "text-red-600", noteClass: "text-red-600" },
  { items: FIELD_GUIDE.withDefaults, label: "任意（空欄ならデフォルト値）", labelClass: "text-sky-600", noteClass: "" },
  { items: FIELD_GUIDE.optional, label: "任意", labelClass: "text-muted-foreground", noteClass: "" },
] as const;

interface FileSelectStepProps {
  fileError: string | null;
  onFileSelect: (file: File) => void;
}

export function FileSelectStep({ fileError, onFileSelect }: FileSelectStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/50"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
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
          {GUIDE_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className={`font-medium ${section.labelClass} mb-0.5`}>{section.label}</p>
              {section.items.map((f) => (
                <div key={f.name} className="flex justify-between gap-2 text-muted-foreground">
                  <span>{f.name}</span>
                  <span className={`${section.noteClass} shrink-0`}>{f.note}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </details>
      {fileError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {fileError}
        </div>
      )}
    </div>
  );
}
