import { useState, useCallback, type RefObject } from 'react';

export interface ValidationRule {
  condition: boolean;
  message: string;
  ref?: RefObject<HTMLElement | null>;
}

/**
 * ページ共通のバリデーション + スクロールフック。
 *
 * rules 配列を評価し、condition が true のものからエラーメッセージを収集。
 * 計算ボタン押下時は、最初に失敗した ref へスクロールする。
 * 全ルール通過時のみ onValid を実行する。
 */
export function useFormValidation(
  rules: ValidationRule[],
  onValid: () => void,
) {
  const [hasAttempted, setHasAttempted] = useState(false);

  const validationErrors = rules.filter(r => r.condition).map(r => r.message);

  const handleCalculate = useCallback(() => {
    setHasAttempted(true);
    for (const rule of rules) {
      if (rule.condition && rule.ref) {
        rule.ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    if (rules.some(r => r.condition)) return;
    onValid();
  }, [onValid, rules]);

  return { validationErrors, hasAttempted, handleCalculate };
}
