import { useId } from "react";
import FormField from "@/components/FormField";
import InputWithUnit from "@/components/InputWithUnit";
import { ASSET_TYPES, STATUTORY_LIFE_PRESETS, type AssetType } from "@/lib/used-asset-life";

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
                        className="p-3 border border-gray-300 rounded text-base w-full focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
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
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {STATUTORY_LIFE_PRESETS[assetType].map((p) => (
                                <button
                                    key={p.label}
                                    type="button"
                                    onClick={() => onStatutoryLifeChange(String(p.years))}
                                    className={`px-2 py-0.5 rounded-full text-xs border transition-colors cursor-pointer ${
                                        statutoryLife === String(p.years)
                                            ? 'bg-green-700 text-white border-green-700'
                                            : 'bg-white text-green-800 border-green-300 hover:bg-green-50 hover:border-green-500'
                                    }`}
                                >
                                    {p.label} {p.years}年
                                </button>
                            ))}
                        </div>
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
                        className="p-3 border border-gray-300 rounded text-base w-full focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
                    />
                    <small className="block text-xs text-gray-500 mt-1">経過年数を自動計算します</small>
                </FormField>

                <FormField label="取得日" htmlFor={`${idPrefix}-acquisition-date`}>
                    <input
                        id={`${idPrefix}-acquisition-date`}
                        type="date"
                        value={acquisitionDate}
                        onChange={(e) => onAcquisitionDateChange(e.target.value)}
                        className="p-3 border border-gray-300 rounded text-base w-full focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
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
                        <small className="block text-xs text-green-700 font-semibold mt-1">日付から自動計算済み（手入力で上書きできます）</small>
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
            <div className="flex gap-3 no-print">
                <button
                    className="flex-1 bg-green-800 text-white border-none py-3 px-6 rounded text-lg font-bold cursor-pointer transition-colors hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    onClick={onCalculate}
                    disabled={!canCalculate}
                >
                    計算する
                    <span className="text-xs font-normal opacity-70 ml-2 hidden sm:inline">(Ctrl+Enter)</span>
                </button>
                <button
                    className="bg-white text-gray-500 border border-gray-300 py-3 px-4 rounded font-semibold cursor-pointer whitespace-nowrap transition-colors hover:bg-gray-100 hover:border-gray-400 hover:text-gray-800"
                    onClick={onClear}
                >
                    クリア
                </button>
            </div>
        </section>
    );
};

export default UsedAssetForm;
