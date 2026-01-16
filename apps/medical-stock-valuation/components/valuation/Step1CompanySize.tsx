type Props = {
    employees: string;
    setEmployees: (value: string) => void;
    totalAssets: string;
    setTotalAssets: (value: string) => void;
    sales: string;
    setSales: (value: string) => void;
};

export default function Step1CompanySize({
    employees,
    setEmployees,
    totalAssets,
    setTotalAssets,
    sales,
    setSales,
}: Props) {
    return (
        <div className="card">
            <h2 className="mt-0">STEP１．医療法人の規模を判定するためのデータを選択する（「小売・サービス業」）</h2>
            <table>
                <tbody>
                    <tr>
                        <th className="text-left w-1/3">項目</th>
                        <th className="text-left">入力</th>
                    </tr>
                    <tr>
                        <td>正職員数</td>
                        <td>
                            <select
                                value={employees}
                                onChange={(e) => setEmployees(e.target.value)}
                            >
                                <option value="">選択してください</option>
                                <option value="1">5人以下</option>
                                <option value="2">5人超20人以下</option>
                                <option value="3">20人超35人以下</option>
                                <option value="4">35人超70人未満</option>
                                <option value="5">70人以上</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>貸借対照表の「総資産」の金額</td>
                        <td>
                            <select
                                value={totalAssets}
                                onChange={(e) => setTotalAssets(e.target.value)}
                            >
                                <option value="">選択してください</option>
                                <option value="1">4,000万円未満</option>
                                <option value="2">4,000万円以上2億5,000万円未満</option>
                                <option value="3">2億5,000万円以上5億円未満</option>
                                <option value="4">5億円以上15億円未満</option>
                                <option value="5">15億円以上</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>損益計算書の「事業収益（又は医業収益、売上高）」の合計額</td>
                        <td>
                            <select
                                value={sales}
                                onChange={(e) => setSales(e.target.value)}
                            >
                                <option value="">選択してください</option>
                                <option value="1">6,000万円未満</option>
                                <option value="2">6,000万円以上2億5,000万円未満</option>
                                <option value="3">2億5,000万円以上5億円未満</option>
                                <option value="4">5億円以上20億円未満</option>
                                <option value="5">20億円以上</option>
                            </select>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
