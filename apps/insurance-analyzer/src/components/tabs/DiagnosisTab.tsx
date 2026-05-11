import type { DiagnosisResult } from '@/types';
import { formatCurrency, formatPercent, formatYen } from '@/lib/utils';
import HighlightCard from '@/components/ui/HighlightCard';
import SummaryCard from '@/components/ui/SummaryCard';
import DirtyWarning from '@/components/ui/DirtyWarning';
import EmptyState from '@/components/ui/EmptyState';
import { DatabaseIcon, AlertTriangleIcon } from '@/components/ui/Icons';

const TAX_LABEL_MAP: Record<string, string> = {
    inheritance: '相続税対象',
    income: '所得税対象',
    gift: '贈与税対象',
};

type DiagnosisTabProps = {
    result: DiagnosisResult | null;
    isDirty: boolean;
};

const DiagnosisTab = ({ result, isDirty }: DiagnosisTabProps) => {
    if (!result) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-6">
                <EmptyState
                    icon={<DatabaseIcon />}
                    lines={['証券入力タブでデータを入力し、', '「計算する」を押してください。']}
                />
            </div>
        );
    }

    const returnRateLabel = result.return_rate >= 100
        ? '資産形成に寄与'
        : '掛け捨て保障重視';

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
            <DirtyWarning isDirty={isDirty} />

            <HighlightCard
                label="返戻率（現時点）"
                sublabel={returnRateLabel}
                value={formatPercent(result.return_rate)}
                unit=""
            />

            {result.coverage_gap_years > 0 && (
                <div className="p-4 bg-orange-50 border-2 border-orange-400 rounded-lg flex items-start gap-3">
                    <span className="text-orange-500 flex-shrink-0 mt-0.5"><AlertTriangleIcon size={24} /></span>
                    <div>
                        <p className="text-sm font-bold text-orange-800 m-0">保障の空白期間: {result.coverage_gap_years}年</p>
                        <p className="text-xs text-orange-700 mt-1 m-0">
                            平均余命 {Math.round(result.life_expectancy)}年（推定{result.estimated_death_age}歳）に対し、
                            保険期間終了後に保障がない期間があります。
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <SummaryCard label="既払込保険料累計" value={formatCurrency(result.total_premiums_paid)} unit="円" />
                <SummaryCard label="現在の解約返戻金" value={formatCurrency(result.form_data.savings.cash_value_current)} unit="円" />
                <SummaryCard label="死亡保険金（疾病）" value={formatCurrency(result.form_data.coverage.death_benefit_disease)} unit="円" variant="primary" />
                <SummaryCard label="年間保険料" value={formatCurrency(result.form_data.cost.annual_premium)} unit="円" />
                <SummaryCard label="払込総額予測" value={formatCurrency(result.total_premium_projection)} unit="円" />
                <SummaryCard label="税務ラベル" value={TAX_LABEL_MAP[result.tax_label] ?? result.tax_label} unit="" />
            </div>

            {result.cash_flow_table.length > 0 && (
                <section>
                    <h3 className="text-sm font-bold text-green-800 mb-3">キャッシュフロー表</h3>
                    <div className="table-scroll-wrapper overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-sm border-collapse min-w-[640px]">
                            <thead>
                                <tr className="bg-green-800 text-white">
                                    <th className="py-2 px-3 text-center font-medium">年度</th>
                                    <th className="py-2 px-3 text-center font-medium">年齢</th>
                                    <th className="py-2 px-3 text-right font-medium">年間保険料</th>
                                    <th className="py-2 px-3 text-right font-medium">累計保険料</th>
                                    <th className="py-2 px-3 text-right font-medium">解約返戻金</th>
                                    <th className="py-2 px-3 text-right font-medium">返戻率</th>
                                    <th className="py-2 px-3 text-right font-medium">死亡保険金</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.cash_flow_table.map((row) => (
                                    <tr key={row.year} className={`border-b border-gray-100 ${row.return_rate >= 100 ? 'bg-green-50' : ''}`}>
                                        <td className="py-1.5 px-3 text-center text-gray-500">{row.year}</td>
                                        <td className="py-1.5 px-3 text-center">{row.age}歳</td>
                                        <td className="py-1.5 px-3 text-right font-mono-num">{row.annual_premium > 0 ? formatYen(row.annual_premium) : '—'}</td>
                                        <td className="py-1.5 px-3 text-right font-mono-num">{formatYen(row.cumulative_premium)}</td>
                                        <td className="py-1.5 px-3 text-right font-mono-num">{row.cash_value > 0 ? formatYen(row.cash_value) : '—'}</td>
                                        <td className={`py-1.5 px-3 text-right font-mono-num font-semibold ${row.return_rate >= 100 ? 'text-green-700' : 'text-gray-600'}`}>
                                            {row.cash_value > 0 ? formatPercent(row.return_rate) : '—'}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono-num">{row.death_benefit > 0 ? formatYen(row.death_benefit) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
};

export default DiagnosisTab;
