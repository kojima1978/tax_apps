import { type GiftType, type TaxRate, type CalculationResult, GENERAL_RATES, SPECIAL_RATES } from '@/lib/tax-calculation';
import { formatCurrency } from '@/lib/utils';

type Props = {
    giftType: GiftType;
    results: CalculationResult[];
};

const formatLimit = (rate: TaxRate, index: number, rates: TaxRate[]): string => {
    if (index === 0) return `${formatCurrency(rate.limit / 10000)}万円以下`;
    if (rate.limit === Infinity) return `${formatCurrency(rates[index - 1].limit / 10000)}万円超`;
    return `${formatCurrency(rate.limit / 10000)}万円以下`;
};

const RateTable = ({ giftType, results }: Props) => {
    const rates = giftType === 'special' ? SPECIAL_RATES : GENERAL_RATES;
    const isSpecial = giftType === 'special';
    const title = isSpecial ? '特例税率（特例贈与財産用）' : '一般税率（一般贈与財産用）';
    const subtitle = isSpecial
        ? '直系尊属（祖父母や父母など）から、その年の1月1日において18歳以上の者への贈与'
        : '上記「特例贈与財産用」に該当しない場合の贈与';

    const highlightSet = new Set(results.map((r) => r.detail.bracketIndex));

    return (
        <div className="rate-table-section">
            <h3 className="rate-table-title">
                {title}
            </h3>
            <p className="rate-table-subtitle">{subtitle}</p>
            <div className="table-container">
                <table className="rate-table">
                    <thead>
                        <tr>
                            <th>基礎控除後の課税価格</th>
                            <th>税率</th>
                            <th>控除額</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rates.map((rate, i) => (
                            <tr
                                key={i}
                                className={highlightSet.has(i) ? 'rate-row-highlight' : ''}
                            >
                                <td className="rate-col-range">{formatLimit(rate, i, rates)}</td>
                                <td className="rate-col-rate">{(rate.rate * 100).toFixed(0)}%</td>
                                <td className="rate-col-deduction">
                                    {rate.deduction === 0 ? '—' : `${formatCurrency(rate.deduction / 10000)}万円`}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RateTable;
