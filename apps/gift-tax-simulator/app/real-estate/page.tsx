"use client";

import PrintFooter from '@/components/PrintFooter';
import Navigation from '@/components/Navigation';
import LandInputSection from '@/components/real-estate/LandInputSection';
import BuildingInputSection from '@/components/real-estate/BuildingInputSection';
import CalculationDetails from '@/components/real-estate/CalculationDetails';
import { formatCurrency, type TransactionType } from '@/lib/real-estate-tax';
import { useRealEstateForm } from '@/hooks/useRealEstateForm';

export default function RealEstatePage() {
    const form = useRealEstateForm();

    return (
        <div className="container-custom real-estate-page">
            <Navigation title="間接税シミュレーター" activePage="real-estate" />

            {/* 取引種別・計算対象 */}
            <div className="input-section">
                <div className="input-group-row">
                    <div className="input-item">
                        <label htmlFor="transactionType">登記原因 (取引種別)</label>
                        <select
                            id="transactionType"
                            value={form.transactionType}
                            onChange={(e) => form.setTransactionType(e.target.value as TransactionType)}
                        >
                            <option value="purchase">売買 (購入)</option>
                            <option value="new_build">新築 (建物の保存登記)</option>
                            <option value="inheritance">相続</option>
                            <option value="gift">贈与</option>
                        </select>
                    </div>
                    <div className="input-item toggle-buttons">
                        <label>計算対象</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                type="button"
                                className={`toggle-btn ${form.includeLand ? 'active' : ''}`}
                                onClick={() => form.setIncludeLand(!form.includeLand)}
                            >
                                土地
                            </button>
                            <button
                                type="button"
                                className={`toggle-btn ${form.includeBuilding ? 'active' : ''}`}
                                onClick={() => form.setIncludeBuilding(!form.includeBuilding)}
                            >
                                建物
                            </button>
                        </div>
                    </div>
                </div>
                {form.transactionType === 'inheritance' && (
                    <p style={{ color: 'var(--primary-color)', fontWeight: 'bold', marginTop: '0.5rem' }}>
                        ※ 相続の場合、不動産取得税は非課税です。
                    </p>
                )}
            </div>

            {/* 土地・建物入力 */}
            <div className="input-section" style={{ borderBottom: 'none' }}>
                <div className="re-two-column">
                    <LandInputSection
                        disabled={!form.includeLand}
                        valuation={form.landValuation}
                        area={form.landArea}
                        landType={form.landType}
                        setLandType={form.setLandType}
                        onValuationChange={(e) => form.handleFormattedInput(e, form.setLandValuation)}
                        onAreaChange={(e) => form.handleFormattedInput(e, form.setLandArea)}
                    />
                    <BuildingInputSection
                        disabled={!form.includeBuilding}
                        valuation={form.buildingValuation}
                        area={form.buildingArea}
                        selYear={form.selYear}
                        selMonth={form.selMonth}
                        selDay={form.selDay}
                        isResidential={form.isResidential}
                        hasHousingCertificate={form.hasHousingCertificate}
                        acquisitionDeduction={form.acquisitionDeduction}
                        deductionMessage={form.deductionMessage}
                        yearOptions={form.yearOptions}
                        onValuationChange={(e) => form.handleFormattedInput(e, form.setBuildingValuation)}
                        onAreaChange={(e) => form.handleFormattedInput(e, form.setBuildingArea)}
                        setSelYear={form.setSelYear}
                        setSelMonth={form.setSelMonth}
                        setSelDay={form.setSelDay}
                        setIsResidential={form.setIsResidential}
                        setHasHousingCertificate={form.setHasHousingCertificate}
                        onDeductionChange={(e) => form.handleFormattedInput(e, form.setAcquisitionDeduction)}
                    />
                </div>
            </div>

            {/* 計算結果 */}
            <div className="result-section">
                <div className="re-result-box">
                    <div className="re-result-row">
                        <div className="re-result-item">
                            <span className="re-result-label">不動産取得税</span>
                            <span className="re-result-sub">
                                {form.includeLand && `土地: ${formatCurrency(form.results.landAcq)}`}
                                {form.includeLand && form.includeBuilding && ' / '}
                                {form.includeBuilding && `建物: ${formatCurrency(form.results.bldgAcq)}`}
                            </span>
                            <span className="re-result-value">{formatCurrency(form.results.totalAcq)}</span>
                        </div>
                        <div className="re-result-item">
                            <span className="re-result-label">登録免許税</span>
                            <span className="re-result-sub">
                                {form.includeLand && `土地: ${formatCurrency(form.results.landReg)}`}
                                {form.includeLand && form.includeBuilding && ' / '}
                                {form.includeBuilding && `建物: ${formatCurrency(form.results.bldgReg)}`}
                            </span>
                            <span className="re-result-value">{formatCurrency(form.results.totalReg)}</span>
                        </div>
                    </div>
                    <div className="re-result-total">
                        <span>合計納税額</span>
                        <span className="total-value">{formatCurrency(form.results.total)}</span>
                    </div>
                </div>

                <CalculationDetails
                    results={form.results}
                    includeLand={form.includeLand}
                    includeBuilding={form.includeBuilding}
                    showDetails={form.showDetails}
                    setShowDetails={form.setShowDetails}
                />

                <p className="disclaimer no-print">
                    ※この計算は概算です。実際の税額は、自治体の条例や端数処理のルールにより異なる場合があります。
                </p>
            </div>

            <PrintFooter />
        </div>
    );
}
