import { useState, useCallback, lazy, Suspense } from 'react';
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

        setTotalAmount(amountVal);
        setResults(calculateYearComparison(amountVal, giftType));
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
            {results && (
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
            )}
            <PrintFooter />
        </div>
    );
}
