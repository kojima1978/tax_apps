import { useCallback } from 'react';
import type { CategoryOrderPreset } from '@/types';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';

const STORAGE_KEY = 'asset-valuation-category-order-presets';

/** カテゴリ表示順のプリセット管理（同名は上書き） */
export function useCategoryOrderPresets() {
  const [orderPresets, setOrderPresets] = useLocalStorageState<
    CategoryOrderPreset[]
  >(STORAGE_KEY, []);

  const saveOrderPreset = useCallback(
    (name: string, order: string[]) => {
      setOrderPresets((prev) => {
        const preset: CategoryOrderPreset = { name, order };
        const existing = prev.findIndex((p) => p.name === name);
        if (existing < 0) return [...prev, preset];
        const updated = [...prev];
        updated[existing] = preset;
        return updated;
      });
    },
    [setOrderPresets]
  );

  const deleteOrderPreset = useCallback(
    (name: string) => {
      setOrderPresets((prev) => prev.filter((p) => p.name !== name));
    },
    [setOrderPresets]
  );

  return { orderPresets, saveOrderPreset, deleteOrderPreset };
}
