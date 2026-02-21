import PrintFooter from '@/components/PrintFooter';
import Navigation from '@/components/Navigation';
import LandInput from '@/components/acquisition-tax/LandInput';
import BuildingInput from '@/components/acquisition-tax/BuildingInput';
import CommonInputSection from '@/components/shared/CommonInputSection';
import TaxResultBox from '@/components/shared/TaxResultBox';
import CalculationDetails from '@/components/shared/CalculationDetails';
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
                    <p style={{ color: 'var(--primary-color)', fontWeight: 'bold', marginTop: '0.5rem' }}>
                        ※ 相続の場合、不動産取得税は非課税です。
                    </p>
                )}
            </CommonInputSection>

            <div className="input-section" style={{ borderBottom: 'none' }}>
                <div className="re-two-column">
                    <LandInput
                        disabled={!form.includeLand}
                        valuation={form.landValuation}
                        area={form.landArea}
                        landType={form.landType}
                        setLandType={form.setLandType}
                        onValuationChange={(e) => form.handleFormattedInput(e, form.setLandValuation)}
                        onAreaChange={(e) => form.handleFormattedInput(e, form.setLandArea)}
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
                            { label: '土地', value: form.results.landAcq, show: form.includeLand },
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
