import { useState, useCallback, useMemo } from 'react';
import type {
  Asset,
  AssetCategory,
  ColumnMapping,
  CategoryMapping,
} from '@/types';
import { resolveBaseCategory, groupByLabel } from '@/types';
import { calculateAsset } from '@/utils/calculation';
import { normalizeDate, generateId } from '@/utils/formatters';
import type { CsvData } from '@/utils/csvParser';

export function useAssetData(taxDate: string) {
  const [assets, setAssets] = useState<Asset[]>([]);

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
          '器具備品';

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
          categoryLabel: rawCategory || category,
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
    (category: AssetCategory, categoryLabel: string) => {
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

  /** カテゴリラベル別にグループ化（CATEGORY_ORDER準拠） */
  const groupedAssets = useMemo(
    () => new Map(groupByLabel(assets)),
    [assets]
  );

  /** 並び替え */
  const sortAssets = useCallback(
    (
      label: string,
      sortBy: 'no' | 'acquisitionDate' | 'acquisitionCost'
    ) => {
      setAssets((prev) => {
        const firstIdx = prev.findIndex((a) => a.categoryLabel === label);
        if (firstIdx < 0) return prev;

        const catAssets = prev
          .filter((a) => a.categoryLabel === label)
          .sort((a, b) => {
            if (sortBy === 'no') return a.no - b.no;
            if (sortBy === 'acquisitionDate')
              return a.acquisitionDate.localeCompare(b.acquisitionDate);
            return a.acquisitionCost - b.acquisitionCost;
          });

        const result: Asset[] = [];
        let catInserted = false;
        for (const a of prev) {
          if (a.categoryLabel === label) {
            if (!catInserted) {
              result.push(...catAssets);
              catInserted = true;
            }
          } else {
            result.push(a);
          }
        }
        return result;
      });
    },
    []
  );

  /** JSONからロード */
  const loadFromJson = useCallback((loadedAssets: Asset[]) => {
    setAssets(loadedAssets);
  }, []);

  return {
    assets,
    groupedAssets,
    importFromCsv,
    recalculateAll,
    updateAsset,
    deleteAsset,
    addEmptyAsset,
    toggleFixedAssetTaxBulk,
    sortAssets,
    loadFromJson,
  };
}
