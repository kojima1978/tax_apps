import { type PeriodDepResult } from "@/hooks/usePeriodDepForm";
import { formatCurrency } from "@/lib/utils";
import DepreciationScheduleTable from "@/components/DepreciationScheduleTable";
import ResultLayout from "@/components/ui/ResultLayout";
import SummaryCard from "@/components/ui/SummaryCard";

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" />
    </svg>
);

type PeriodDepResultProps = {
    result: PeriodDepResult | null;
    isDirty: boolean;
};

const PeriodDepResultSection = ({ result, isDirty }: PeriodDepResultProps) => (
    <ResultLayout
        title={result ? `${result.displayYears}年間償却スケジュール` : '期間償却スケジュール'}
        emptyIcon={<CalendarIcon />}
        emptyLines={['取得価額・耐用年数・取得日・事業供用日を入力し', '「計算する」ボタンを押してください']}
        hasResult={!!result}
        isDirty={isDirty}
        tags={result ? [
            result.methodLabel,
            `耐用年数: ${result.usefulLife}年`,
            `取得価額: ${formatCurrency(result.acquisitionCost)}円`,
            `償却率: ${result.appliedRate}`,
        ] : []}
    >
        {result && (
            <>
                {/* サマリーカード */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <SummaryCard label={`${result.displayYears}年間合計償却額`} value={formatCurrency(result.totalDepreciation)} unit="円" variant="primary" />
                    <SummaryCard label="開始時簿価" value={formatCurrency(result.startBookValue)} unit="円" />
                    <SummaryCard label={`${result.displayYears}年後簿価`} value={formatCurrency(result.endBookValue)} unit="円" />
                </div>

                {/* 償却スケジュール表 */}
                {result.rows.length > 0 ? (
                    <DepreciationScheduleTable rows={result.rows} />
                ) : (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded text-center text-gray-500 text-sm mb-4">
                        指定期間に該当する償却データがありません
                    </div>
                )}
            </>
        )}
    </ResultLayout>
);

export default PeriodDepResultSection;
