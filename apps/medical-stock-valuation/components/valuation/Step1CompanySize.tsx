type Props = {
    employees: string;
    setEmployees: (value: string) => void;
    totalAssets: string;
    setTotalAssets: (value: string) => void;
    sales: string;
    setSales: (value: string) => void;
};

const FIELDS = [
    {
        key: 'employees' as const,
        setter: 'setEmployees' as const,
        label: '正職員数',
        options: ['5人以下', '5人超20人以下', '20人超35人以下', '35人超70人未満', '70人以上'],
    },
    {
        key: 'totalAssets' as const,
        setter: 'setTotalAssets' as const,
        label: '貸借対照表の「総資産」の金額',
        options: ['4,000万円未満', '4,000万円以上2億5,000万円未満', '2億5,000万円以上5億円未満', '5億円以上15億円未満', '15億円以上'],
    },
    {
        key: 'sales' as const,
        setter: 'setSales' as const,
        label: '損益計算書の「事業収益（又は医業収益、売上高）」の合計額',
        options: ['6,000万円未満', '6,000万円以上2億5,000万円未満', '2億5,000万円以上5億円未満', '5億円以上20億円未満', '20億円以上'],
    },
];

export default function Step1CompanySize(props: Props) {
    return (
        <div className="card">
            <h2 className="mt-0">STEP１．医療法人の規模を判定するためのデータを選択する（「小売・サービス業」）</h2>
            <table>
                <tbody>
                    <tr>
                        <th className="text-left w-1/3">項目</th>
                        <th className="text-left">入力</th>
                    </tr>
                    {FIELDS.map(({ key, setter, label, options }) => (
                        <tr key={key}>
                            <td>{label}</td>
                            <td>
                                <select
                                    value={props[key]}
                                    onChange={(e) => props[setter](e.target.value)}
                                >
                                    <option value="">選択してください</option>
                                    {options.map((opt, i) => (
                                        <option key={i} value={(i + 1).toString()}>{opt}</option>
                                    ))}
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
