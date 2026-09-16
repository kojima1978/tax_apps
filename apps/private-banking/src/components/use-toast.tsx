"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; message: string; action?: ToastAction; durationMs: number };

const DEFAULT_DURATION_MS = 4_000;

/**
 * 保存・削除の結果を画面下に出す短い通知。スクロール位置に関係なく見えるよう固定表示にする。
 * 同時に出すのは1件だけで、新しい通知は古い通知を置き換える。
 */
export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, options: { action?: ToastAction; durationMs?: number } = {}) => {
    setToast({ id: Date.now() + Math.random(), message, action: options.action, durationMs: options.durationMs ?? DEFAULT_DURATION_MS });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast((current) => current?.id === toast.id ? null : current), toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return { toast, showToast, dismissToast };
}

/**
 * 通知の表示領域。成功通知（`toast`）とエラー（`error`）を同じ場所に出す。
 * エラーは読み飛ばされないよう自動では消さず、閉じるまで残す。
 */
export function ToastRegion({ toast, error, onDismissToast, onDismissError }: {
  toast: Toast | null;
  error?: string;
  onDismissToast: () => void;
  onDismissError?: () => void;
}) {
  return <div className="toast-region">
    {error ? <div className="toast toast-error" role="alert"><AlertTriangle /><span>{error}</span>{onDismissError ? <button type="button" className="toast-close" onClick={onDismissError} aria-label="エラーを閉じる"><X /></button> : null}</div> : null}
    <div role="status" aria-live="polite">
      {toast ? <div className="toast toast-success" key={toast.id}><CheckCircle2 /><span>{toast.message}</span>
        {toast.action ? <button type="button" className="toast-action" onClick={() => { toast.action?.onClick(); onDismissToast(); }}>{toast.action.label}</button> : null}
        <button type="button" className="toast-close" onClick={onDismissToast} aria-label="通知を閉じる"><X /></button>
      </div> : null}
    </div>
  </div>;
}
