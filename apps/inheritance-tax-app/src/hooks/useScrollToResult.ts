import { useRef, useEffect } from 'react';

/**
 * 結果が初めて表示されたときに自動スクロールするフック。
 * @param hasResult - 結果が存在するかどうか（truthy で初回スクロール発火）
 * @returns resultRef — 結果表示の wrapper div に付与する ref
 */
export function useScrollToResult(hasResult: boolean) {
  const resultRef = useRef<HTMLDivElement>(null);
  const prevHasResult = useRef(false);

  useEffect(() => {
    if (hasResult && !prevHasResult.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    prevHasResult.current = hasResult;
  }, [hasResult]);

  return resultRef;
}
