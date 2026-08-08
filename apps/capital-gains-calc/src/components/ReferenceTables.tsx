import { MINIMUM_TAX_RATE, MINIMUM_TAX_START_YEAR, MINIMUM_TAX_THRESHOLD } from "@/lib/minimum-tax";
import { BUILDING_STRUCTURES, LONG_TERM_RATE, REDUCED_RATE, SECURITIES_RATE, SHORT_TERM_RATE, totalRate } from "@/lib/tax-rates";
import { formatRate, formatYen } from "@/lib/utils";

const MINIMUM_TAX_ROWS = [
    { item: "適用年分", detail: `令和7年分（${MINIMUM_TAX_START_YEAR}年分）以後の所得税` },
    { item: "判定の基準", detail: `基準所得金額が ${formatYen(MINIMUM_TAX_THRESHOLD)} を超える場合` },
    { item: "税率", detail: `3億3,000万円を超える部分に ${MINIMUM_TAX_RATE * 100}%（別途、追加分に復興特別所得税2.1%）` },
    {
        item: "基準所得金額",
        detail: "申告不要制度を適用しないで計算した合計所得金額（特別控除後）。分離課税の譲渡所得や申告不要の配当等も含む。NISA等の非課税所得は含まない",
    },
    {
        item: "基準所得税額",
        detail: "基準所得金額に係る所得税額。復興特別所得税を含まず、外国税額控除等の適用前の金額",
    },
    { item: "住民税", detail: "影響しない（追加課税は所得税のみ）" },
];

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

const ReferenceTables = () => (
    <section className="ref-tables">
        <h2>参考資料</h2>

        <div className="ref-block">
            <h3>税率一覧</h3>
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
        </div>

        <div className="ref-block">
            <h3>非事業用建物の償却率（旧定額法・耐用年数の1.5倍）</h3>
            <div className="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">構造</th>
                            <th scope="col">法定耐用年数</th>
                            <th scope="col">非事業用の耐用年数</th>
                            <th scope="col">償却率</th>
                        </tr>
                    </thead>
                    <tbody>
                        {BUILDING_STRUCTURES.map((s) => (
                            <tr key={s.key}>
                                <th scope="row">{s.label}</th>
                                <td className="value-cell">{s.statutoryYears}年</td>
                                <td className="value-cell">{s.nonBusinessYears}年</td>
                                <td className="value-cell">{s.rate}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="ref-note">
                償却費相当額 ＝ 建物の取得価額 × 0.9 × 償却率 × 経過年数（取得価額の95%が上限）
            </p>
        </div>

        <div className="ref-block">
            <h3>ミニマムタックス（極めて高い水準の所得に対する課税）</h3>
            <div className="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">項目</th>
                            <th scope="col">内容</th>
                        </tr>
                    </thead>
                    <tbody>
                        {MINIMUM_TAX_ROWS.map((row) => (
                            <tr key={row.item}>
                                <th scope="row">{row.item}</th>
                                <td>{row.detail}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="ref-note">
                追加納付額 ＝ （基準所得金額 − 3億3,000万円）× {MINIMUM_TAX_RATE * 100}% − 基準所得税額（プラスの場合）
            </p>
        </div>
    </section>
);

export default ReferenceTables;
