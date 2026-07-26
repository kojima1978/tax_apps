import BadgeCheck from 'lucide-react/icons/badge-check';
import { formatCurrency, formatPercent } from '@/lib/utils';

type Props = {
    recommendation: string;
    totalTax: number;
    savings: number;
    comparisonLabel: string;
    filingCount: number;
    effectiveRate: number;
};

const ResultSummaryCard = ({
    recommendation,
    totalTax,
    savings,
    comparisonLabel,
    filingCount,
    effectiveRate,
}: Props) => (
    <section className="result-summary-card" aria-labelledby="result-summary-title">
        <div className="result-summary-heading">
            <BadgeCheck aria-hidden="true" />
            <div>
                <span>試算結果のポイント</span>
                <h2 id="result-summary-title">{recommendation}</h2>
            </div>
        </div>
        <dl className="result-summary-metrics">
            <div className="primary">
                <dt>合計税額</dt>
                <dd>{formatCurrency(totalTax)}<small>円</small></dd>
            </div>
            <div>
                <dt>{comparisonLabel}</dt>
                <dd>{formatCurrency(savings)}<small>円減</small></dd>
            </div>
            <div>
                <dt>申告回数</dt>
                <dd>{filingCount}<small>回</small></dd>
            </div>
            <div>
                <dt>実効税率</dt>
                <dd>{formatPercent(effectiveRate)}</dd>
            </div>
        </dl>
    </section>
);

export default ResultSummaryCard;
