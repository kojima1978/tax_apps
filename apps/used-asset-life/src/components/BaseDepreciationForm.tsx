import { type ReactNode } from "react";
import { useId } from "react";
import FormField from "@/components/FormField";
import InputWithUnit from "@/components/InputWithUnit";
import { ASSET_TYPES, STATUTORY_LIFE_PRESETS, type AssetType } from "@/lib/used-asset-life";
import { type DepreciationMethod, type MethodWithSuggestion } from "@/lib/depreciation";

const FISCAL_YEAR_END_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}月`,
}));

export type BaseDepreciationFormProps = {
    assetType: AssetType;
    acquisitionCost: string;
    usefulLife: string;
    method: DepreciationMethod;
    acquisitionDate: string;
    serviceStartDate: string;
    fiscalYearEndMonth: string;
    canCalculate: boolean;
    availableMethods: MethodWithSuggestion[];
    suggestedLabel: string;
    isMethodSuggested: boolean;
    carriedOver: boolean;
    carriedOverLabel?: string;
    onAssetTypeChange: (val: AssetType) => void;
    onAcquisitionCostChange: (val: string) => void;
    onUsefulLifeChange: (val: string) => void;
    onMethodChange: (val: DepreciationMethod) => void;
    onAcquisitionDateChange: (val: string) => void;
    onServiceStartDateChange: (val: string) => void;
    onFiscalYearEndMonthChange: (val: string) => void;
    onCalculate: () => void;
    onClear: () => void;
    /** 償却方法/決算月の後、ボタンの前に追加するフィールド */
    extraFields?: ReactNode;
};

const BaseDepreciationForm = ({
    assetType,
    acquisitionCost,
    usefulLife,
    method,
    acquisitionDate,
    serviceStartDate,
    fiscalYearEndMonth,
    canCalculate,
    availableMethods,
    suggestedLabel,
    isMethodSuggested,
    carriedOver,
    carriedOverLabel = '耐用年数計算から連携',
    onAssetTypeChange,
    onAcquisitionCostChange,
    onUsefulLifeChange,
    onMethodChange,
    onAcquisitionDateChange,
    onServiceStartDateChange,
    onFiscalYearEndMonthChange,
    onCalculate,
    onClear,
    extraFields,
}: BaseDepreciationFormProps) => {
    const idPrefix = useId();

    return (
        <section className="p-4 sm:p-6 border-b border-gray-200 flex flex-col gap-4 sm:gap-5">
            {/* Row 1: 資産の種類 / 取得価額 */}
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

                <FormField label="取得価額" htmlFor={`${idPrefix}-cost`}>
                    <InputWithUnit
                        id={`${idPrefix}-cost`}
                        type="text"
                        unit="円"
                        value={acquisitionCost}
                        onChange={(e) => onAcquisitionCostChange(e.target.value)}
                        placeholder="例: 10,000,000"
                    />
                </FormField>
            </div>

            {/* Row 2: 耐用年数 + プリセット */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-6">
                <FormField label="耐用年数" htmlFor={`${idPrefix}-life`}>
                    <InputWithUnit
                        id={`${idPrefix}-life`}
                        type="number"
                        unit="年"
                        value={usefulLife}
                        onChange={(e) => onUsefulLifeChange(e.target.value)}
                        placeholder="例: 22"
                        min="2"
                        max="100"
                    />
                    {STATUTORY_LIFE_PRESETS[assetType].length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {STATUTORY_LIFE_PRESETS[assetType].map((p) => (
                                <button
                                    key={p.label}
                                    type="button"
                                    onClick={() => onUsefulLifeChange(String(p.years))}
                                    className={`px-2 py-0.5 rounded-full text-xs border transition-colors cursor-pointer ${
                                        usefulLife === String(p.years)
                                            ? 'bg-green-700 text-white border-green-700'
                                            : 'bg-white text-green-800 border-green-300 hover:bg-green-50 hover:border-green-500'
                                    }`}
                                >
                                    {p.label} {p.years}年
                                </button>
                            ))}
                        </div>
                    )}
                    {carriedOver && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-semibold">
                            {carriedOverLabel}
                        </span>
                    )}
                </FormField>
                <div />
            </div>

            {/* Row 3: 取得日 / 事業供用日 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-6">
                <FormField label="取得日" htmlFor={`${idPrefix}-acq-date`}>
                    <input
                        id={`${idPrefix}-acq-date`}
                        type="date"
                        value={acquisitionDate}
                        onChange={(e) => onAcquisitionDateChange(e.target.value)}
                        className="p-3 border border-gray-300 rounded text-base w-full focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
                    />
                    <small className="block text-xs text-gray-500 mt-1">
                        償却方法の判定に使用（H19.4/H24.4 境界）
                    </small>
                </FormField>

                <FormField label="事業供用日" htmlFor={`${idPrefix}-service-date`}>
                    <div className="flex gap-2">
                        <input
                            id={`${idPrefix}-service-date`}
                            type="date"
                            value={serviceStartDate}
                            onChange={(e) => onServiceStartDateChange(e.target.value)}
                            className="p-3 border border-gray-300 rounded text-base w-full focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
                        />
                        <button
                            type="button"
                            onClick={() => { if (acquisitionDate) onServiceStartDateChange(acquisitionDate); }}
                            disabled={!acquisitionDate}
                            className="px-3 py-1 bg-green-50 border border-green-300 rounded text-xs text-green-800 font-semibold whitespace-nowrap cursor-pointer transition-colors hover:bg-green-100 hover:border-green-500 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="取得日を複写"
                        >
                            複写
                        </button>
                    </div>
                    <small className="block text-xs text-gray-500 mt-1">
                        月割計算の起算日
                    </small>
                </FormField>
            </div>

            {/* Row 4: 償却方法 / 決算月 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-6">
                <FormField label="償却方法" htmlFor={`${idPrefix}-method`}>
                    <select
                        id={`${idPrefix}-method`}
                        value={method}
                        onChange={(e) => onMethodChange(e.target.value as DepreciationMethod)}
                        className="p-3 border border-gray-300 rounded text-base w-full focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
                    >
                        {availableMethods.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label}{m.suggested ? '（推奨）' : ''}
                            </option>
                        ))}
                    </select>
                    {!acquisitionDate && (
                        <small className="block text-xs text-gray-500 mt-1">
                            取得日を入力すると推奨が表示されます
                        </small>
                    )}
                    {acquisitionDate && !isMethodSuggested && (
                        <small className="block text-xs text-orange-500 mt-1 font-semibold">
                            取得日({acquisitionDate})の場合、通常は{suggestedLabel}が適用されます。
                        </small>
                    )}
                </FormField>

                <FormField label="決算月" htmlFor={`${idPrefix}-fiscal`}>
                    <select
                        id={`${idPrefix}-fiscal`}
                        value={fiscalYearEndMonth}
                        onChange={(e) => onFiscalYearEndMonthChange(e.target.value)}
                        className="p-3 border border-gray-300 rounded text-base w-full focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
                    >
                        {FISCAL_YEAR_END_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </FormField>
            </div>

            {/* 各タブ固有のフィールド */}
            {extraFields}

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

export default BaseDepreciationForm;
