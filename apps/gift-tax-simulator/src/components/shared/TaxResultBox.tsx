import { formatYen } from '@/lib/utils';

export type ResultItem = {
    label: string;
    value: number;
    show: boolean;
};

export type ResultGroup = {
    title: string;
    items: ResultItem[];
    show: boolean;
};

type TaxResultBoxProps = {
    items?: ResultItem[];
    groups?: ResultGroup[];
    totalLabel: string;
    totalValue: number;
    shareNote?: string;
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

const TaxResultBox = ({ items, groups, totalLabel, totalValue, shareNote }: TaxResultBoxProps) => (
    <div className="re-result-box">
        {/* 紙では「入力条件」と対になるブロックなので、同じ体裁の見出しを付ける */}
        <h2 className="print-only print-block-title">計算結果</h2>
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
        {shareNote && <p className="re-result-share-note">（{shareNote} 適用済み）</p>}
    </div>
);

export default TaxResultBox;
