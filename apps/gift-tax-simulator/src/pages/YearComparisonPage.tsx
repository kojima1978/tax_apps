import { lazy, Suspense } from 'react';
import BarChart3 from 'lucide-react/icons/bar-chart-3';
import PageLayout from '@/components/PageLayout';
import InputSection from '@/components/InputSection';
import YearComparisonTable from '@/components/YearComparisonTable';
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
                errorMsg={form.errorMsg}
            />
            {form.results ? (
                <div className="result-section">
                    <YearComparisonTable results={form.results} totalAmount={form.totalAmount} />
                    <Suspense fallback={null}>
                        <YearComparisonChart results={form.results} />
                    </Suspense>
                    <p className="disclaimer-right">
                        ※基礎控除110万円を含んで計算しています。<br />
                        ※税額は国税庁の速算表に基づきます。実際の納税額と端数処理等で異なる場合があります。
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
