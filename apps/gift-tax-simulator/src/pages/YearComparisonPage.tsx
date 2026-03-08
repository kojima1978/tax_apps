import { useState, useCallback, lazy, Suspense } from 'react';
import BarChart3 from 'lucide-react/icons/bar-chart-3';
import Navigation from '@/components/Navigation';
import InputSection from '@/components/InputSection';
import PrintFooter from '@/components/PrintFooter';
import YearComparisonTable from '@/components/YearComparisonTable';
import { calculateYearComparison, type GiftType, type YearComparisonResult } from '@/lib/tax-calculation';
import { normalizeNumberString } from '@/lib/utils';

const YearComparisonChart = lazy(() => import('@/components/YearComparisonChart'));

export default function YearComparisonPage() {
    const [amount, setAmount] = useState('');
    const [giftType, setGiftType] = useState<GiftType>('special');
    const [results, setResults] = useState<YearComparisonResult[] | null>(null);
    const [totalAmount, setTotalAmount] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');

    const handleCalculate = useCallback(() => {
        setErrorMsg('');
        const rawAmount = normalizeNumberString(amount);
        const amountVal = parseInt(rawAmount, 10);

        if (!amountVal || amountVal <= 0) {
            setErrorMsg('※贈与金額を正しく入力してください。');
            setResults(null);
            return;
        }
        if (amountVal > 1_000_000_000) {
            setErrorMsg('※贈与金額は10億円以下で入力してください。');
            setResults(null);
            return;
        }

        const rows = calculateYearComparison(amountVal, giftType);
        if (rows.some(r => !isFinite(r.totalTax) || isNaN(r.totalTax))) {
            setErrorMsg('※計算結果に異常が発生しました。入力値を確認してください。');
            setResults(null);
            return;
        }
        setTotalAmount(amountVal);
        setResults(rows);
    }, [amount, giftType]);

    return (
        <div className="container-custom">
            <Navigation />
            <InputSection
                amount={amount}
                setAmount={setAmount}
                giftType={giftType}
                setGiftType={setGiftType}
                onCalculate={handleCalculate}
                errorMsg={errorMsg}
            />
            {results ? (
                <div className="result-section">
                    <YearComparisonTable results={results} totalAmount={totalAmount} />
                    <Suspense fallback={null}>
                        <YearComparisonChart results={results} />
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
            <PrintFooter />
        </div>
    );
}
