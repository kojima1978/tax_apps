import { lazy, Suspense } from 'react';
import Calculator from 'lucide-react/icons/calculator';
import TaxTable from './TaxTable';
import { type CalculationResult } from '@/lib/tax-calculation';

const TaxChart = lazy(() => import('./TaxChart'));

type Props = {
    results: CalculationResult[] | null;
};

const ResultSection = ({ results }: Props) => {
    if (!results) {
        return (
            <div className="empty-state">
                <Calculator size={48} strokeWidth={1.2} />
                <p className="empty-state-text">贈与金額を入力して「計算する」を押すと、分割パターンごとの税額比較が表示されます。</p>
            </div>
        );
    }

    return (
        <div className="result-section">
            <TaxTable results={results} />
            <Suspense fallback={null}>
                <TaxChart results={results} />
            </Suspense>

            <p className="disclaimer-right">
                ※基礎控除110万円を含んで計算しています。<br />
                ※税額は国税庁の速算表に基づきます。実際の納税額と端数処理等で異なる場合があります。
            </p>
        </div>
    );
};

export default ResultSection;
