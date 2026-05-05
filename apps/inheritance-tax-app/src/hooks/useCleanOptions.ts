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
  return useMemo(() => {
    if (options.length === 0) return [];
    const defaultOpt = options[0];
    return items.map(item => {
      const option = options.find(o => o.id === getItemId(item)) ?? defaultOpt;
      return setItemId(item, option.id, option.label);
    });
  }, [items, options, getItemId, setItemId]);
}
