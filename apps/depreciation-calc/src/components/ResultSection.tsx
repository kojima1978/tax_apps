import { type UsedAssetResult, getAssetTypeLabel } from "@/lib/used-asset-life";
import { formatElapsed } from "@/lib/utils";
import DirtyWarning from "@/components/ui/DirtyWarning";
import ConditionTags from "@/components/ui/ConditionTags";
import EmptyState from "@/components/ui/EmptyState";
import HighlightCard from "@/components/ui/HighlightCard";
import Disclaimer from "@/components/ui/Disclaimer";

type ResultSectionProps = {
    result: UsedAssetResult | null;
    isDirty: boolean;
    onCarryOver?: () => void;
};


const ResultSection = ({ result, isDirty, onCarryOver }: ResultSectionProps) => {
    if (!result) {
        return (
            <section className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-green-800 mb-4">計算結果</h2>
                <EmptyState icon="🏗️" lines={['法定耐用年数と経過年数を入力し', '「計算する」ボタンを押してください']} />
            </section>
        );
    }

    const { input, is50PercentRule, renovationRatio, formulaUsed, calculationSteps, usedAssetLife } = result;

    const formulaLabel = () => {
        switch (formulaUsed) {
            case 'statutory': return '法定耐用年数（50%ルール適用）';
            case 'simple_exceeded': return '簡便法（法定耐用年数超過）';
            case 'simple_not_exceeded': return '簡便法';
        }
    };

    return (
        <section className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-green-800 mb-4">計算結果</h2>

            <DirtyWarning isDirty={isDirty} />

            {/* 条件タグ */}
            <ConditionTags tags={[
                getAssetTypeLabel(input.assetType),
                `法定耐用年数: ${input.statutoryLife}年`,
                `経過: ${formatElapsed(input.elapsedYears, input.elapsedMonths)}`,
                formulaLabel(),
            ]} />

            {/* 50%判定 */}
            {input.acquisitionCost > 0 && (
                <div className={`p-4 rounded-md mb-4 border-l-4 ${is50PercentRule ? 'bg-orange-50 border-orange-500' : 'bg-green-50 border-green-700'}`}>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold text-white mb-2 ${is50PercentRule ? 'bg-orange-500' : 'bg-green-700'}`}>
                        {is50PercentRule ? '簡便法適用不可' : '簡便法適用可'}
                    </span>
                    {is50PercentRule ? (
                        <p className="text-sm text-gray-600 m-0">
                            改修費 {input.renovationCost.toLocaleString()}円 が取得価額 {input.acquisitionCost.toLocaleString()}円 の
                            50%（{Math.floor(input.acquisitionCost * 0.5).toLocaleString()}円）を超えるため（{renovationRatio.toFixed(1)}%）、
                            法定耐用年数をそのまま適用します。
                        </p>
                    ) : (
                        <p className="text-sm text-gray-600 m-0">
                            改修費の割合は{renovationRatio.toFixed(1)}%（50%以下）のため、簡便法により計算します。
                        </p>
                    )}
                </div>
            )}

            {/* 計算過程 */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md mb-4">
                <h3 className="text-base font-bold text-green-800 mb-3 m-0">計算過程</h3>
                {formulaUsed === 'simple_not_exceeded' && (
                    <div className="font-mono-num text-sm text-green-900 bg-green-50 px-3 py-2 rounded mb-3">
                        (法定耐用年数 - 経過年数) + 経過年数 × 20%
                    </div>
                )}
                {formulaUsed === 'simple_exceeded' && (
                    <div className="font-mono-num text-sm text-green-900 bg-green-50 px-3 py-2 rounded mb-3">
                        法定耐用年数 × 20%
                    </div>
                )}
                {formulaUsed === 'statutory' && (
                    <div className="font-mono-num text-sm text-green-900 bg-green-50 px-3 py-2 rounded mb-3">
                        法定耐用年数をそのまま適用
                    </div>
                )}
                <ul className="list-none p-0 m-0">
                    {calculationSteps.map((step, i) => (
                        <li key={i} className="py-1.5 text-sm text-gray-600 border-b border-gray-100 last:border-b-0">{step}</li>
                    ))}
                </ul>
            </div>

            {/* 結果ハイライト */}
            <HighlightCard label="中古耐用年数" value={String(usedAssetLife)} unit="年">
                {onCarryOver && (
                    <button
                        type="button"
                        onClick={onCarryOver}
                        className="mt-3 px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded cursor-pointer transition-colors hover:bg-green-600 no-print"
                    >
                        この結果で簿価計算へ →
                    </button>
                )}
            </HighlightCard>

            {/* 免責事項 */}
            <Disclaimer />
        </section>
    );
};

export default ResultSection;
