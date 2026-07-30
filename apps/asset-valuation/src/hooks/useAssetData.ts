import { useState, useCallback, useMemo } from 'react';
import type {
  Asset,
  AnyAssetCategory,
  AssetCategory,
  ColumnMapping,
  CategoryMapping,
} from '@/types';
import {
  resolveBaseCategory,
  migrateCategory,
  defaultCategoryOf,
  groupByLabel,
} from '@/types';
import { calculateAsset } from '@/utils/calculation';
import { normalizeDate, generateId } from '@/utils/formatters';
import type { CsvData } from '@/utils/csvParser';

/** 並び替えキー */
export type SortKey = 'no' | 'acquisitionDate';
export type SortDirection = 'asc' | 'desc';

/**
 * 指定カテゴリラベルの行だけを差し替える。
 * 他カテゴリの位置は保ったまま、該当カテゴリの先頭位置に並べ直した行を挿入する。
 */
function replaceGroup(
  assets: Asset[],
  label: string,
  reorder: (group: Asset[]) => Asset[]
): Asset[] {
  const group = assets.filter((a) => a.categoryLabel === label);
  if (group.length === 0) return assets;

  const reordered = reorder(group);
  const result: Asset[] = [];
  let inserted = false;
  for (const a of assets) {
    if (a.categoryLabel === label) {
      if (!inserted) {
        result.push(...reordered);
        inserted = true;
      }
    } else {
      result.push(a);
    }
  }
  return result;
}

