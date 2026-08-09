import { useCallback, useEffect } from 'react';
import {
    applyIfPresent,
    saveRealEstateInputs,
    type PageKey,
    type RealEstateInputs,
} from '@/lib/real-estate-input-storage';
import { useRealEstateImport } from './useRealEstateImport';
import type { useRealEstateInputs } from './useRealEstateInputs';

type Inputs = ReturnType<typeof useRealEstateInputs>;

type HousingCertificate = {
    hasHousingCertificate: boolean;
    setHasHousingCertificate: (v: boolean) => void;
};

/**
 * 物件の入力条件を localStorage に保存し、他ページからの引用を受け取る。
 * 不動産取得税ページとまとめページは同じ入力欄（useRealEstateInputs）を持つので、
 * 保存も当てはめも共通にできる。
 * 住宅用家屋証明書は登録免許税を出すページ（まとめ）だけが持つので任意。
 */
export const useRealEstateInputSync = (
    page: PageKey,
    inputs: Inputs,
    housing?: HousingCertificate,
) => {
    useEffect(() => {
        saveRealEstateInputs(page, {
            landValuation: inputs.resLandValuation,
            otherLandValuation: inputs.otherLandValuation,
            landArea: inputs.resLandArea,
            landShareNumerator: inputs.landShareNumerator,
            landShareDenominator: inputs.landShareDenominator,
            buildingValuation: inputs.buildingValuation,
            buildingArea: inputs.buildingArea,
            buildingYearInput: inputs.yearInput,
            buildingMonth: inputs.selMonth,
            buildingDay: inputs.selDay,
            isResidential: inputs.isResidential,
            isLongLifeQuality: inputs.isLongLifeQuality,
            hasHousingCertificate: housing?.hasHousingCertificate,
            buildingShareNumerator: inputs.buildingShareNumerator,
            buildingShareDenominator: inputs.buildingShareDenominator,
        });
    }, [
        page,
        inputs.resLandValuation, inputs.otherLandValuation, inputs.resLandArea,
        inputs.landShareNumerator, inputs.landShareDenominator,
        inputs.buildingValuation, inputs.buildingArea,
        inputs.yearInput, inputs.selMonth, inputs.selDay,
        inputs.isResidential, inputs.isLongLifeQuality,
        housing?.hasHousingCertificate,
        inputs.buildingShareNumerator, inputs.buildingShareDenominator,
    ]);

    const applyLand = useCallback((data: RealEstateInputs) => {
        applyIfPresent(inputs.setResLandValuation, data.landValuation);
        applyIfPresent(inputs.setOtherLandValuation, data.otherLandValuation);
        applyIfPresent(inputs.setResLandArea, data.landArea);
        applyIfPresent(inputs.setLandShareNumerator, data.landShareNumerator);
        applyIfPresent(inputs.setLandShareDenominator, data.landShareDenominator);
    }, [
        inputs.setResLandValuation, inputs.setOtherLandValuation, inputs.setResLandArea,
        inputs.setLandShareNumerator, inputs.setLandShareDenominator,
    ]);

    const applyBuilding = useCallback((data: RealEstateInputs) => {
        applyIfPresent(inputs.setBuildingValuation, data.buildingValuation);
        applyIfPresent(inputs.setBuildingArea, data.buildingArea);
        applyIfPresent(inputs.setYearInput, data.buildingYearInput);
        applyIfPresent(inputs.setSelMonth, data.buildingMonth);
        applyIfPresent(inputs.setSelDay, data.buildingDay);
        applyIfPresent(inputs.setIsResidential, data.isResidential);
        applyIfPresent(inputs.setIsLongLifeQuality, data.isLongLifeQuality);
        if (housing) applyIfPresent(housing.setHasHousingCertificate, data.hasHousingCertificate);
        applyIfPresent(inputs.setBuildingShareNumerator, data.buildingShareNumerator);
        applyIfPresent(inputs.setBuildingShareDenominator, data.buildingShareDenominator);
        // 建物控除額は建築年月日から effect で決まるので当てはめない
    }, [
        inputs.setBuildingValuation, inputs.setBuildingArea,
        inputs.setYearInput, inputs.setSelMonth, inputs.setSelDay,
        inputs.setIsResidential, inputs.setIsLongLifeQuality,
        housing?.setHasHousingCertificate,
        inputs.setBuildingShareNumerator, inputs.setBuildingShareDenominator,
    ]);

    return useRealEstateImport(applyLand, applyBuilding);
};
