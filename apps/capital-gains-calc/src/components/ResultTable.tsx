import type { ResultRow } from "@/lib/result-rows";

type ResultTableProps = {
    caption: string;
    rows: ResultRow[];
};

/**
 * 結果表示テーブル。行は配列で渡してデータ駆動で描画する。
 * 行の高さを揃えるため、ラベルは1行に収める（補足は括弧書きで label に入れる）。
 */
const ResultTable = ({ caption, rows }: ResultTableProps) => (
    <div className="result-block">
        <h3>{caption}</h3>
        <table>
            <tbody>
                {rows.map((row, index) => (
                    <tr key={`${row.label}-${index}`} className={row.highlight ? "highlight-row" : undefined}>
                        <th scope="row" className={row.sub ? "sub-label" : undefined}>
                            {row.label}
                        </th>
                        <td className="value-cell">{row.value}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default ResultTable;