export function useAssetData(taxDate: string) {
  const [assets, setAssets] = useState<Asset[]>([]);
  // カテゴリ（小計グループ）の表示順。空配列＝標準順（CATEGORY_ORDER準拠）
  const [labelOrder, setLabelOrder] = useState<string[]>([]);

  /** CSVデータからアセットを生成 */
  const importFromCsv = useCallback(
    (
      csvData: CsvData,
      columnMapping: ColumnMapping,
      categoryMapping: CategoryMapping
    ) => {
      const newAssets: Asset[] = csvData.rows.map((row) => {
        const getValue = (field: string): string => {
          const colName = columnMapping[field as keyof ColumnMapping];
          if (!colName) return '';
          const idx = csvData.headers.indexOf(colName);
          return idx >= 0 ? (row[idx] ?? '') : '';
        };

        const rawCategory = getValue('category');
        const category: AssetCategory =
          categoryMapping[rawCategory] ??
          resolveBaseCategory(rawCategory) ??
          defaultCategoryOf('工具器具備品');

        const acquisitionDate = normalizeDate(getValue('acquisitionDate'));
        const acquisitionCost =
          Math.floor(Number(getValue('acquisitionCost').replace(/,/g, ''))) || 0;
        const bookValue =
          Math.floor(Number(getValue('bookValue').replace(/,/g, ''))) || 0;
        const usefulLife = Number(getValue('usefulLife')) || 0;
        const no = Number(getValue('no')) || 0;
        const name = getValue('name');

        const base = {
          id: generateId(),
          no,
          category,
          // 取込元の名称ではなく、Step2で選択したカテゴリ名で小計を作る
          categoryLabel: category,
          name,
          acquisitionDate,
          usefulLife,
          acquisitionCost,
          bookValue,
          hasFixedAssetTaxRecord: false,
          isRental: false,
        };

        const calc = calculateAsset(base, taxDate);
        return { ...base, ...calc };
      });

      setAssets(newAssets);
    },
    [taxDate]
  );

  /** 全アセットを再計算 */
  const recalculateAll = useCallback(
    (currentTaxDate: string) => {
      setAssets((prev) =>
        prev.map((asset) => {
          const calc = calculateAsset(asset, currentTaxDate);
          return { ...asset, ...calc };
        })
      );
    },
    []
  );

  /** アセットを更新 */
  const updateAsset = useCallback(
    (id: string, updates: Partial<Asset>) => {
      setAssets((prev) =>
        prev.map((asset) => {
          if (asset.id !== id) return asset;
          const updated = { ...asset, ...updates };
          const calc = calculateAsset(updated, taxDate);
          return { ...updated, ...calc };
        })
      );
    },
    [taxDate]
  );

  /** アセットを削除 */
  const deleteAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  /** 空行を追加 */
  const addEmptyAsset = useCallback(
    (category: AnyAssetCategory, categoryLabel: string) => {
      const base = {
        id: generateId(),
        no: 0,
        category,
        categoryLabel: categoryLabel,
        name: '',
        acquisitionDate: '',
        usefulLife: 0,
        acquisitionCost: 0,
        bookValue: 0,
        hasFixedAssetTaxRecord: false,
        isRental: false,
      };
      const calc = calculateAsset(base, taxDate);
      setAssets((prev) => [...prev, { ...base, ...calc }]);
    },
    [taxDate]
  );

  /** カテゴリ内の一括固定資産税評価明細チェック */
  const toggleFixedAssetTaxBulk = useCallback(
    (label: string, checked: boolean) => {
      setAssets((prev) =>
        prev.map((asset) => {
          if (asset.categoryLabel !== label) return asset;
          const updated = { ...asset, hasFixedAssetTaxRecord: checked };
          const calc = calculateAsset(updated, taxDate);
          return { ...updated, ...calc };
        })
      );
    },
    [taxDate]
  );

  /** カテゴリラベル別にグループ化（labelOrder優先、残りはCATEGORY_ORDER準拠） */
  const groupedAssets = useMemo(
    () => new Map(groupByLabel(assets, labelOrder)),
    [assets, labelOrder]
  );

  /** カテゴリ（小計グループ）を1つ上/下へ移動 */
  const moveCategory = useCallback(
    (label: string, direction: -1 | 1) => {
      setLabelOrder((prev) => {
        // 表示中の並びを丸ごと確定させてから入れ替える（未指定カテゴリの位置ズレを防ぐ）
        const current = groupByLabel(assets, prev).map(([l]) => l);
        const from = current.indexOf(label);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= current.length) return prev;
        const next = [...current];
        next.splice(to, 0, next.splice(from, 1)[0]!);
        return next;
      });
    },
    [assets]
  );

  /** カテゴリの表示順を標準（資産区分順 × 償却方法順）に戻す */
  const resetCategoryOrder = useCallback(() => setLabelOrder([]), []);

  /** 並び替え（昇順/降順） */
  const sortAssets = useCallback(
    (label: string, sortBy: SortKey, direction: SortDirection) => {
      const sign = direction === 'asc' ? 1 : -1;
      setAssets((prev) =>
        replaceGroup(prev, label, (group) =>
          [...group].sort((a, b) => {
            const diff =
              sortBy === 'no'
                ? a.no - b.no
                : a.acquisitionDate.localeCompare(b.acquisitionDate);
            // 同値のときはNOで安定させる
            return (diff !== 0 ? diff : a.no - b.no) * sign;
          })
        )
      );
    },
    []
  );

  /** カテゴリ内で行を移動（ドラッグ＆ドロップ / ↑↓ボタン） */
  const moveAsset = useCallback(
    (label: string, sourceId: string, targetId: string) => {
      if (sourceId === targetId) return;
      setAssets((prev) =>
        replaceGroup(prev, label, (group) => {
          const from = group.findIndex((a) => a.id === sourceId);
          const to = group.findIndex((a) => a.id === targetId);
          if (from < 0 || to < 0) return group;
          const next = [...group];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved!);
          return next;
        })
      );
    },
    []
  );

  /** JSONからロード（旧カテゴリ名を移行しつつ再計算。カテゴリ順も復元） */
  const loadFromJson = useCallback(
    (loadedAssets: Asset[], categoryOrder?: string[]) => {
      setLabelOrder(categoryOrder ?? []);
      setAssets(
        loadedAssets.map((asset) => {
          const category =
            migrateCategory(asset.category) ?? defaultCategoryOf('工具器具備品');
          const migrated = { ...asset, category, categoryLabel: category };
          return { ...migrated, ...calculateAsset(migrated, taxDate) };
        })
      );
    },
    [taxDate]
  );

  return {
    assets,
    groupedAssets,
    labelOrder,
    moveCategory,
    resetCategoryOrder,
    importFromCsv,
    recalculateAll,
    updateAsset,
    deleteAsset,
    addEmptyAsset,
    toggleFixedAssetTaxBulk,
    sortAssets,
    moveAsset,
    loadFromJson,
  };
}
