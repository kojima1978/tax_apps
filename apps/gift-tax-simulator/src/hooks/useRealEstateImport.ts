import { useCallback } from 'react';
import {
    loadRealEstateInputs,
    type ImportField,
    type PageKey,
    type RealEstateInputs,
} from '@/lib/real-estate-input-storage';

/**
 * 他ページの入力条件を取り込む。項目の当てはめ方はページごとに違う
 * （登録免許税は宅地とその他を区別せず合算する等）ので、当てはめ自体は呼び出し側に任せる。
 */
export const useRealEstateImport = (
    applyLand: (data: RealEstateInputs) => void,
    applyBuilding: (data: RealEstateInputs) => void,
) => useCallback((sourcePage: PageKey, field: ImportField) => {
    const data = loadRealEstateInputs(sourcePage);
    if (!data) return;
    (field === 'land' ? applyLand : applyBuilding)(data);
}, [applyLand, applyBuilding]);
