import PrintFooter from '@/components/PrintFooter';
import Navigation from '@/components/Navigation';
import LandInput from '@/components/acquisition-tax/LandInput';
import BuildingInput from '@/components/acquisition-tax/BuildingInput';
import CommonInputSection from '@/components/shared/CommonInputSection';
import TaxResultBox from '@/components/shared/TaxResultBox';
import CalculationDetails from '@/components/shared/CalculationDetails';
import ImportButton from '@/components/shared/ImportButton';
import { useAcquisitionTaxForm } from '@/hooks/useAcquisitionTaxForm';

export default function AcquisitionTaxPage() {
    const form = useAcquisitionTaxForm();

    return (
        <div className="container-custom real-estate-page">
            <Navigation />

            <CommonInputSection
                transactionType={form.transactionType}
                setTransactionType={form.setTransactionType}
                includeLand={form.includeLand}
                setIncludeLand={form.setIncludeLand}
                includeBuilding={form.includeBuilding}
                setIncludeBuilding={form.setIncludeBuilding}
            >
                {form.transactionType === 'inheritance' && (
                    <p className="notice-primary">
                        ※ 相続の場合、不動産取得税は非課税です。
                    </p>
                )}
            </CommonInputSection>

            <div className="import-bar-group no-print">
                <ImportButton
                    sourceLabel="登録免許税ページ"
                    sourcePage="registration-tax"
                    field="land"
                    onImport={form.importLandValuation}
                />
                <ImportButton
                    sourceLabel="登録免許税ページ"
                    sourcePage="registration-tax"
                    field="building"
                    onImport={form.importBuildingValuation}
                />
            </div>

            <div className="input-section input-section-flat">
                <div className="re-two-column">
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
                </div>
            </div>

            <button className="btn-calc" onClick={form.calculateTax}>計算する</button>

            {form.results !== null && (
                <div className="result-section">
                    <TaxResultBox
                        items={[
                            { label: '土地（宅地）', value: form.results.resLandAcq, show: form.includeLand && !!form.resLandValuation },
                            { label: 'その他（宅地以外）', value: form.results.otherLandAcq, show: form.includeLand && !!form.otherLandValuation },
                            { label: '建物', value: form.results.bldgAcq, show: form.includeBuilding },
                        ]}
                        totalLabel="不動産取得税 合計"
                        totalValue={form.results.totalAcq}
                    />

                    <CalculationDetails
                        results={form.results}
                        includeLand={form.includeLand}
                        includeBuilding={form.includeBuilding}
                        showDetails={form.showDetails}
                        setShowDetails={form.setShowDetails}
                        taxType="acquisition"
                    />

                    <p className="disclaimer no-print">
                        ※この計算は概算です。実際の税額は、自治体の条例や端数処理のルールにより異なる場合があります。
                    </p>
                </div>
            )}

            <PrintFooter />
        </div>
    );
}
