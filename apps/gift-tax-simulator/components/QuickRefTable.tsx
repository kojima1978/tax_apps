"use client";

import { formatMan, formatPercent } from '@/lib/utils';

export type QuickRefRow = {
    amount: number;
    tax: number;
    rate: number;
};

type QuickRefTableProps = {
    title: string;
    data: QuickRefRow[];
    colorClass: 'special' | 'general';
    note: string;
};

const QuickRefTable = ({ title, data, colorClass, note }: QuickRefTableProps) => {
    const headerClass = colorClass === 'special' ? 'header-special' : 'header-general';

    return (
        <section className="tax-table-section">
            <h2 className={`table-section-title ${colorClass}`}>{title}</h2>
            <div className="table-container">
                <table className="tax-table-single">
                    <thead>
                        <tr>
                            <th className={headerClass}>贈与財産の価額</th>
                            <th className={headerClass}>税額</th>
                            <th className={headerClass}>実効税率</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr key={row.amount} className={row.tax === 0 ? 'row-zero-tax' : ''}>
                                <td className="col-amount">{formatMan(row.amount)}</td>
                                <td className={row.tax > 0 ? 'highlight-total' : ''}>
                                    {formatMan(row.tax)}
                                </td>
                                <td>{formatPercent(row.rate)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className={`table-note note-${colorClass}`}>{note}</p>
        </section>
    );
};

export default QuickRefTable;
