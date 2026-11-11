import { useCallback, useEffect, useState } from 'react';

// 一覧の読み込み。reload() で読み直す（保存の後に呼ぶ）。読めた値を返す（失敗なら null）
export function useLoad<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<T | null> => {
    try {
      const loaded = await load();
      setData(loaded);
      setError(null);
      return loaded;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, [load]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, reload };
}
