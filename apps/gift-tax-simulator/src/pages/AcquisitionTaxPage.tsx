import { useMemo } from 'react';
import LandInput from '@/components/acquisition-tax/LandInput';
import BuildingInput from '@/components/acquisition-tax/BuildingInput';
import RealEstatePageLayout from '@/components/shared/RealEstatePageLayout';
import TaxReference from '@/components/acquisition-tax/TaxReference';
import {
    areaRow, buildingDateRow, compactRows, flagRow, shareRow, usageRow, yenRow,
} from '@/lib/print-conditions';
import { useAcquisitionTaxForm } from '@/hooks/useAcquisitionTaxForm';

export default function AcquisitionTaxPage() {
    const form = useAcquisitionTaxForm();

    const lN = Math.max(1, parseInt(form.landShareNumerator) || 1);
    const lD = Math.max(1, parseInt(form.landShareDenominator) || 1);
    const bN = Math.max(1, parseInt(form.buildingShareNumerator) || 1);
    const bD = Math.max(1, parseInt(form.buildingShareDenominator) || 1);

    const resultConfig = useMemo(() => form.results ? {
        groups: [
            {
                title: '土地',
                show: form.includeLand,
                items: [
                    { label: '宅地', value: form.results.resLandAcq, show: !!form.resLandValuation },
                    { label: 'その他（宅地以外）', value: form.results.otherLandAcq, show: !!form.otherLandValuation },
                ],
            },
            {
                title: '建物',
                show: form.includeBuilding,
                items: [
                    { label: '不動産取得税', value: form.results.bldgAcq, show: true },
                ],
            },
        ],
        totalLabel: '不動産取得税 合計',
        totalValue: form.results.totalAcq,
        taxType: 'acquisition' as const,
        disclaimer: '※この計算は概算です。実際の税額は、自治体の条例や端数処理のルールにより異なる場合があります。',
        shareNote: [
            (lN !== lD ? `土地持ち分 ${lN}/${lD}` : ''),
            (bN !== bD ? `建物持ち分 ${bN}/${bD}` : ''),
        ].filter(Boolean).join('　') || undefined,
    } : null, [form.results, form.includeLand, form.includeBuilding, form.resLandValuation, form.otherLandValuation, lN, lD, bN, bD]);

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
                buildingDateRow(form.selYear, form.selMonth, form.selDay),
                usageRow(form.isResidential),
                flagRow('認定長期優良住宅', form.isResidential && form.isLongLifeQuality),
                form.isResidential ? yenRow('建物不動産取得税の控除額', form.acquisitionDeduction) : null,
                shareRow(form.buildingShareNumerator, form.buildingShareDenominator),
            ]) : [],
        },
    ], [
        form.includeLand, form.resLandValuation, form.resLandArea, form.otherLandValuation,
        form.landShareNumerator, form.landShareDenominator,
        form.includeBuilding, form.buildingValuation, form.buildingArea,
        form.selYear, form.selMonth, form.selDay,
        form.isResidential, form.isLongLifeQuality, form.acquisitionDeduction,
        form.buildingShareNumerator, form.buildingShareDenominator,
    ]);

    const inputNotice = useMemo(() => {
        const notices = [];
        if (form.transactionType === 'inheritance') {
            notices.push(<p key="inh" className="notice-primary">※ 相続の場合、不動産取得税は非課税です。</p>);
        }
        if (form.areaWarning) {
            notices.push(<p key="area" className="notice-warning">{form.areaWarning}</p>);
        }
        return notices.length > 0 ? <>{notices}</> : undefined;
    }, [form.transactionType, form.areaWarning]);

    return (
        <RealEstatePageLayout
            transactionType={form.transactionType}
            setTransactionType={form.setTransactionType}
            includeLand={form.includeLand}
            setIncludeLand={form.setIncludeLand}
            includeBuilding={form.includeBuilding}
            setIncludeBuilding={form.setIncludeBuilding}
            inputNotice={inputNotice}
            importConfig={{
                sourceLabel: '登録免許税ページ',
                sourcePage: 'registration-tax',
                onLandImport: form.importLandValuation,
                onBuildingImport: form.importBuildingValuation,
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
                        transactionType={form.transactionType}
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
                    />
                </>
            }
            printConditionGroups={printConditionGroups}
            onCalculate={form.calculateTax}
            onReset={form.resetForm}
            errorMsg={form.errorMsg}
            results={form.results}
            resultConfig={resultConfig}
            isStale={form.isStale}
            showDetails={form.showDetails}
            setShowDetails={form.setShowDetails}
            printTitle="不動産取得税シミュレーション"
            reference={<TaxReference />}
        />
    );
}
