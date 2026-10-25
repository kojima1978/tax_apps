import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPrincipals, type PoaPrincipal } from '@/utils/powerOfAttorney/principalApi';

const SEARCH_DELAY_MS = 200;

/**
 * 委任者DBの一覧を検索語で引く（委任者DBの画面と、委任状の画面の「DBから選ぶ」で共用）。
 * 打っている間は待ち、遅れて届いた古い検索結果では上書きしない。
 */
export function usePrincipalSearch(query: string, deleted = false) {
  const [principals, setPrincipals] = useState<PoaPrincipal[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const seq = useRef(0);

  const load = useCallback(async (q: string) => {
    const current = ++seq.current;
    setStatus('loading');
    try {
      const rows = await fetchPrincipals({ query: q, deleted });
      if (current !== seq.current) return;
      setPrincipals(rows);
      setStatus('ok');
      setError('');
    } catch (e) {
      if (current !== seq.current) return;
      setStatus('error');
      setError(e instanceof Error ? e.message : '委任者DBを読み込めませんでした');
    }
  }, [deleted]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(query), query ? SEARCH_DELAY_MS : 0);
    return () => window.clearTimeout(timer);
  }, [query, load]);

  const reload = useCallback(() => load(query), [load, query]);

  return { principals, status, error, reload };
}
