import { useMemo } from 'react';
import RealEstatePageLayout from '@/components/shared/RealEstatePageLayout';
import FormattedNumberInput from '@/components/shared/FormattedNumberInput';
import { useRegistrationTaxForm } from '@/hooks/useRegistrationTaxForm';

export default function RegistrationTaxPage() {
    const form = useRegistrationTaxForm();

    const resultConfig = useMemo(() => form.results ? {
        items: [
            { label: '土地', value: form.results.landReg, show: form.includeLand },
            { label: '建物', value: form.results.bldgReg, show: form.includeBuilding },
        ],
        totalLabel: '登録免許税 合計',
        totalValue: form.results.totalReg,
        taxType: 'registration' as const,
        disclaimer: '※この計算は概算です。実際の税額は、端数処理のルールにより異なる場合があります。',
    } : null, [form.results, form.includeLand, form.includeBuilding]);

    return (
        <RealEstatePageLayout
            transactionType={form.transactionType}
            setTransactionType={form.setTransactionType}
            includeLand={form.includeLand}
            setIncludeLand={form.setIncludeLand}
            includeBuilding={form.includeBuilding}
            setIncludeBuilding={form.setIncludeBuilding}
            importConfig={{
                sourceLabel: '不動産取得税ページ',
                sourcePage: 'acquisition-tax',
                onLandImport: form.importLandValuation,
                onBuildingImport: form.importBuildingValuation,
            }}
            inputColumns={
                <>
                    {/* 土地: 評価額のみ */}
                    <div className={`re-column ${!form.includeLand ? 'disabled' : ''}`}>
                        <h3 className="re-column-title">土地の情報</h3>
                        <FormattedNumberInput
                            label="固定資産税評価額"
                            placeholder="例: 15,000,000"
                            value={form.landValuation}
                            onChange={(e) => form.handleFormattedInput(e, form.setLandValuation)}
                            disabled={!form.includeLand}
                        />
                    </div>

                    {/* 建物: 評価額 + 居住用 + 住宅用家屋証明 */}
                    <div className={`re-column ${!form.includeBuilding ? 'disabled' : ''}`}>
                        <h3 className="re-column-title">建物の情報</h3>
                        <FormattedNumberInput
                            label="固定資産税評価額"
                            placeholder="例: 10,000,000"
                            value={form.buildingValuation}
                            onChange={(e) => form.handleFormattedInput(e, form.setBuildingValuation)}
                            disabled={!form.includeBuilding}
                        />
                        <div className="input-item">
                            <label className="checkbox-label">
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
                                <label className="checkbox-label">
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
                </>
            }
            onCalculate={form.calculateTax}
            errorMsg={form.errorMsg}
            results={form.results}
            resultConfig={resultConfig}
            showDetails={form.showDetails}
            setShowDetails={form.setShowDetails}
            printTitle="登録免許税シミュレーション"
        />
    );
}
