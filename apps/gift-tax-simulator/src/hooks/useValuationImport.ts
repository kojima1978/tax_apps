import { useCallback } from 'react';
import { loadValuations, type PageKey } from '@/lib/valuation-storage';

export const useValuationImport = (
    sourcePage: PageKey,
    setLand: (v: string) => void,
    setBuilding: (v: string) => void,
) => ({
    importLandValuation: useCallback(() => {
        const data = loadValuations(sourcePage);
        if (data?.landValuation) setLand(data.landValuation);
    }, [sourcePage, setLand]),

    importBuildingValuation: useCallback(() => {
        const data = loadValuations(sourcePage);
        if (data?.buildingValuation) setBuilding(data.buildingValuation);
    }, [sourcePage, setBuilding]),
});
