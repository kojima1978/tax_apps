import { AlertCircle, RefreshCw, WifiOff, ServerCrash } from "lucide-react";
import { Button } from "./Button";
import type { ErrorInfo } from "@/hooks/use-error-handler";

interface ErrorDisplayProps {
  error: ErrorInfo | string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorDisplay({ error, onRetry, compact = false }: ErrorDisplayProps) {
  const errorInfo: ErrorInfo =
    typeof error === "string"
      ? {
          message: error,
          code: "UNKNOWN_ERROR",
          isNetworkError: false,
          isNotFound: false,
          isValidationError: false,
          isServerError: false,
        }
      : error;

  const Icon = errorInfo.isNetworkError
    ? WifiOff
    : errorInfo.isServerError
    ? ServerCrash
    : AlertCircle;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <Icon className="h-4 w-4" />
        <span>{errorInfo.message}</span>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} className="h-6 px-2">
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <Icon className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="font-semibold text-lg mb-2">
        {errorInfo.isNetworkError
          ? "接続エラー"
          : errorInfo.isServerError
          ? "サーバーエラー"
          : errorInfo.isNotFound
          ? "データが見つかりません"
          : "エラーが発生しました"}
      </h3>
      <p className="text-muted-foreground mb-4 max-w-md">{errorInfo.message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          再試行
        </Button>
      )}
    </div>
  );
}
