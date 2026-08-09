import { formatMan, formatPercent } from '@/lib/utils';
import NumberUnit from '@/components/shared/NumberUnit';

export type QuickRefRow = {
    amount: number;
    tax: number;
    rate: number;
    /** よく参照される金額の行（強調表示する） */
    keyAmount?: boolean;
};

type QuickRefTableProps = {
    title: string;
    data: QuickRefRow[];
    note: string;
};

const QuickRefTable = ({ title, data, note }: QuickRefTableProps) => (
    <section className="tax-table-section">
        {/* 見出し・表・注記ともアプリ共通の緑ベース。特例／一般は見出しの文言で区別する */}
        <h2 className="table-section-title">{title}</h2>
        <div className="table-container">
            <table className="tax-table-single">
                <thead>
                    <tr>
                        <th>贈与財産の価額</th>
                        <th>税額</th>
                        <th>実効税率</th>
                    </tr>
                </thead>
                <tbody>
                    {/* 税額0円の行も他の行と同じ体裁にする（灰色にしない） */}
                    {data.map((row) => (
                        <tr key={row.amount} className={row.keyAmount ? 'row-key-amount' : ''}>
                            <td className="col-amount">
                                <NumberUnit text={formatMan(row.amount)} />
                            </td>
                            <td className="highlight-total">
                                <NumberUnit text={formatMan(row.tax)} />
                            </td>
                            <td>
                                <NumberUnit text={formatPercent(row.rate)} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <p className="table-note">{note}</p>
    </section>
);

export default QuickRefTable;
