import { useMemo } from 'react';
import LandInput from '@/components/acquisition-tax/LandInput';
import BuildingInput from '@/components/acquisition-tax/BuildingInput';
import RealEstatePageLayout from '@/components/shared/RealEstatePageLayout';
import AcquisitionTaxReference from '@/components/acquisition-tax/TaxReference';
import RegistrationTaxReference from '@/components/registration-tax/TaxReference';
import TokushimaNewBuildingEstimator from '@/components/shared/TokushimaNewBuildingEstimator';
import {
    areaRow, buildingDateRow, compactRows, flagRow, shareRow, usageRow, yenRow, yesNoRow,
} from '@/lib/print-conditions';
import { acquisitionResultGroups, registrationResultGroups, shareNoteText } from '@/lib/real-estate-result';
import { formatInputValue, formatYen } from '@/lib/utils';
import {
    getTokushimaBuildingStructureLabel,
    getTokushimaBuildingUseLabel,
    getTokushimaUnitPrice,
} from '@/lib/tokushima-new-building';
import { useRealEstateSummaryForm } from '@/hooks/useRealEstateSummaryForm';

/**
 * 同じ物件の不動産取得税と登録免許税を1回の入力で出し、計算過程まで A4横1枚に並べて印刷する。
 * 個別ページ（/acquisition-tax・/registration-tax）は片方だけ渡したいとき用に残してある。
 */
