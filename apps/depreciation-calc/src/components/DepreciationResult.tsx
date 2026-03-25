import { type DepreciationResult } from "@/lib/depreciation";
import { formatCurrency } from "@/lib/utils";
import DepreciationScheduleTable from "@/components/DepreciationScheduleTable";
import ResultLayout from "@/components/ui/ResultLayout";
import HighlightCard from "@/components/ui/HighlightCard";

const BarChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="12" x2="12" y1="20" y2="10" /><line x1="18" x2="18" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="16" />
    </svg>
);

type DepreciationResultProps = {
    result: DepreciationResult | null;
    isDirty: boolean;
    onCarryOverFiveYear?: () => void;
};

const DepreciationResultSection = ({ result, isDirty, onCarryOverFiveYear }: DepreciationResultProps) => (
    <ResultLayout
        title="償却スケジュール"
        emptyIcon={<BarChartIcon />}
        emptyLines={['取得価額・耐用年数・取得日・事業供用日を入力し', '「計算する」ボタンを押してください']}
        hasResult={!!result}
        isDirty={isDirty}
        tags={result ? [
            result.methodLabel,
            `耐用年数: ${result.input.usefulLife}年`,
            `取得価額: ${formatCurrency(result.input.acquisitionCost)}円`,
            `決算月: ${result.input.fiscalYearEndMonth}月`,
        ] : []}
    >
        {result && (
            <>
                {/* 適用率サマリー */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-md mb-4">
                    <h3 className="text-sm font-bold text-green-800 mb-2 m-0">適用償却率</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                        <div>
                            <span className="text-gray-500">償却率: </span>
                            <span className="font-mono-num font-bold text-green-900">{result.appliedRate}</span>
                        </div>
                        {result.revisedRate !== undefined && result.revisedRate !== result.appliedRate && (
                            <div>
                                <span className="text-gray-500">改定償却率: </span>
                                <span className="font-mono-num font-bold text-green-900">{result.revisedRate}</span>
                            </div>
                        )}
                        {result.guaranteeAmount !== undefined && result.guaranteeAmount > 0 && (
                            <div>
                                <span className="text-gray-500">償却保証額: </span>
                                <span className="font-mono-num font-bold text-green-900">{formatCurrency(result.guaranteeAmount)}円</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 基準日の簿価ハイライト */}
                {result.bookValueAtTarget !== undefined && result.input.targetDate && (
                    <HighlightCard
                        label={`${result.input.targetDate} 時点の残存簿価`}
                        sublabel={result.targetPeriodLabel ? `（${result.targetPeriodLabel} 期末時点）` : undefined}
                        value={formatCurrency(result.bookValueAtTarget)}
                        unit="円"
                    />
                )}

                {/* 償却スケジュール表 */}
                <DepreciationScheduleTable rows={result.schedule} />

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
            </>
        )}
    </ResultLayout>
);

export default DepreciationResultSection;
