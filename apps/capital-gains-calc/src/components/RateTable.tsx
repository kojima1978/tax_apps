import { LONG_TERM_RATE, REDUCED_RATE, SECURITIES_RATE, SHORT_TERM_RATE, totalRate } from "@/lib/tax-rates";
import { formatRate } from "@/lib/utils";

const RATE_ROWS = [
    {
        category: "不動産（短期譲渡）",
        condition: "譲渡年1月1日時点の所有期間 5年以下",
        rate: SHORT_TERM_RATE,
    },
    {
        category: "不動産（長期譲渡）",
        condition: "譲渡年1月1日時点の所有期間 5年超",
        rate: LONG_TERM_RATE,
    },
    {
        category: "居住用財産の軽減税率",
        condition: "所有期間10年超・課税譲渡所得6,000万円以下の部分",
        rate: REDUCED_RATE,
    },
    {
        category: "株式等",
        condition: "上場株式等・一般株式等（申告分離課税）",
        rate: SECURITIES_RATE,
    },
];

/** 税率一覧。参考資料（2枚目）と、備考欄が空のときの余白埋めの両方で使う */
const RateTable = () => (
    <div className="table-scroll">
        <table>
            <thead>
                <tr>
                    <th scope="col">区分</th>
                    <th scope="col">要件</th>
                    <th scope="col">所得税</th>
                    <th scope="col">住民税</th>
                    <th scope="col">合計</th>
                </tr>
            </thead>
            <tbody>
                {RATE_ROWS.map((row) => (
                    <tr key={row.category}>
                        <th scope="row">{row.category}</th>
                        <td>{row.condition}</td>
                        <td className="value-cell">
                            {formatRate(row.rate.incomeTax)}
                            <small>＋復興 {formatRate(row.rate.reconstruction)}</small>
                        </td>
                        <td className="value-cell">{formatRate(row.rate.residentTax)}</td>
                        <td className="value-cell">{formatRate(totalRate(row.rate))}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default RateTable;
