import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Info, FileText } from "lucide-react";
import { Button } from "../ui/Button";
import type { ImportParseResult } from "@/lib/import";
import { DEFAULTABLE_FIELDS } from "@/lib/import";

const PREVIEW_COLUMNS = [
  { key: "mode", label: "モード" },
  { key: "deceasedName", label: "被相続人氏名" },
  { key: "dateOfDeath", label: "死亡日" },
  { key: "fiscalYear", label: "年度" },
  { key: "status", label: "進み具合" },
] as const;

const SUMMARY_BADGES = [
  { countKey: "new", icon: CheckCircle2, bgClass: "bg-green-50 text-green-700", labelFn: (n: number) => `新規作成: ${n}件` },
  { countKey: "update", icon: RefreshCw, bgClass: "bg-blue-50 text-blue-700", labelFn: (n: number) => `更新: ${n}件` },
  { countKey: "errors", icon: XCircle, bgClass: "bg-red-50 text-red-700", labelFn: (n: number) => `エラー: ${n}件` },
  { countKey: "warnings", icon: AlertTriangle, bgClass: "bg-amber-50 text-amber-700", labelFn: (n: number) => `警告: ${n}件` },
] as const;

interface PreviewStepProps {
  parseResult: ImportParseResult;
  onReset: () => void;
  onExecute: () => void;
}

export function PreviewStep({ parseResult, onReset, onExecute }: PreviewStepProps) {
  const newCount = parseResult.validRows.filter((r) => r.mode === "create").length;
  const updateCount = parseResult.validRows.filter((r) => r.mode === "update").length;

  const counts: Record<string, number> = {
    new: newCount,
    update: updateCount,
    errors: parseResult.errors.length,
    warnings: parseResult.warnings.length,
  };

  return (
    <div className="space-y-4">
      {/* サマリーバッジ */}
      <div className="flex flex-wrap gap-2 text-sm">
        {SUMMARY_BADGES.map(({ countKey, icon: Icon, bgClass, labelFn }) => {
          const count = counts[countKey];
          if (count === 0) return null;
          return (
            <div key={countKey} className={`flex items-center gap-1.5 ${bgClass} px-3 py-1.5 rounded-lg`}>
              <Icon className="h-4 w-4" />
              {labelFn(count)}
            </div>
          );
        })}
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
                        {col.key === "mode" ? (
                          row.mode === "update" ? (
                            <span className="text-blue-600 font-medium">更新</span>
                          ) : (
                            <span className="text-green-600 font-medium">新規</span>
                          )
                        ) : (
                          String((row.data as Record<string, unknown>)[col.key] ?? "")
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
                {w.row > 0 ? `${w.row}行目: ` : ""}{w.message}
              </p>
            ))}
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
                {err.row > 0 ? `${err.row}行目: ` : ""}{err.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* アクション */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onReset}>戻る</Button>
        <Button size="sm" onClick={onExecute} disabled={parseResult.validRows.length === 0}>
          <FileText className="mr-1.5 h-4 w-4" />
          {parseResult.validRows.length}件を取り込む
        </Button>
      </div>
    </div>
  );
}
