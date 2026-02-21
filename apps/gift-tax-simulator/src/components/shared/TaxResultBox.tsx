import { formatYen } from '@/lib/utils';

type ResultItem = {
    label: string;
    value: number;
    show: boolean;
};

type TaxResultBoxProps = {
    items: ResultItem[];
    totalLabel: string;
    totalValue: number;
};

const TaxResultBox = ({ items, totalLabel, totalValue }: TaxResultBoxProps) => (
    <div className="re-result-box">
        <div className="re-result-row">
            {items.map(({ label, value, show }) =>
                show && (
                    <div key={label} className="re-result-item">
                        <span className="re-result-label">{label}</span>
                        <span className="re-result-value">{formatYen(value)}</span>
                    </div>
                )
            )}
        </div>
        <div className="re-result-total">
            <span>{totalLabel}</span>
            <span className="total-value">{formatYen(totalValue)}</span>
        </div>
    </div>
);

export default TaxResultBox;
