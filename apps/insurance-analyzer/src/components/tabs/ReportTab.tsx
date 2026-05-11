import type { DiagnosisResult } from '@/types';
import { formatCurrency, formatPercent } from '@/lib/utils';
import DirtyWarning from '@/components/ui/DirtyWarning';
import EmptyState from '@/components/ui/EmptyState';
import SummaryCard from '@/components/ui/SummaryCard';
import DeathBenefitPie from '@/components/charts/DeathBenefitPie';
import AssetTransitionChart from '@/components/charts/AssetTransitionChart';
import CashFlowChart from '@/components/charts/CashFlowChart';
import { BarChartIcon } from '@/components/ui/Icons';

const TAX_LABEL_MAP: Record<string, string> = {
    inheritance: '相続税対象',
    income: '所得税対象',
    gift: '贈与税対象',
};

type ReportTabProps = {
    result: DiagnosisResult | null;
    isDirty: boolean;
};

const ReportTab = ({ result, isDirty }: ReportTabProps) => {
    if (!result) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-6">
                <EmptyState
                    icon={<BarChartIcon size={48} />}
                    lines={['証券入力タブでデータを入力し、', '「計算する」を押すとレポートが生成されます。']}
                />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
            <DirtyWarning isDirty={isDirty} />

            <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-green-800">
                    {result.form_data.client.client_name || '—'}様 保険証券診断レポート
                </h2>
                <p className="text-sm text-gray-500">
                    {result.form_data.contract.company_name} / {result.form_data.contract.policy_number}
                </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard label="返戻率" value={formatPercent(result.return_rate)} unit="" variant="primary" />
                <SummaryCard label="死亡保障" value={formatCurrency(result.form_data.coverage.death_benefit_disease)} unit="円" />
                <SummaryCard label="払込総額予測" value={formatCurrency(result.total_premium_projection)} unit="円" />
                <SummaryCard label="税務" value={TAX_LABEL_MAP[result.tax_label] ?? ''} unit="" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DeathBenefitPie result={result} />
                <AssetTransitionChart result={result} />
            </div>

            <CashFlowChart result={result} />
        </div>
    );
};

export default ReportTab;
