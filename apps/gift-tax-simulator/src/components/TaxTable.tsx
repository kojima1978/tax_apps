import { type CalculationResult } from '@/lib/tax-calculation';
import { formatCurrency, formatPercent } from '@/lib/utils';

type Props = {
    results: CalculationResult[];
};

const TaxTable = ({ results }: Props) => {
    const minTax = Math.min(...results.map(result => result.totalTax));

    return (
        <>
            <div className="mobile-comparison-cards" aria-label="贈与税額の比較">
                {results.map(res => (
                    <article
                        key={res.name}
                        className={`comparison-card ${res.totalTax === minTax ? 'recommended' : ''}`}
                    >
                        <div className="comparison-card-heading">
                            <h3>{res.name}</h3>
                            {res.totalTax === minTax && <span>最安</span>}
                        </div>
                        <strong className="comparison-card-total">
                            {formatCurrency(res.totalTax)}<small>円</small>
                        </strong>
                        <dl>
                            <div><dt>1回の贈与額</dt><dd>{formatCurrency(res.oneTimeAmount)}円</dd></div>
                            <div><dt>1回の税額</dt><dd>{formatCurrency(res.oneTimeTax)}円</dd></div>
                            <div><dt>申告回数</dt><dd>{res.div}回</dd></div>
                            <div><dt>実効税率</dt><dd>{formatPercent(res.effectiveRate)}</dd></div>
                        </dl>
                    </article>
                ))}
            </div>
            <div className="table-container desktop-comparison-table">
                <table>
                    <thead>
                        <tr>
                            <th>パターン</th>
                            <th>1回あたりの<br />贈与額</th>
                            <th>1回あたりの<br />税額</th>
                            <th>申告<br />回数</th>
                            <th>実効税率</th>
                            <th>トータル<br />贈与税額</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((res) => (
                            <tr key={res.name} className={res.totalTax === minTax ? 'row-optimal' : ''}>
                                <td>
                                    {res.name}
                                    {res.totalTax === minTax && <span className="badge-optimal">最安</span>}
                                </td>
                                <td>{formatCurrency(res.oneTimeAmount)} 円</td>
                                <td>{formatCurrency(res.oneTimeTax)} 円</td>
                                <td>{res.div} 回</td>
                                <td>{formatPercent(res.effectiveRate)}</td>
                                <td className="highlight-total">{formatCurrency(res.totalTax)} 円</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default TaxTable;
