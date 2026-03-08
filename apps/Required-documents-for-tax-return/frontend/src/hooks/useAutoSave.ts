import { useEffect, useRef } from 'react';

const AUTO_SAVE_DELAY_MS = 30_000;

interface UseAutoSaveParams {
  isDirty: boolean;
  isReady: boolean;
  isSavingRef: React.RefObject<boolean>;
  onSave: () => Promise<boolean>;
  onSuccess?: () => void;
  deps: unknown[];
}

export function useAutoSave({
  isDirty,
  isReady,
  isSavingRef,
  onSave,
  onSuccess,
  deps,
}: UseAutoSaveParams) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDirty || !isReady) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      if (!isSavingRef.current) {
        onSave().then((success) => {
          if (success) onSuccess?.();
        });
      }
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, isReady, ...deps]);
}
