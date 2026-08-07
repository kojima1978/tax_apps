import { useCallback, useRef, useState } from 'react';

/**
 * フォーム状態の共通フック。
 * 不動産タブ・株式等タブで同じ「フィールド更新 + 初期値へリセット」を使うため切り出している。
 */
export function useFormState<T extends object>(initial: T) {
    const initialRef = useRef(initial);
    const [form, setForm] = useState<T>(initial);

    const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    }, []);

    const reset = useCallback(() => setForm(initialRef.current), []);

    return { form, setField, reset };
}
