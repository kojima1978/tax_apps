import { type UsedAssetResult, getAssetTypeLabel } from "@/lib/used-asset-life";
import { formatElapsed } from "@/lib/utils";
import ResultLayout from "@/components/ui/ResultLayout";
import HighlightCard from "@/components/ui/HighlightCard";

const BuildingIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
    </svg>
);

type ResultSectionProps = {
    result: UsedAssetResult | null;
    isDirty: boolean;
    onCarryOver?: () => void;
};

const FORMULA_LABELS: Record<string, string> = {
    statutory: '法定耐用年数（50%ルール適用）',
    simple_exceeded: '簡便法（法定耐用年数超過）',
    simple_not_exceeded: '簡便法',
};

const FORMULA_TEXTS: Record<string, string> = {
    simple_not_exceeded: '(法定耐用年数 - 経過年数) + 経過年数 × 20%',
    simple_exceeded: '法定耐用年数 × 20%',
    statutory: '法定耐用年数をそのまま適用',
};

const ResultSection = ({ result, isDirty, onCarryOver }: ResultSectionProps) => {
    const r = result;

    return (
        <ResultLayout
            title="計算結果"
            emptyIcon={<BuildingIcon />}
            emptyLines={['法定耐用年数と経過年数を入力し', '「計算する」ボタンを押してください']}
            hasResult={!!r}
            isDirty={isDirty}
            tags={r ? [
                getAssetTypeLabel(r.input.assetType),
                `法定耐用年数: ${r.input.statutoryLife}年`,
                `経過: ${formatElapsed(r.input.elapsedYears, r.input.elapsedMonths)}`,
                FORMULA_LABELS[r.formulaUsed] ?? '',
            ] : []}
        >
            {r && (
                <>
                    {/* 50%判定 */}
                    {r.input.acquisitionCost > 0 && (
                        <div className={`p-4 rounded-md mb-4 border-l-4 ${r.is50PercentRule ? 'bg-orange-50 border-orange-500' : 'bg-green-50 border-green-700'}`}>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold text-white mb-2 ${r.is50PercentRule ? 'bg-orange-500' : 'bg-green-700'}`}>
                                {r.is50PercentRule ? '簡便法適用不可' : '簡便法適用可'}
                            </span>
                            {r.is50PercentRule ? (
                                <p className="text-sm text-gray-600 m-0">
                                    改修費 {r.input.renovationCost.toLocaleString()}円 が取得価額 {r.input.acquisitionCost.toLocaleString()}円 の
                                    50%（{Math.floor(r.input.acquisitionCost * 0.5).toLocaleString()}円）を超えるため（{r.renovationRatio.toFixed(1)}%）、
                                    法定耐用年数をそのまま適用します。
                                </p>
                            ) : (
                                <p className="text-sm text-gray-600 m-0">
                                    改修費の割合は{r.renovationRatio.toFixed(1)}%（50%以下）のため、簡便法により計算します。
                                </p>
                            )}
                        </div>
                    )}

                    {/* 計算過程 */}
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-md mb-4">
                        <h3 className="text-base font-bold text-green-800 mb-3 m-0">計算過程</h3>
                        <div className="font-mono-num text-sm text-green-900 bg-green-50 px-3 py-2 rounded mb-3">
                            {FORMULA_TEXTS[r.formulaUsed]}
                        </div>
                        <ul className="list-none p-0 m-0">
                            {r.calculationSteps.map((step, i) => (
                                <li key={i} className="py-1.5 text-sm text-gray-600 border-b border-gray-100 last:border-b-0">{step}</li>
                            ))}
                        </ul>
                    </div>

                    {/* 結果ハイライト */}
                    <HighlightCard label="中古耐用年数" value={String(r.usedAssetLife)} unit="年">
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
                </>
            )}
        </ResultLayout>
    );
};

export default ResultSection;
