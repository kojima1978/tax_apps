import { useState, useCallback, useMemo } from 'react';
import type {
  Asset,
  AssetCategory,
  ColumnMapping,
  CategoryMapping,
} from '@/types';
import { CATEGORY_ORDER, CATEGORY_ALIASES } from '@/types';
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
          CATEGORY_ALIASES[rawCategory] ??
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
    (category: AssetCategory) => {
      const base = {
        id: generateId(),
        no: 0,
        category,
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
    (category: AssetCategory, checked: boolean) => {
      setAssets((prev) =>
        prev.map((asset) => {
          if (asset.category !== category) return asset;
          const updated = { ...asset, hasFixedAssetTaxRecord: checked };
          const calc = calculateAsset(updated, taxDate);
          return { ...updated, ...calc };
        })
      );
    },
    [taxDate]
  );

  /** カテゴリ別にグループ化 */
  const groupedAssets = useMemo(() => {
    const groups = new Map<AssetCategory, Asset[]>();
    for (const cat of CATEGORY_ORDER) {
      const catAssets = assets.filter((a) => a.category === cat);
      if (catAssets.length > 0) {
        groups.set(cat, catAssets);
      }
    }
    return groups;
  }, [assets]);

  /** 並び替え */
  const sortAssets = useCallback(
    (
      category: AssetCategory,
      sortBy: 'no' | 'acquisitionDate' | 'acquisitionCost'
    ) => {
      setAssets((prev) => {
        const firstIdx = prev.findIndex((a) => a.category === category);
        if (firstIdx < 0) return prev;

        const catAssets = prev
          .filter((a) => a.category === category)
          .sort((a, b) => {
            if (sortBy === 'no') return a.no - b.no;
            if (sortBy === 'acquisitionDate')
              return a.acquisitionDate.localeCompare(b.acquisitionDate);
            return a.acquisitionCost - b.acquisitionCost;
          });

        // 元の位置にソート済み配列を挿入
        const result: Asset[] = [];
        let catInserted = false;
        for (const a of prev) {
          if (a.category === category) {
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
