import { CalculationResult } from '@/lib/tax-calculation';
import { formatCurrency, formatPercent } from '@/lib/utils';

type Props = {
    results: CalculationResult[];
};

const TaxTable = ({ results }: Props) => {
    return (
        <div className="table-container">
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
                    {results.map((res, index) => (
                        <tr key={index}>
                            <td>{res.name}</td>
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
    );
};

export default TaxTable;
