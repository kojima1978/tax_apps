import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDeceasedList, type PoaDeceased } from '@/utils/powerOfAttorney/deceasedApi';
import { onTabReturn } from '@/shared/staff-directory/tabReturn';

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

  // background: 別のタブから戻ったときの引き直し。一覧は出したまま差し替え、届かなければ前の一覧を残す
  const load = useCallback(async (q: string, background = false) => {
    const current = ++seq.current;
    if (!background) setStatus('loading');
    try {
      const rows = await fetchDeceasedList({ query: q, deleted });
      if (current !== seq.current) return;
      setDeceasedList(rows);
      setStatus('ok');
      setError('');
    } catch (e) {
      if (current !== seq.current || background) return;
      setStatus('error');
      setError(e instanceof Error ? e.message : '被相続人DBを読み込めませんでした');
    }
  }, [deleted]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(query), query ? SEARCH_DELAY_MS : 0);
    return () => window.clearTimeout(timer);
  }, [query, load]);

  const reload = useCallback(() => load(query), [load, query]);

  // DB の画面を別のタブで開いて登録し、戻ってきたら選択肢に出す（リロードすると入力中の委任状が消える）
  useEffect(() => onTabReturn(() => void load(query, true)), [load, query]);

  return { deceasedList, status, error, reload };
}
