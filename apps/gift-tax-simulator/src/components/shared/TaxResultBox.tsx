import { formatYen } from '@/lib/utils';

type ResultItem = {
    label: string;
    value: number;
    show: boolean;
};

type ResultGroup = {
    title: string;
    items: ResultItem[];
    show: boolean;
};

type TaxResultBoxProps = {
    items?: ResultItem[];
    groups?: ResultGroup[];
    totalLabel: string;
    totalValue: number;
};

const ResultItems = ({ items }: { items: ResultItem[] }) => (
    <>
        {items.map(({ label, value, show }) =>
            show && (
                <div key={label} className="re-result-item">
                    <span className="re-result-label">{label}</span>
                    <span className="re-result-value">{formatYen(value)}</span>
                </div>
            )
        )}
    </>
);

const TaxResultBox = ({ items, groups, totalLabel, totalValue }: TaxResultBoxProps) => (
    <div className="re-result-box">
        {groups ? (
            <div className="re-result-groups">
                {groups.map(({ title, items: groupItems, show }) =>
                    show && (
                        <div key={title}>
                            <div className="re-result-group-title">{title}</div>
                            <div className="re-result-group-items">
                                <ResultItems items={groupItems} />
                            </div>
                        </div>
                    )
                )}
            </div>
        ) : items ? (
            <div className="re-result-row">
                <ResultItems items={items} />
            </div>
        ) : null}
        <div className="re-result-total">
            <span>{totalLabel}</span>
            <span className="total-value">{formatYen(totalValue)}</span>
        </div>
    </div>
);

export default TaxResultBox;
