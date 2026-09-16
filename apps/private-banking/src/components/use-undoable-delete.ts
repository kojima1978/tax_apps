"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 「元に戻す」付きの削除。削除を選んだ時点では画面から隠すだけにして、猶予時間が過ぎてから実際に削除する。
 * 削除してから作り直す方式だと ID や並び順が変わってしまうため、取り消しは「まだ削除しない」ことで実現する。
 * 猶予中に次の削除を選んだら前の分はその場で確定し、画面を離れるときは keepalive の送信で確定させる。
 */
export function useUndoableDelete<T extends { id: number }>({ delayMs, commit, commitOnUnload }: {
  delayMs: number;
  /** 猶予時間が過ぎたときの削除。失敗したら明細は画面に戻る。 */
  commit: (item: T) => Promise<void>;
  /** 画面を離れるときの削除。応答を待てないので送るだけにする。 */
  commitOnUnload: (item: T) => void;
}) {
  const [pending, setPending] = useState<T | null>(null);
  const pendingRef = useRef<T | null>(null);
  const timerRef = useRef<number | null>(null);
  const handlersRef = useRef({ commit, commitOnUnload });
  useEffect(() => { handlersRef.current = { commit, commitOnUnload }; });

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const flush = useCallback(async () => {
    const item = pendingRef.current;
    if (!item) return;
    clearTimer();
    pendingRef.current = null;
    await handlersRef.current.commit(item);
    // 確定を待つ間に別の明細の削除が始まっていたら、そちらの表示は残す。
    setPending((current) => current?.id === item.id ? null : current);
  }, []);

  const schedule = useCallback((item: T) => {
    void flush();
    pendingRef.current = item;
    setPending(item);
    timerRef.current = window.setTimeout(() => void flush(), delayMs);
  }, [delayMs, flush]);

  const undo = useCallback(() => {
    clearTimer();
    pendingRef.current = null;
    setPending(null);
  }, []);

  useEffect(() => {
    const commitNow = () => {
      const item = pendingRef.current;
      if (!item) return;
      clearTimer();
      pendingRef.current = null;
      handlersRef.current.commitOnUnload(item);
    };
    window.addEventListener("pagehide", commitNow);
    return () => {
      window.removeEventListener("pagehide", commitNow);
      commitNow();
    };
  }, []);

  return { pending, schedule, undo };
}
