import { lazy, Suspense } from 'react';
import Calculator from 'lucide-react/icons/calculator';
import TaxTable from './TaxTable';
import CalculationProcess from './CalculationProcess';
import RateTable from './RateTable';
import ResultSummaryCard from './ResultSummaryCard';
import { type CalculationResult, type GiftType } from '@/lib/tax-calculation';

const TaxChart = lazy(() => import('./TaxChart'));

type Props = {
    results: CalculationResult[] | null;
    giftType: GiftType;
};

const ResultSection = ({ results, giftType }: Props) => {
    if (!results) {
        return (
            <div className="empty-state">
                <Calculator size={48} strokeWidth={1.2} />
                <p className="empty-state-text">贈与金額を入力して「計算する」を押すと、分割パターンごとの税額比較が表示されます。</p>
            </div>
        );
    }

    const recommended = results.reduce((best, current) =>
        current.totalTax < best.totalTax ? current : best,
    );
    const baseline = results[0];

    return (
        <div className="result-section">
            <ResultSummaryCard
                recommendation={`最も税額が低い：${recommended.name}`}
                totalTax={recommended.totalTax}
                savings={Math.max(0, baseline.totalTax - recommended.totalTax)}
                comparisonLabel="一括贈与との差額"
                filingCount={recommended.div}
                effectiveRate={recommended.effectiveRate}
            />
            <TaxTable results={results} />
            <Suspense fallback={null}>
                <TaxChart results={results} />
            </Suspense>
            <CalculationProcess results={results} />

            <div className="rate-table-page">
                <RateTable giftType={giftType} results={results} />
            </div>
        </div>
    );
};

export default ResultSection;
