import { useCallback, useEffect, useState } from 'react';

/**
 * サンプル値を入れてそのまま計算まで走らせる。
 * 計算関数は state を閉じ込めているため、値を入れた直後のその場では
 * まだ古い入力で計算してしまう。1レンダリング待ってから実行する。
 */
export function useSampleFill(calculate: () => void) {
    const [pending, setPending] = useState(false);

    useEffect(() => {
        if (!pending) return;
        setPending(false);
        calculate();
    }, [pending, calculate]);

    return useCallback((fill: () => void) => {
        fill();
        setPending(true);
    }, []);
}
