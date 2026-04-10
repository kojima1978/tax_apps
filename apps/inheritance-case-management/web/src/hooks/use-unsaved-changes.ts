"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * フォームの未保存変更を検知し、ブラウザ離脱時に警告を表示するフック
 */
export function useUnsavedChanges<T>(currentData: T) {
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(currentData));
  const baselineRef = useRef(baseline);
  baselineRef.current = baseline;

  const isDirty = JSON.stringify(currentData) !== baseline;

  // ベースラインをリセット（保存成功後に呼ぶ）
  const resetBaseline = useCallback((newData: T) => {
    const serialized = JSON.stringify(newData);
    setBaseline(serialized);
    baselineRef.current = serialized;
  }, []);

  // ブラウザ離脱警告（タブを閉じる・リロード時）
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return { isDirty, resetBaseline };
}
