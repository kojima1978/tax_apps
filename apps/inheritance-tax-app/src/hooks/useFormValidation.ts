import { useState, useCallback, type RefObject } from 'react';

interface ValidationCheck {
  condition: boolean;
  ref?: RefObject<HTMLElement | null>;
}

/**
 * ページ共通のバリデーション + スクロールフック。
 * checks 配列を順に評価し、最初に失敗した項目の ref へスクロールする。
 * 全チェック通過時のみ onValid を実行する。
 */
export function useFormValidation(
  checks: () => ValidationCheck[],
  onValid: () => void,
) {
  const [hasAttempted, setHasAttempted] = useState(false);

  const handleCalculate = useCallback(() => {
    setHasAttempted(true);
    for (const { condition, ref } of checks()) {
      if (condition) {
        ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    onValid();
  }, [checks, onValid]);

  return { hasAttempted, handleCalculate };
}
