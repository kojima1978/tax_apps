import { useMemo } from 'react';

/**
 * 選択肢リストが変わったとき、無効なIDを持つアイテムをデフォルト値にクリーンアップする
 */
export function useCleanOptions<T>(
  items: T[],
  options: { id: string; label: string }[],
  getItemId: (item: T) => string,
  setItemId: (item: T, id: string, label: string) => T,
): T[] {
  const validIds = useMemo(() => new Set(options.map(o => o.id)), [options]);

  return useMemo(() => {
    if (options.length === 0) return [];
    const defaultOpt = options[0];
    return items.map(item =>
      validIds.has(getItemId(item))
        ? item
        : setItemId(item, defaultOpt.id, defaultOpt.label),
    );
  }, [items, validIds, options, getItemId, setItemId]);
}
