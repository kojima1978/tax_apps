import { TAX_RATES, formatBracketRange, isBracketActive } from "@/lib/tax-rates";
import { formatCurrency, formatYen } from "@/lib/utils";

type ReferenceTablesProps = {
    serviceYears: number;
    taxableIncome: number;
    taxYear: string;
};

const ReferenceTables = ({ serviceYears, taxableIncome, taxYear }: ReferenceTablesProps) => {
    const brackets = TAX_RATES[taxYear].brackets;

    return (
        <div className="ref-tables">
            <h3 className="ref-title">退職所得控除額</h3>
            <div className="table-container">
                <table className="ref-table">
                    <thead>
                        <tr>
                            <th>勤続年数</th>
                            <th>控除額</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className={serviceYears <= 20 ? "ref-active" : ""}>
                            <td>20年以下</td>
                            <td>40万円 × 勤続年数（最低80万円）</td>
                        </tr>
                        <tr className={serviceYears > 20 ? "ref-active" : ""}>
                            <td>20年超</td>
                            <td>800万円 + 70万円 ×（勤続年数 − 20年）</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p className="ref-note">※ 障害者になったことに直接基因して退職した場合は上記金額に100万円を加算</p>
            <p className="ref-note">※ 勤続年数に1年未満の端数がある場合は1年に切上げ</p>

            <h3 className="ref-title">退職所得の源泉徴収税額の速算表</h3>
            <div className="table-container">
                <table className="ref-table">
                    <thead>
                        <tr>
                            <th>課税退職所得金額</th>
                            <th className="value-col">税率</th>
                            <th className="value-col">控除額</th>
                        </tr>
                    </thead>
                    <tbody>
                        {brackets.map((bracket, idx) => (
                            <tr key={idx} className={isBracketActive(taxableIncome, idx, brackets) ? "ref-active" : ""}>
                                <td>{formatBracketRange(idx, bracket, brackets, formatCurrency)}</td>
                                <td className="value-cell">{(bracket.rate * 100).toFixed(0)}%</td>
                                <td className="value-cell">{formatYen(bracket.deduction)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="ref-note">※ 求めた税額に102.1%を乗じた金額が源泉徴収税額（所得税+復興特別所得税）</p>
            <p className="ref-note ref-source">
                出典:
                <a href="https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1420.htm" target="_blank" rel="noopener noreferrer">国税庁 No.1420 退職金を受け取ったとき</a>
                {" / "}
                <a href="https://www.nta.go.jp/taxes/shiraberu/taxanswer/gensen/2732_besshi.htm" target="_blank" rel="noopener noreferrer">No.2732 退職所得の源泉徴収税額速算表</a>
            </p>
        </div>
    );
};

export default ReferenceTables;
