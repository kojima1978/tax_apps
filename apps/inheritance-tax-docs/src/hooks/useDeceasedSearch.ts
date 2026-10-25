import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDeceasedList, type PoaDeceased } from '@/utils/powerOfAttorney/deceasedApi';

const SEARCH_DELAY_MS = 200;

/**
 * 被相続人DBの一覧を検索語で引く（DB の画面と、委任状の画面の「DBから選ぶ」で共用）。
 * 打っている間は待ち、遅れて届いた古い検索結果では上書きしない。
 */
export function useDeceasedSearch(query: string, deleted = false) {
  const [deceasedList, setDeceasedList] = useState<PoaDeceased[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const seq = useRef(0);

  const load = useCallback(async (q: string) => {
    const current = ++seq.current;
    setStatus('loading');
    try {
      const rows = await fetchDeceasedList({ query: q, deleted });
      if (current !== seq.current) return;
      setDeceasedList(rows);
      setStatus('ok');
      setError('');
    } catch (e) {
      if (current !== seq.current) return;
      setStatus('error');
      setError(e instanceof Error ? e.message : '被相続人DBを読み込めませんでした');
    }
  }, [deleted]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(query), query ? SEARCH_DELAY_MS : 0);
    return () => window.clearTimeout(timer);
  }, [query, load]);

  const reload = useCallback(() => load(query), [load, query]);

  return { deceasedList, status, error, reload };
}
