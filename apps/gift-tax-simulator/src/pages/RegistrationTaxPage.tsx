import { useMemo } from 'react';
import RealEstatePageLayout from '@/components/shared/RealEstatePageLayout';
import FormattedNumberInput from '@/components/shared/FormattedNumberInput';
import { useRegistrationTaxForm } from '@/hooks/useRegistrationTaxForm';

const ShareInput = ({
    numerator, denominator, onNumeratorChange, onDenominatorChange, disabled,
}: {
    numerator: string; denominator: string;
    onNumeratorChange: (v: string) => void; onDenominatorChange: (v: string) => void;
    disabled: boolean;
}) => (
    <div className="input-item share-input-row">
        <label>持ち分</label>
        <div className="share-fraction">
            <input type="number" min="1" max="100" value={numerator}
                onChange={e => onNumeratorChange(e.target.value)} disabled={disabled} />
            <span>/</span>
            <input type="number" min="1" max="100" value={denominator}
                onChange={e => onDenominatorChange(e.target.value)} disabled={disabled} />
        </div>
    </div>
);

export default function RegistrationTaxPage() {
    const form = useRegistrationTaxForm();

    const lN = Math.max(1, parseInt(form.landShareNumerator) || 1);
    const lD = Math.max(1, parseInt(form.landShareDenominator) || 1);
    const bN = Math.max(1, parseInt(form.buildingShareNumerator) || 1);
    const bD = Math.max(1, parseInt(form.buildingShareDenominator) || 1);

    const resultConfig = useMemo(() => form.results ? {
        items: [
            { label: '土地', value: form.results.landReg, show: form.includeLand },
            { label: '建物', value: form.results.bldgReg, show: form.includeBuilding },
        ],
        totalLabel: '登録免許税 合計',
        totalValue: form.results.totalReg,
        taxType: 'registration' as const,
        disclaimer: '※この計算は概算です。実際の税額は、端数処理のルールにより異なる場合があります。',
        shareNote: [
            (lN !== lD ? `土地持ち分 ${lN}/${lD}` : ''),
            (bN !== bD ? `建物持ち分 ${bN}/${bD}` : ''),
        ].filter(Boolean).join('　') || undefined,
    } : null, [form.results, form.includeLand, form.includeBuilding, lN, lD, bN, bD]);

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
                    {/* 土地: 評価額 + 持ち分 */}
                    <div className={`re-column ${!form.includeLand ? 'disabled' : ''}`}>
                        <h3 className="re-column-title">土地の情報</h3>
                        <FormattedNumberInput
                            label="固定資産税評価額"
                            placeholder="例: 15,000,000"
                            value={form.landValuation}
                            onChange={(e) => form.handleFormattedInput(e, form.setLandValuation)}
                            disabled={!form.includeLand}
                        />
                        <ShareInput
                            numerator={form.landShareNumerator}
                            denominator={form.landShareDenominator}
                            onNumeratorChange={form.setLandShareNumerator}
                            onDenominatorChange={form.setLandShareDenominator}
                            disabled={!form.includeLand}
                        />
                    </div>

                    {/* 建物: 評価額 + 居住用 + 住宅用家屋証明 + 持ち分 */}
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
                        <ShareInput
                            numerator={form.buildingShareNumerator}
                            denominator={form.buildingShareDenominator}
                            onNumeratorChange={form.setBuildingShareNumerator}
                            onDenominatorChange={form.setBuildingShareDenominator}
                            disabled={!form.includeBuilding}
                        />
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
