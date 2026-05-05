import { useCallback } from 'react';
import { loadValuations, type PageKey } from '@/lib/valuation-storage';

export const useValuationImport = (
    sourcePage: PageKey,
    setLand: (v: string) => void,
    setBuilding: (v: string) => void,
    setLandShareN?: (v: string) => void,
    setLandShareD?: (v: string) => void,
    setBldgShareN?: (v: string) => void,
    setBldgShareD?: (v: string) => void,
) => ({
    importLandValuation: useCallback(() => {
        const data = loadValuations(sourcePage);
        if (data?.landValuation) setLand(data.landValuation);
        if (data?.landShareNumerator && setLandShareN) setLandShareN(data.landShareNumerator);
        if (data?.landShareDenominator && setLandShareD) setLandShareD(data.landShareDenominator);
    }, [sourcePage, setLand, setLandShareN, setLandShareD]),

    importBuildingValuation: useCallback(() => {
        const data = loadValuations(sourcePage);
        if (data?.buildingValuation) setBuilding(data.buildingValuation);
        if (data?.buildingShareNumerator && setBldgShareN) setBldgShareN(data.buildingShareNumerator);
        if (data?.buildingShareDenominator && setBldgShareD) setBldgShareD(data.buildingShareDenominator);
    }, [sourcePage, setBuilding, setBldgShareN, setBldgShareD]),
});
