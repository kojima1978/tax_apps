import { type DepreciationResult } from "@/lib/depreciation";
import { formatCurrency } from "@/lib/utils";
import DepreciationScheduleTable from "@/components/DepreciationScheduleTable";

type DepreciationResultProps = {
    result: DepreciationResult | null;
    isDirty: boolean;
    onCarryOverFiveYear?: () => void;
};

const DepreciationResultSection = ({ result, isDirty, onCarryOverFiveYear }: DepreciationResultProps) => {
    if (!result) {
        return (
            <section className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-green-800 mb-4">償却スケジュール</h2>
                <div className="flex items-center justify-center py-8">
                    <div className="text-center text-gray-400">
                        <div className="text-5xl mb-2">📊</div>
                        <p className="text-sm my-1">取得価額・耐用年数・取得日・事業供用日を入力し</p>
                        <p className="text-sm my-1">「計算する」ボタンを押してください</p>
                        <p className="text-xs text-gray-300 mt-2">Ctrl+Enter でも計算できます</p>
                    </div>
                </div>
            </section>
        );
    }

    const { input, methodLabel, appliedRate, revisedRate, guaranteeAmount, schedule, bookValueAtTarget, targetPeriodLabel } = result;

    return (
        <section className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-green-800 mb-4">償却スケジュール</h2>

            {isDirty && (
                <div className="p-3 bg-orange-50 border border-orange-500 rounded text-orange-600 text-sm font-semibold mb-4 no-print">
                    入力値が変更されています。再計算してください。
                </div>
            )}

            {/* 条件タグ */}
            <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-600">{methodLabel}</span>
                <span className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-600">耐用年数: {input.usefulLife}年</span>
                <span className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-600">取得価額: {formatCurrency(input.acquisitionCost)}円</span>
                <span className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-600">決算月: {input.fiscalYearEndMonth}月</span>
            </div>

            {/* 適用率サマリー */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-md mb-4">
                <h3 className="text-sm font-bold text-green-800 mb-2 m-0">適用償却率</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    <div>
                        <span className="text-gray-500">償却率: </span>
                        <span className="font-mono-num font-bold text-green-900">{appliedRate}</span>
                    </div>
                    {revisedRate !== undefined && revisedRate !== appliedRate && (
                        <div>
                            <span className="text-gray-500">改定償却率: </span>
                            <span className="font-mono-num font-bold text-green-900">{revisedRate}</span>
                        </div>
                    )}
                    {guaranteeAmount !== undefined && guaranteeAmount > 0 && (
                        <div>
                            <span className="text-gray-500">償却保証額: </span>
                            <span className="font-mono-num font-bold text-green-900">{formatCurrency(guaranteeAmount)}円</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 基準日の簿価ハイライト */}
            {bookValueAtTarget !== undefined && input.targetDate && (
                <div className="p-5 bg-green-50 border-2 border-green-700 rounded-lg text-center mb-4">
                    <p className="text-sm text-green-900 font-semibold mb-1 m-0">
                        {input.targetDate} 時点の残存簿価
                    </p>
                    {targetPeriodLabel && (
                        <p className="text-xs text-green-700 mb-2 m-0">（{targetPeriodLabel} 期末時点）</p>
                    )}
                    <p className="text-4xl sm:text-5xl font-bold text-green-800 font-mono-num m-0">
                        {formatCurrency(bookValueAtTarget)}<span className="text-2xl sm:text-3xl">円</span>
                    </p>
                </div>
            )}

            {/* 償却スケジュール表 */}
            <DepreciationScheduleTable rows={schedule} />

            {/* 期間償却タブへの連携 */}
            {onCarryOverFiveYear && (
                <div className="text-center mb-4 no-print">
                    <button
                        type="button"
                        onClick={onCarryOverFiveYear}
                        className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded cursor-pointer transition-colors hover:bg-green-600"
                    >
                        この条件で期間償却へ →
                    </button>
                </div>
            )}

            {/* 免責事項 */}
            <p className="text-center text-xs text-gray-500 mt-3">
                ※ 本計算は概算です。実際の適用にあたっては税理士にご相談ください。
            </p>
        </section>
    );
};

export default DepreciationResultSection;
