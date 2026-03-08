import { type DepreciationResult } from "@/lib/depreciation";
import { formatCurrency } from "@/lib/utils";
import DepreciationScheduleTable from "@/components/DepreciationScheduleTable";
import DirtyWarning from "@/components/ui/DirtyWarning";
import ConditionTags from "@/components/ui/ConditionTags";
import EmptyState from "@/components/ui/EmptyState";
import HighlightCard from "@/components/ui/HighlightCard";
import Disclaimer from "@/components/ui/Disclaimer";

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
                <EmptyState icon="📊" lines={['取得価額・耐用年数・取得日・事業供用日を入力し', '「計算する」ボタンを押してください']} />
            </section>
        );
    }

    const { input, methodLabel, appliedRate, revisedRate, guaranteeAmount, schedule, bookValueAtTarget, targetPeriodLabel } = result;

    return (
        <section className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-green-800 mb-4">償却スケジュール</h2>

            <DirtyWarning isDirty={isDirty} />

            {/* 条件タグ */}
            <ConditionTags tags={[
                methodLabel,
                `耐用年数: ${input.usefulLife}年`,
                `取得価額: ${formatCurrency(input.acquisitionCost)}円`,
                `決算月: ${input.fiscalYearEndMonth}月`,
            ]} />

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
                <HighlightCard
                    label={`${input.targetDate} 時点の残存簿価`}
                    sublabel={targetPeriodLabel ? `（${targetPeriodLabel} 期末時点）` : undefined}
                    value={formatCurrency(bookValueAtTarget)}
                    unit="円"
                />
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
            <Disclaimer />
        </section>
    );
};

export default DepreciationResultSection;
