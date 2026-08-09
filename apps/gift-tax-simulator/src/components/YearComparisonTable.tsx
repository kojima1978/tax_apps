import { type YearComparisonResult } from '@/lib/tax-calculation';
import { formatCurrency, formatPercent } from '@/lib/utils';

type Props = {
    results: YearComparisonResult[];
    totalAmount: number;
};

const YearComparisonTable = ({ results, totalAmount }: Props) => {
    return (
        <div>
            <div className="mobile-comparison-cards year-cards" aria-label="分割年数別の税額比較">
                {results.map(row => (
                    <article
                        key={row.years}
                        className={`comparison-card ${row.optimal ? 'recommended' : ''} ${row.taxFree ? 'tax-free' : ''}`}
                    >
                        <div className="comparison-card-heading">
                            <h3>{row.years}年分割</h3>
                            {row.optimal && <span>最安</span>}
                            {!row.optimal && row.taxFree && <span className="neutral">非課税</span>}
                        </div>
                        <strong className="comparison-card-total">
                            {formatCurrency(row.totalTax)}<small>円</small>
                        </strong>
                        <dl>
                            <div><dt>1回の贈与額</dt><dd>{formatCurrency(row.oneTimeAmount)}円</dd></div>
                            <div><dt>1回の税額</dt><dd>{formatCurrency(row.oneTimeTax)}円</dd></div>
                            <div><dt>実効税率</dt><dd>{formatPercent(row.effectiveRate)}</dd></div>
                        </dl>
                    </article>
                ))}
            </div>
            <div className="table-container desktop-comparison-table year-comparison-table">
                <table>
                    <thead>
                        <tr>
                            <th>分割年数</th>
                            <th>1回あたりの<br />贈与額</th>
                            <th>1回あたりの<br />税額</th>
                            <th>合計税額</th>
                            <th>実効税率<br />(合計額比)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((row) => (
                            <tr
                                key={row.years}
                                className={
                                    row.optimal
                                        ? 'row-optimal'
                                        : row.taxFree
                                        ? 'row-zero-tax'
                                        : ''
                                }
                            >
                                {/* 最安は行の色分け(row-optimal)で示すのでバッジは置かない */}
                                <td>
                                    {row.years}年
                                    {!row.optimal && row.taxFree && <span className="badge-tax-free">非課税</span>}
                                </td>
                                <td>{formatCurrency(row.oneTimeAmount)} 円</td>
                                <td>{formatCurrency(row.oneTimeTax)} 円</td>
                                <td className="highlight-total">{formatCurrency(row.totalTax)} 円</td>
                                <td>{formatPercent(row.effectiveRate)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="disclaimer-right">
                ※ 贈与総額 {formatCurrency(totalAmount)} 円を各年数で均等分割した場合の試算です。
            </p>
        </div>
    );
};

export default YearComparisonTable;