export default function RealEstateSummaryPage() {
    const form = useRealEstateSummaryForm();

    const assetTransactionTypes = useMemo(() => ({
        land: form.landTransactionType,
        setLand: form.setLandTransactionType,
        building: form.buildingTransactionType,
        setBuilding: form.setBuildingTransactionType,
    }), [
        form.landTransactionType,
        form.setLandTransactionType,
        form.buildingTransactionType,
        form.setBuildingTransactionType,
    ]);

    const shareNote = useMemo(() => shareNoteText(
        form.landShareNumerator, form.landShareDenominator,
        form.buildingShareNumerator, form.buildingShareDenominator,
    ), [
        form.landShareNumerator, form.landShareDenominator,
        form.buildingShareNumerator, form.buildingShareDenominator,
    ]);

    const resultSections = useMemo(() => form.results ? [
        {
            key: 'acquisition',
            printTitle: '不動産取得税',
            groups: acquisitionResultGroups(form.results.acquisition, {
                includeLand: form.includeLand,
                includeBuilding: form.includeBuilding,
                hasResLand: !!form.resLandValuation,
                hasOtherLand: !!form.otherLandValuation,
            }),
            // 枠の見出しが税名なので、枠の中は「小計」。総額は下の re-grand-total に出す
            totalLabel: '小計',
            totalValue: form.results.acquisition.totalAcq,
            shareNote,
            details: { results: form.results.acquisition, taxType: 'acquisition' as const },
        },
        {
            key: 'registration',
            printTitle: '登録免許税',
            groups: registrationResultGroups(form.results.registration, form.includeLand, form.includeBuilding),
            totalLabel: '小計',
            totalValue: form.results.registration.totalReg,
            shareNote,
            details: { results: form.results.registration, taxType: 'registration' as const },
        },
    ] : [], [
        form.results, form.includeLand, form.includeBuilding,
        form.resLandValuation, form.otherLandValuation, shareNote,
    ]);

    // 2税の総額。この画面の本題なので枠の下に1行で置く
    const resultFooter = form.results ? (
        <div className="re-grand-total">
            <span>不動産取得税 ＋ 登録免許税</span>
            <span className="total-value">{formatYen(form.results.total)}</span>
        </div>
    ) : undefined;

    // 印刷用の入力条件。選択していない対象・未入力欄は行ごと落とす
    const printConditionGroups = useMemo(() => [
        {
            title: '土地',
            rows: form.includeLand ? compactRows([
                yenRow('宅地 固定資産税評価額', form.resLandValuation),
                areaRow('宅地 土地面積', form.resLandArea),
                yenRow('その他 固定資産税評価額', form.otherLandValuation),
                shareRow(form.landShareNumerator, form.landShareDenominator),
            ]) : [],
        },
        {
            title: '建物',
            rows: form.includeBuilding ? compactRows([
                yenRow('固定資産税評価額', form.buildingValuation),
                areaRow('建物床面積', form.buildingArea),
                form.buildingTransactionType === 'new_build'
                    ? { label: '概算基準', value: '徳島地方法務局 令和6年度' }
                    : null,
                form.buildingTransactionType === 'new_build'
                    ? { label: '建物用途', value: getTokushimaBuildingUseLabel(form.newBuildingUse) }
                    : null,
                form.buildingTransactionType === 'new_build'
                    ? { label: '建物構造', value: getTokushimaBuildingStructureLabel(form.newBuildingStructure) }
                    : null,
                form.buildingTransactionType === 'new_build'
                    ? {
                        label: '認定基準単価',
                        value: `${formatInputValue(getTokushimaUnitPrice(
                            form.newBuildingUse,
                            form.newBuildingStructure,
                        ))} 円/㎡`,
                    }
                    : null,
                buildingDateRow(form.selYear, form.selMonth, form.selDay),
                usageRow(form.isResidential),
                // 登録免許税の税率が変わるので「なし」も紙に残す
                form.isResidential ? yesNoRow('住宅用家屋証明書', form.hasHousingCertificate) : null,
                flagRow('認定長期優良住宅', form.isResidential && form.isLongLifeQuality),
                form.isResidential ? yenRow('建物不動産取得税の控除額', form.acquisitionDeduction) : null,
                shareRow(form.buildingShareNumerator, form.buildingShareDenominator),
            ]) : [],
        },
    ], [
        form.includeLand, form.resLandValuation, form.resLandArea, form.otherLandValuation,
        form.landShareNumerator, form.landShareDenominator,
        form.includeBuilding, form.buildingValuation, form.buildingArea,
        form.buildingTransactionType, form.newBuildingUse, form.newBuildingStructure,
        form.selYear, form.selMonth, form.selDay,
        form.isResidential, form.hasHousingCertificate, form.isLongLifeQuality, form.acquisitionDeduction,
        form.buildingShareNumerator, form.buildingShareDenominator,
    ]);

    const inputNotice = useMemo(() => {
        const notices = [];
        const inheritedTargets = [
            form.includeLand && form.landTransactionType === 'inheritance' ? '土地' : '',
            form.includeBuilding && form.buildingTransactionType === 'inheritance' ? '建物' : '',
        ].filter(Boolean).join('・');
        if (inheritedTargets) {
            notices.push(
                <p key="inh" className="notice-primary">
                    ※ {inheritedTargets}は相続による取得のため、不動産取得税は非課税です（登録免許税はかかります）。
                </p>,
            );
        }
        if (form.areaWarning) {
            notices.push(<p key="area" className="notice-warning">{form.areaWarning}</p>);
        }
        return notices.length > 0 ? <>{notices}</> : undefined;
    }, [
        form.includeLand, form.includeBuilding,
        form.landTransactionType, form.buildingTransactionType,
        form.areaWarning,
    ]);

    return (
        <RealEstatePageLayout
            className="real-estate-summary"
            transactionType={form.landTransactionType}
            setTransactionType={form.setLandTransactionType}
            assetTransactionTypes={assetTransactionTypes}
            includeLand={form.includeLand}
            setIncludeLand={form.setIncludeLand}
            includeBuilding={form.includeBuilding}
            setIncludeBuilding={form.setIncludeBuilding}
            inputNotice={inputNotice}
            importConfig={{
                sources: ['acquisition-tax', 'registration-tax'],
                onImport: form.importFrom,
            }}
            inputColumns={
                <>
                    <LandInput
                        disabled={!form.includeLand}
                        resValuation={form.resLandValuation}
                        resArea={form.resLandArea}
                        otherValuation={form.otherLandValuation}
                        onResValuationChange={(e) => form.handleFormattedInput(e, form.setResLandValuation)}
                        onResAreaChange={(e) => form.handleDecimalInput(e, form.setResLandArea)}
                        onOtherValuationChange={(e) => form.handleFormattedInput(e, form.setOtherLandValuation)}
                        shareNumerator={form.landShareNumerator}
                        shareDenominator={form.landShareDenominator}
                        onShareNumeratorChange={form.setLandShareNumerator}
                        onShareDenominatorChange={form.setLandShareDenominator}
                    />
                    <BuildingInput
                        disabled={!form.includeBuilding}
                        valuation={form.buildingValuation}
                        area={form.buildingArea}
                        yearInput={form.yearInput}
                        yearError={form.yearError}
                        yearHint={form.yearHint}
                        selMonth={form.selMonth}
                        selDay={form.selDay}
                        isResidential={form.isResidential}
                        isLongLifeQuality={form.isLongLifeQuality}
                        acquisitionDeduction={form.acquisitionDeduction}
                        deductionMessage={form.deductionMessage}
                        yearOptions={form.yearOptions}
                        transactionType={form.buildingTransactionType}
                        onValuationChange={(e) => form.handleFormattedInput(e, form.setBuildingValuation)}
                        onAreaChange={(e) => form.handleDecimalInput(e, form.setBuildingArea)}
                        setYearInput={form.setYearInput}
                        setSelMonth={form.setSelMonth}
                        setSelDay={form.setSelDay}
                        setIsResidential={form.setIsResidential}
                        setIsLongLifeQuality={form.setIsLongLifeQuality}
                        onDeductionChange={(e) => form.handleFormattedInput(e, form.setAcquisitionDeduction)}
                        shareNumerator={form.buildingShareNumerator}
                        shareDenominator={form.buildingShareDenominator}
                        onShareNumeratorChange={form.setBuildingShareNumerator}
                        onShareDenominatorChange={form.setBuildingShareDenominator}
                    >
                        {form.buildingTransactionType === 'new_build' && (
                            <TokushimaNewBuildingEstimator
                                area={form.buildingArea}
                                buildingUse={form.newBuildingUse}
                                structure={form.newBuildingStructure}
                                setBuildingUse={form.setNewBuildingUse}
                                setStructure={form.setNewBuildingStructure}
                                onApply={(value) => form.setBuildingValuation(formatInputValue(value))}
                                disabled={!form.includeBuilding}
                            />
                        )}
                        {form.isResidential && (
                            <div className="input-item">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={form.hasHousingCertificate}
                                        onChange={(e) => form.setHasHousingCertificate(e.target.checked)}
                                        disabled={!form.includeBuilding}
                                    />
                                    住宅用家屋証明書あり
                                </label>
                                <small className="text-primary">※登録免許税の税率に影響</small>
                            </div>
                        )}
                    </BuildingInput>
                </>
            }
            printConditionGroups={printConditionGroups}
            onCalculate={form.calculateTax}
            onSample={form.handleSample}
            onReset={form.resetForm}
            errorMsg={form.errorMsg}
            resultSections={resultSections}
            resultFooter={resultFooter}
            disclaimer="※この計算は概算です。実際の税額は、自治体の条例や端数処理のルールにより異なる場合があります。"
            isStale={form.isStale}
            showDetails={form.showDetails}
            setShowDetails={form.setShowDetails}
            printTitle="不動産関連税シミュレーション"
            reference={
                <>
                    <AcquisitionTaxReference />
                    <RegistrationTaxReference />
                </>
            }
        />
    );
}
