import { lazy, Suspense } from 'react';
import BarChart3 from 'lucide-react/icons/bar-chart-3';
import PageLayout from '@/components/PageLayout';
import InputSection from '@/components/InputSection';
import YearComparisonTable from '@/components/YearComparisonTable';
import ResultSummaryCard from '@/components/ResultSummaryCard';
import { useYearComparisonForm } from '@/hooks/useYearComparisonForm';

const YearComparisonChart = lazy(() => import('@/components/YearComparisonChart'));

export default function YearComparisonPage() {
    const form = useYearComparisonForm();

    return (
        <PageLayout>
            <InputSection
                amount={form.amount}
                setAmount={form.setAmount}
                giftType={form.giftType}
                setGiftType={form.setGiftType}
                onCalculate={form.handleCalculate}
                onSample={form.handleSample}
                onReset={form.handleReset}
                errorMsg={form.errorMsg}
            />
            {form.results ? (
                <div className="result-section">
                    {(() => {
                        const recommended = form.results.find(result => result.optimal) ?? form.results[0];
                        const baseline = form.results[0];
                        return (
                            <ResultSummaryCard
                                recommendation={`試算上の最小税額：${recommended.years}年分割`}
                                totalTax={recommended.totalTax}
                                savings={Math.max(0, baseline.totalTax - recommended.totalTax)}
                                comparisonLabel="1年贈与との差額"
                                filingCount={recommended.taxFree ? 0 : recommended.years}
                                effectiveRate={recommended.effectiveRate}
                            />
                        );
                    })()}
                    <YearComparisonTable results={form.results} totalAmount={form.totalAmount} />
                    <Suspense fallback={null}>
                        <YearComparisonChart results={form.results} />
                    </Suspense>
                    <p className="disclaimer-right">
                        ※基礎控除110万円を含んで計算しています。<br />
                        ※税額は国税庁の速算表に基づきます。実際の納税額と端数処理等で異なる場合があります。<br />
                        ※複数年分の贈与をあらかじめ約束した場合は、定期金に関する権利の贈与として扱われる場合があります。
                    </p>
                </div>
            ) : (
                <div className="empty-state">
                    <BarChart3 size={48} strokeWidth={1.2} />
                    <p className="empty-state-text">贈与金額を入力して「計算する」を押すと、分割年数ごとの税額比較が表示されます。</p>
                </div>
            )}
        </PageLayout>
    );
}
