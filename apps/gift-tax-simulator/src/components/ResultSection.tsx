import { lazy, Suspense } from 'react';
import TaxTable from './TaxTable';
import { CalculationResult } from '@/lib/tax-calculation';

const TaxChart = lazy(() => import('./TaxChart'));

type Props = {
    results: CalculationResult[] | null;
};

const ResultSection = ({ results }: Props) => {
    if (!results) {
        return null;
    }

    return (
        <div className="result-section">
            <TaxTable results={results} />
            <Suspense fallback={null}>
                <TaxChart results={results} />
            </Suspense>

            <p style={{ textAlign: 'right', fontSize: '0.8rem', color: '#666', marginTop: '1rem' }}>
                ※基礎控除110万円を含んで計算しています。<br />
                ※税額は国税庁の速算表に基づきます。実際の納税額と端数処理等で異なる場合があります。
            </p>
        </div>
    );
};

export default ResultSection;
