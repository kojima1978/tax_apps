// GET の結果を持つ。key が変わったら読み直し、reload() で同じ key のまま読み直す。
// 読み直しの間は前のデータを出したままにする（表がちらつかないように）

import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../lib/api';

export function useApiData<T>(key: string | null, load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(key !== null);
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    setLoading(true);
    loadRef
      .current()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}
