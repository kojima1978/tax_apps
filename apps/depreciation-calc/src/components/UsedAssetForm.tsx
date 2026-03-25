import { useId } from "react";
import FormField from "@/components/FormField";
import InputWithUnit from "@/components/InputWithUnit";
import ActionButtons from "@/components/ui/ActionButtons";
import PresetButtons from "@/components/ui/PresetButtons";
import { CheckIcon } from "@/components/ui/Icons";
import { ASSET_TYPES, STATUTORY_LIFE_PRESETS, type AssetType } from "@/lib/used-asset-life";
import { INPUT_BASE } from "@/lib/styles";

type UsedAssetFormProps = {
    assetType: AssetType;
    statutoryLife: string;
    elapsedYears: string;
    elapsedMonths: string;
    newDate: string;
    acquisitionDate: string;
    autoCalcEnabled: boolean;
    acquisitionCost: string;
    renovationCost: string;
    canCalculate: boolean;
    hasResult?: boolean;
    onDisableAutoCalc: () => void;
    onAssetTypeChange: (val: AssetType) => void;
    onStatutoryLifeChange: (val: string) => void;
    onElapsedYearsChange: (val: string) => void;
    onElapsedMonthsChange: (val: string) => void;
    onNewDateChange: (val: string) => void;
    onAcquisitionDateChange: (val: string) => void;
    onAcquisitionCostChange: (val: string) => void;
    onRenovationCostChange: (val: string) => void;
    onCalculate: () => void;
    onClear: () => void;
};

const UsedAssetForm = ({
    assetType,
    statutoryLife,
    elapsedYears,
    elapsedMonths,
    newDate,
    acquisitionDate,
    autoCalcEnabled,
    acquisitionCost,
    renovationCost,
    canCalculate,
    hasResult,
    onDisableAutoCalc,
    onAssetTypeChange,
    onStatutoryLifeChange,
    onElapsedYearsChange,
    onElapsedMonthsChange,
    onNewDateChange,
    onAcquisitionDateChange,
    onAcquisitionCostChange,
    onRenovationCostChange,
    onCalculate,
    onClear,
}: UsedAssetFormProps) => {
    const idPrefix = useId();

    return (
        <section className="p-4 sm:p-6 border-b border-gray-200 flex flex-col gap-4 sm:gap-5">
            {/* Row 1: 資産の種類 / 法定耐用年数 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-6">
                <FormField label="資産の種類" htmlFor={`${idPrefix}-asset-type`}>
                    <select
                        id={`${idPrefix}-asset-type`}
                        value={assetType}
                        onChange={(e) => onAssetTypeChange(e.target.value as AssetType)}
                        className={INPUT_BASE}
                    >
                        {ASSET_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </FormField>

                <FormField label="法定耐用年数" htmlFor={`${idPrefix}-statutory-life`}>
                    <InputWithUnit
                        id={`${idPrefix}-statutory-life`}
                        type="number"
                        unit="年"
                        value={statutoryLife}
                        onChange={(e) => onStatutoryLifeChange(e.target.value)}
                        placeholder="例: 22"
                        min="1"
                        max="100"
                    />
                    {STATUTORY_LIFE_PRESETS[assetType].length > 0 && (
                        <PresetButtons
                            items={STATUTORY_LIFE_PRESETS[assetType].map((p) => ({ label: `${p.label} ${p.years}年`, value: String(p.years) }))}
                            current={statutoryLife}
                            onChange={onStatutoryLifeChange}
                        />
                    )}
                </FormField>
            </div>

            {/* Row 2: 新築・製造日 / 取得日 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-6">
                <FormField label="新築・製造日" htmlFor={`${idPrefix}-new-date`}>
                    <input
                        id={`${idPrefix}-new-date`}
                        type="date"
                        value={newDate}
                        onChange={(e) => onNewDateChange(e.target.value)}
                        className={INPUT_BASE}
                    />
                    <small className="block text-xs text-gray-500 mt-1">経過年数を自動計算します</small>
                </FormField>

                <FormField label="取得日" htmlFor={`${idPrefix}-acquisition-date`}>
                    <input
                        id={`${idPrefix}-acquisition-date`}
                        type="date"
                        value={acquisitionDate}
                        onChange={(e) => onAcquisitionDateChange(e.target.value)}
                        className={INPUT_BASE}
                    />
                </FormField>
            </div>

            {/* Row 3: 経過年数（自動計算 or 手入力） / 取得価額 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-6">
                <FormField label="経過年数">
                    <div className="flex gap-3 max-[380px]:flex-col max-[380px]:gap-2">
                        <InputWithUnit
                            id={`${idPrefix}-elapsed-years`}
                            type="number"
                            unit="年"
                            value={elapsedYears}
                            onChange={(e) => onElapsedYearsChange(e.target.value)}
                            placeholder="0"
                            min="0"
                            max="100"
                            readOnly={autoCalcEnabled}
                            className={autoCalcEnabled ? '!bg-green-50 !border-green-700' : ''}
                        />
                        <InputWithUnit
                            id={`${idPrefix}-elapsed-months`}
                            type="number"
                            unit="ヶ月"
                            value={elapsedMonths}
                            onChange={(e) => onElapsedMonthsChange(e.target.value)}
                            placeholder="0"
                            min="0"
                            max="11"
                            readOnly={autoCalcEnabled}
                            className={autoCalcEnabled ? '!bg-green-50 !border-green-700' : ''}
                        />
                    </div>
                    {autoCalcEnabled ? (
                        <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-semibold">
                                <CheckIcon />
                                自動計算済み
                            </span>
                            <button
                                type="button"
                                onClick={onDisableAutoCalc}
                                className="text-xs text-green-700 underline cursor-pointer hover:text-green-900 bg-transparent border-none p-0"
                            >
                                手入力に切り替え
                            </button>
                        </div>
                    ) : (
                        <small className="block text-xs text-gray-500 mt-1">日付を入力すると自動計算、または直接入力</small>
                    )}
                </FormField>

                <FormField label="取得価額" htmlFor={`${idPrefix}-acquisition-cost`}>
                    <InputWithUnit
                        id={`${idPrefix}-acquisition-cost`}
                        type="text"
                        unit="円"
                        value={acquisitionCost}
                        onChange={(e) => onAcquisitionCostChange(e.target.value)}
                        placeholder="例: 10,000,000"
                    />
                </FormField>
            </div>

            {/* Row 4: 改修費 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-6">
                <FormField label="改修・資本的支出額" htmlFor={`${idPrefix}-renovation-cost`}>
                    <InputWithUnit
                        id={`${idPrefix}-renovation-cost`}
                        type="text"
                        unit="円"
                        value={renovationCost}
                        onChange={(e) => onRenovationCostChange(e.target.value)}
                        placeholder="例: 3,000,000"
                    />
                    <small className="block text-xs text-gray-500 mt-1">取得価額の50%を超える場合、簡便法は適用できません</small>
                </FormField>
                <div />
            </div>

            {/* ボタン */}
            <ActionButtons canCalculate={canCalculate} hasResult={hasResult} onCalculate={onCalculate} onClear={onClear} />
        </section>
    );
};

export default UsedAssetForm;
