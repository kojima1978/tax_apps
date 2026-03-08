import { type UsedAssetResult, getAssetTypeLabel } from "@/lib/used-asset-life";

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
                <div className="flex items-center justify-center py-8">
                    <div className="text-center text-gray-400">
                        <div className="text-5xl mb-2">🏗️</div>
                        <p className="text-sm my-1">法定耐用年数と経過年数を入力し</p>
                        <p className="text-sm my-1">「計算する」ボタンを押してください</p>
                        <p className="text-xs text-gray-300 mt-2">Ctrl+Enter でも計算できます</p>
                    </div>
                </div>
            </section>
        );
    }

    const { input, is50PercentRule, renovationRatio, formulaUsed, calculationSteps, usedAssetLife } = result;

    const formatElapsed = () => {
        if (input.elapsedMonths === 0) return `${input.elapsedYears}年`;
        if (input.elapsedYears === 0) return `${input.elapsedMonths}ヶ月`;
        return `${input.elapsedYears}年${input.elapsedMonths}ヶ月`;
    };

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

            {isDirty && (
                <div className="p-3 bg-orange-50 border border-orange-500 rounded text-orange-600 text-sm font-semibold mb-4 no-print">
                    入力値が変更されています。再計算してください。
                </div>
            )}

            {/* 条件タグ */}
            <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-600">{getAssetTypeLabel(input.assetType)}</span>
                <span className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-600">法定耐用年数: {input.statutoryLife}年</span>
                <span className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-600">経過: {formatElapsed()}</span>
                <span className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-600">{formulaLabel()}</span>
            </div>

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
            <div className="p-5 bg-green-50 border-2 border-green-700 rounded-lg text-center mb-4">
                <p className="text-sm text-green-900 font-semibold mb-2 m-0">中古耐用年数</p>
                <p className="text-4xl sm:text-5xl font-bold text-green-800 font-mono-num m-0">
                    {usedAssetLife}<span className="text-2xl sm:text-3xl">年</span>
                </p>
                {onCarryOver && (
                    <button
                        type="button"
                        onClick={onCarryOver}
                        className="mt-3 px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded cursor-pointer transition-colors hover:bg-green-600 no-print"
                    >
                        この結果で簿価計算へ →
                    </button>
                )}
            </div>

            {/* 免責事項 */}
            <p className="text-center text-xs text-gray-500 mt-3">
                ※ 本計算は概算です。実際の適用にあたっては税理士にご相談ください。
            </p>
        </section>
    );
};

export default ResultSection;
