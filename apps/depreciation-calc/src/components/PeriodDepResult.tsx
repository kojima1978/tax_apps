import { type PeriodDepResult } from "@/hooks/usePeriodDepForm";
import { formatCurrency } from "@/lib/utils";
import DepreciationScheduleTable from "@/components/DepreciationScheduleTable";
import DirtyWarning from "@/components/ui/DirtyWarning";
import ConditionTags from "@/components/ui/ConditionTags";
import EmptyState from "@/components/ui/EmptyState";
import SummaryCard from "@/components/ui/SummaryCard";
import Disclaimer from "@/components/ui/Disclaimer";

type PeriodDepResultProps = {
    result: PeriodDepResult | null;
    isDirty: boolean;
};

const PeriodDepResultSection = ({ result, isDirty }: PeriodDepResultProps) => {
    if (!result) {
        return (
            <section className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-green-800 mb-4">期間償却スケジュール</h2>
                <EmptyState icon="📅" lines={['取得価額・耐用年数・取得日・事業供用日を入力し', '「計算する」ボタンを押してください']} />
            </section>
        );
    }

    const { rows, totalDepreciation, startBookValue, endBookValue, methodLabel, appliedRate, displayYears } = result;

    return (
        <section className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-green-800 mb-4">{displayYears}年間償却スケジュール</h2>

            <DirtyWarning isDirty={isDirty} />

            {/* 条件タグ */}
            <ConditionTags tags={[
                methodLabel,
                `耐用年数: ${result.usefulLife}年`,
                `取得価額: ${formatCurrency(result.acquisitionCost)}円`,
                `償却率: ${appliedRate}`,
            ]} />

            {/* サマリーカード */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <SummaryCard label={`${displayYears}年間合計償却額`} value={formatCurrency(totalDepreciation)} unit="円" variant="primary" />
                <SummaryCard label="開始時簿価" value={formatCurrency(startBookValue)} unit="円" />
                <SummaryCard label={`${displayYears}年後簿価`} value={formatCurrency(endBookValue)} unit="円" />
            </div>

            {/* 償却スケジュール表 */}
            {rows.length > 0 ? (
                <DepreciationScheduleTable rows={rows} />
            ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded text-center text-gray-500 text-sm mb-4">
                    指定期間に該当する償却データがありません
                </div>
            )}

            {/* 免責事項 */}
            <Disclaimer />
        </section>
    );
};

export default PeriodDepResultSection;
