import { useMemo } from 'react';
import RealEstatePageLayout from '@/components/shared/RealEstatePageLayout';
import FormattedNumberInput from '@/components/shared/FormattedNumberInput';
import TaxReference from '@/components/registration-tax/TaxReference';
import ShareInput from '@/components/shared/ShareInput';
import { compactRows, shareRow, usageRow, yesNoRow, yenRow } from '@/lib/print-conditions';
import { registrationResultItems, shareNoteText } from '@/lib/real-estate-result';
import { useRegistrationTaxForm } from '@/hooks/useRegistrationTaxForm';

export default function RegistrationTaxPage() {
    const form = useRegistrationTaxForm();

    const shareNote = useMemo(() => shareNoteText(
        form.landShareNumerator, form.landShareDenominator,
        form.buildingShareNumerator, form.buildingShareDenominator,
    ), [
        form.landShareNumerator, form.landShareDenominator,
        form.buildingShareNumerator, form.buildingShareDenominator,
    ]);

    const resultSections = useMemo(() => form.results ? [{
        key: 'registration',
        items: registrationResultItems(form.results, form.includeLand, form.includeBuilding),
        totalLabel: '登録免許税 合計',
        totalValue: form.results.totalReg,
        shareNote,
        details: { results: form.results, taxType: 'registration' as const },
    }] : [], [form.results, form.includeLand, form.includeBuilding, shareNote]);

    // 印刷用の入力条件。選択していない対象・未入力欄は行ごと落とす
    const printConditionGroups = useMemo(() => [
        {
            title: '土地',
            rows: form.includeLand ? compactRows([
                yenRow('固定資産税評価額', form.landValuation),
                shareRow(form.landShareNumerator, form.landShareDenominator),
            ]) : [],
        },
        {
            title: '建物',
            rows: form.includeBuilding ? compactRows([
                yenRow('固定資産税評価額', form.buildingValuation),
                usageRow(form.isResidential),
                // 税率が変わるので「なし」も紙に残す
                form.isResidential ? yesNoRow('住宅用家屋証明書', form.hasHousingCertificate) : null,
                shareRow(form.buildingShareNumerator, form.buildingShareDenominator),
            ]) : [],
        },
    ], [
        form.includeLand, form.landValuation, form.landShareNumerator, form.landShareDenominator,
        form.includeBuilding, form.buildingValuation, form.isResidential, form.hasHousingCertificate,
        form.buildingShareNumerator, form.buildingShareDenominator,
    ]);

    return (
        <RealEstatePageLayout
            transactionType={form.transactionType}
            setTransactionType={form.setTransactionType}
            includeLand={form.includeLand}
            setIncludeLand={form.setIncludeLand}
            includeBuilding={form.includeBuilding}
            setIncludeBuilding={form.setIncludeBuilding}
            importConfig={{
                sources: ['acquisition-tax', 'real-estate-summary'],
                onImport: form.importFrom,
            }}
            inputColumns={
                <>
                    {/* 土地: 評価額 + 持ち分 */}
                    <div className={`re-column ${!form.includeLand ? 'disabled' : ''}`}>
                        <h3 className="re-column-title">土地の情報</h3>
                        {!form.includeLand && (
                            <p className="disabled-section-message">計算対象で「土地」を選択すると入力できます</p>
                        )}
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
                        {!form.includeBuilding && (
                            <p className="disabled-section-message">計算対象で「建物」を選択すると入力できます</p>
                        )}
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
            printConditionGroups={printConditionGroups}
            onCalculate={form.calculateTax}
            onSample={form.handleSample}
            onReset={form.resetForm}
            errorMsg={form.errorMsg}
            resultSections={resultSections}
            disclaimer="※この計算は概算です。実際の税額は、端数処理のルールにより異なる場合があります。"
            isStale={form.isStale}
            showDetails={form.showDetails}
            setShowDetails={form.setShowDetails}
            printTitle="登録免許税シミュレーション"
            reference={<TaxReference />}
        />
    );
}
