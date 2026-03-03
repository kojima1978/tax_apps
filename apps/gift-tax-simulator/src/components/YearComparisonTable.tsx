import { type YearComparisonResult } from '@/lib/tax-calculation';
import { formatCurrency, formatPercent } from '@/lib/utils';

type Props = {
    results: YearComparisonResult[];
    totalAmount: number;
};

const YearComparisonTable = ({ results, totalAmount }: Props) => {
    return (
        <div className="table-container">
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
                            <td>
                                {row.years}年
                                {row.optimal && <span className="badge-optimal">最安</span>}
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
            <p className="disclaimer-right">
                ※ 贈与総額 {formatCurrency(totalAmount)} 円を各年数で均等分割した場合の試算です。
            </p>
        </div>
    );
};

export default YearComparisonTable;
