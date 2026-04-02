import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "../ui/Button";
import type { ImportResult } from "@/hooks/use-import-csv";

interface DoneStepProps {
  importResult: ImportResult;
  onClose: () => void;
}

const RESULT_ITEMS = [
  { key: "createdCount", label: "新規", colorClass: "text-green-600" },
  { key: "updatedCount", label: "更新", colorClass: "text-blue-600" },
  { key: "failed", label: "失敗", colorClass: "text-red-600" },
  { key: "skipped", label: "スキップ", colorClass: "text-gray-500" },
] as const;

export function DoneStep({ importResult, onClose }: DoneStepProps) {
  const isClean = importResult.failed === 0 && importResult.skipped === 0;

  return (
    <div className="space-y-4">
      <div className="text-center py-2">
        {isClean ? (
          <CheckCircle2 className="h-10 w-10 mx-auto text-green-600 mb-2" />
        ) : (
          <AlertTriangle className="h-10 w-10 mx-auto text-amber-500 mb-2" />
        )}
        <p className="text-sm font-medium">
          {importResult.skipped > 0 ? "取り込み中止" : "取り込み完了"}
        </p>
        <div className="text-sm text-muted-foreground mt-1 flex flex-wrap justify-center gap-x-3">
          {RESULT_ITEMS.map(({ key, label, colorClass }) => {
            const count = importResult[key];
            if (count === 0) return null;
            return (
              <span key={key} className={colorClass}>
                {label}: {count}件
              </span>
            );
          })}
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
        <Button size="sm" onClick={onClose}>閉じる</Button>
      </div>
    </div>
  );
}
