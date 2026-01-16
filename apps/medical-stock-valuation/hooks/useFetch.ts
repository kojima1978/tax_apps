import { useState, useEffect, useCallback } from 'react';
import { checkApiResponse } from '@/lib/utils';

/**
 * データ取得用のカスタムフック
 */
export function useFetch<T>(url: string, autoFetch: boolean = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      await checkApiResponse(response);
      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'データの取得に失敗しました';
      setError(errorMessage);
      console.error(`データ取得エラー (${url}):`, err);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  return { data, loading, error, refetch: fetchData };
}
