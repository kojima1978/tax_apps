import PrintFooter from '@/components/PrintFooter';
import Navigation from '@/components/Navigation';
import CommonInputSection from '@/components/shared/CommonInputSection';
import TaxResultBox from '@/components/shared/TaxResultBox';
import CalculationDetails from '@/components/shared/CalculationDetails';
import { useRegistrationTaxForm } from '@/hooks/useRegistrationTaxForm';

export default function RegistrationTaxPage() {
    const form = useRegistrationTaxForm();

    return (
        <div className="container-custom real-estate-page">
            <Navigation title="登録免許税シミュレーター" activePage="registration-tax" />

            <CommonInputSection
                transactionType={form.transactionType}
                setTransactionType={form.setTransactionType}
                includeLand={form.includeLand}
                setIncludeLand={form.setIncludeLand}
                includeBuilding={form.includeBuilding}
                setIncludeBuilding={form.setIncludeBuilding}
            />

            <div className="input-section" style={{ borderBottom: 'none' }}>
                <div className="re-two-column">
                    {/* 土地: 評価額のみ */}
                    <div className={`re-column ${!form.includeLand ? 'disabled' : ''}`}>
                        <h3 className="re-column-title">土地の情報</h3>
                        <div className="input-item">
                            <label>固定資産税評価額</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="例: 15,000,000"
                                value={form.landValuation}
                                onChange={(e) => form.handleFormattedInput(e, form.setLandValuation)}
                                disabled={!form.includeLand}
                            />
                        </div>
                    </div>

                    {/* 建物: 評価額 + 居住用 + 住宅用家屋証明 */}
                    <div className={`re-column ${!form.includeBuilding ? 'disabled' : ''}`}>
                        <h3 className="re-column-title">建物の情報</h3>
                        <div className="input-item">
                            <label>固定資産税評価額</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="例: 10,000,000"
                                value={form.buildingValuation}
                                onChange={(e) => form.handleFormattedInput(e, form.setBuildingValuation)}
                                disabled={!form.includeBuilding}
                            />
                        </div>
                        <div className="input-item">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    checked={form.isResidential}
                                    onChange={(e) => form.setIsResidential(e.target.checked)}
                                    disabled={!form.includeBuilding}
                                />
                                居住用である
                            </label>
                        </div>
                        {form.isResidential && (
                            <div className="input-item">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={form.hasHousingCertificate}
                                        onChange={(e) => form.setHasHousingCertificate(e.target.checked)}
                                        disabled={!form.includeBuilding}
                                    />
                                    住宅用家屋証明書あり
                                </label>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <button className="btn-calc" onClick={form.calculateTax}>計算する</button>

            {form.results !== null && (
                <div className="result-section">
                    <TaxResultBox
                        items={[
                            { label: '土地', value: form.results.landReg, show: form.includeLand },
                            { label: '建物', value: form.results.bldgReg, show: form.includeBuilding },
                        ]}
                        totalLabel="登録免許税 合計"
                        totalValue={form.results.totalReg}
                    />

                    <CalculationDetails
                        results={form.results}
                        includeLand={form.includeLand}
                        includeBuilding={form.includeBuilding}
                        showDetails={form.showDetails}
                        setShowDetails={form.setShowDetails}
                        taxType="registration"
                    />

                    <p className="disclaimer no-print">
                        ※この計算は概算です。実際の税額は、端数処理のルールにより異なる場合があります。
                    </p>
                </div>
            )}

            <PrintFooter />
        </div>
    );
}
