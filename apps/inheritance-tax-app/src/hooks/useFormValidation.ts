import { useState, useCallback, useRef, type RefObject } from 'react';

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

  // refs で最新値を保持し、handleCalculate を安定化
  const rulesRef = useRef(rules);
  const onValidRef = useRef(onValid);
  rulesRef.current = rules;
  onValidRef.current = onValid;

  const validationErrors = rules.filter(r => r.condition).map(r => r.message);

  const handleCalculate = useCallback(() => {
    setHasAttempted(true);
    for (const rule of rulesRef.current) {
      if (rule.condition && rule.ref) {
        rule.ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    if (rulesRef.current.some(r => r.condition)) return;
    onValidRef.current();
  }, []);

  return { validationErrors, hasAttempted, handleCalculate };
}
