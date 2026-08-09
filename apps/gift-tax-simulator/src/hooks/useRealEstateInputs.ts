import { useCallback, useState } from 'react';
import { calculateBuildingDeduction, type TransactionType } from '@/lib/real-estate-tax';
import { formatInputValue } from '@/lib/utils';
import { REAL_ESTATE_SAMPLE, sampleBuildingDate } from '@/lib/real-estate-sample';
import { useBuildingDate, YEAR_OPTIONS } from './useBuildingDate';
import { useDecimalInput } from './useFormattedInput';

/**
 * 物件そのものの入力（宅地・その他の土地・建物・建築年月日・持ち分）。
 * 不動産取得税ページとまとめページが同じ入力欄を持つのでここに集約する。
 * 取引種別と計算対象は useRealEstateFormBase 側にあるため transactionType だけ受け取る。
 */
export const useRealEstateInputs = (transactionType: TransactionType) => {
    // 土地（宅地）
    const [resLandValuation, setResLandValuation] = useState('');
    const [resLandArea, setResLandArea] = useState('');

    // 土地（その他）
    const [otherLandValuation, setOtherLandValuation] = useState('');

    // 建物
    const [buildingValuation, setBuildingValuation] = useState('');
    const [buildingArea, setBuildingArea] = useState('');
    const [isResidential, setIsResidential] = useState(true);
    const [isLongLifeQuality, setIsLongLifeQuality] = useState(false);

    // 持ち分
    const [landShareNumerator, setLandShareNumerator] = useState('1');
    const [landShareDenominator, setLandShareDenominator] = useState('1');
    const [buildingShareNumerator, setBuildingShareNumerator] = useState('1');
    const [buildingShareDenominator, setBuildingShareDenominator] = useState('1');

    // 建築年月日・控除額
    const buildingDate = useBuildingDate(transactionType, isResidential, isLongLifeQuality);

    // 面積decimal入力ハンドラ
    const handleDecimalInput = useDecimalInput();

    const resetInputs = useCallback(() => {
        setResLandValuation('');
        setResLandArea('');
        setOtherLandValuation('');
        setBuildingValuation('');
        setBuildingArea('');
        setIsResidential(true);
        setIsLongLifeQuality(false);
        setLandShareNumerator('1');
        setLandShareDenominator('1');
        setBuildingShareNumerator('1');
        setBuildingShareDenominator('1');
        buildingDate.setYearInput('');
        buildingDate.setSelMonth('');
        buildingDate.setSelDay('');
    }, [
        buildingDate.setYearInput,
        buildingDate.setSelMonth,
        buildingDate.setSelDay,
    ]);

    /** 一通り入力された状態を作る（土地・建物とも贈与で取得したケース） */
    const applySample = useCallback(() => {
        setResLandValuation(REAL_ESTATE_SAMPLE.landValuation);
        setResLandArea(REAL_ESTATE_SAMPLE.landArea);
        setOtherLandValuation('');
        setBuildingValuation(REAL_ESTATE_SAMPLE.buildingValuation);
        setBuildingArea(REAL_ESTATE_SAMPLE.buildingArea);
        setIsResidential(true);
        setIsLongLifeQuality(false);
        setLandShareNumerator('1');
        setLandShareDenominator('1');
        setBuildingShareNumerator('1');
        setBuildingShareDenominator('1');
        buildingDate.setYearInput(REAL_ESTATE_SAMPLE.buildingYear);
        buildingDate.setSelMonth(REAL_ESTATE_SAMPLE.buildingMonth);
        buildingDate.setSelDay(REAL_ESTATE_SAMPLE.buildingDay);
        // 控除額は建築年月日から effect 経由で決まるため、計算に間に合わない。
        // 同じ関数で先に求めて入れておく（effect が後から同じ値を入れ直す）
        const { deduction } = calculateBuildingDeduction(sampleBuildingDate(), 'gift', true, false);
        buildingDate.setAcquisitionDeduction(formatInputValue(deduction));
    }, [
        buildingDate.setYearInput,
        buildingDate.setSelMonth,
        buildingDate.setSelDay,
        buildingDate.setAcquisitionDeduction,
    ]);

    return {
        resLandValuation, setResLandValuation,
        resLandArea, setResLandArea,
        otherLandValuation, setOtherLandValuation,
        buildingValuation, setBuildingValuation,
        buildingArea, setBuildingArea,
        isResidential, setIsResidential,
        isLongLifeQuality, setIsLongLifeQuality,
        landShareNumerator, setLandShareNumerator,
        landShareDenominator, setLandShareDenominator,
        buildingShareNumerator, setBuildingShareNumerator,
        buildingShareDenominator, setBuildingShareDenominator,
        ...buildingDate,
        yearOptions: YEAR_OPTIONS,
        handleDecimalInput,
        resetInputs,
        applySample,
    };
};
