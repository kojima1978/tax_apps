import { useMemo } from 'react';
import LandInput from '@/components/acquisition-tax/LandInput';
import BuildingInput from '@/components/acquisition-tax/BuildingInput';
import RealEstatePageLayout from '@/components/shared/RealEstatePageLayout';
import { useAcquisitionTaxForm } from '@/hooks/useAcquisitionTaxForm';

export default function AcquisitionTaxPage() {
    const form = useAcquisitionTaxForm();

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
    } : null, [form.results, form.includeLand, form.includeBuilding, form.resLandValuation, form.otherLandValuation]);

    return (
        <RealEstatePageLayout
            transactionType={form.transactionType}
            setTransactionType={form.setTransactionType}
            includeLand={form.includeLand}
            setIncludeLand={form.setIncludeLand}
            includeBuilding={form.includeBuilding}
            setIncludeBuilding={form.setIncludeBuilding}
            inputNotice={form.transactionType === 'inheritance' ? (
                <p className="notice-primary">※ 相続の場合、不動産取得税は非課税です。</p>
            ) : undefined}
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
                        onResAreaChange={(e) => form.handleFormattedInput(e, form.setResLandArea)}
                        onOtherValuationChange={(e) => form.handleFormattedInput(e, form.setOtherLandValuation)}
                    />
                    <BuildingInput
                        disabled={!form.includeBuilding}
                        valuation={form.buildingValuation}
                        area={form.buildingArea}
                        selYear={form.selYear}
                        selMonth={form.selMonth}
                        selDay={form.selDay}
                        isResidential={form.isResidential}
                        acquisitionDeduction={form.acquisitionDeduction}
                        deductionMessage={form.deductionMessage}
                        yearOptions={form.yearOptions}
                        onValuationChange={(e) => form.handleFormattedInput(e, form.setBuildingValuation)}
                        onAreaChange={(e) => form.handleFormattedInput(e, form.setBuildingArea)}
                        setSelYear={form.setSelYear}
                        setSelMonth={form.setSelMonth}
                        setSelDay={form.setSelDay}
                        setIsResidential={form.setIsResidential}
                        onDeductionChange={(e) => form.handleFormattedInput(e, form.setAcquisitionDeduction)}
                    />
                </>
            }
            onCalculate={form.calculateTax}
            errorMsg={form.errorMsg}
            results={form.results}
            resultConfig={resultConfig}
            showDetails={form.showDetails}
            setShowDetails={form.setShowDetails}
        />
    );
}
