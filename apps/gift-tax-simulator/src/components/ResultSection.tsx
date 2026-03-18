import { lazy, Suspense } from 'react';
import Calculator from 'lucide-react/icons/calculator';
import TaxTable from './TaxTable';
import CalculationProcess from './CalculationProcess';
import RateTable from './RateTable';
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

    return (
        <div className="result-section">
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
