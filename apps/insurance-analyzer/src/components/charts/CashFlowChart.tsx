import {
    ComposedChart, Bar, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { DiagnosisResult } from '@/types';
import { formatMan } from '@/lib/utils';

type Props = {
    result: DiagnosisResult;
};

const CashFlowChart = ({ result }: Props) => {
    const data = result.cash_flow_table
        .filter((_, i) => i % 5 === 0 || i === result.cash_flow_table.length - 1)
        .map(row => ({
            age: `${row.age}歳`,
            annual_premium: row.annual_premium,
            cumulative_premium: row.cumulative_premium,
        }));

    if (data.length === 0) return null;

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-bold text-green-800 mb-3">保険料キャッシュフロー</h4>
            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                    <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: number) => formatMan(v)}
                    />
                    <Tooltip
                        formatter={(value: number, name: string) => [
                            `${formatMan(value)}`,
                            name === 'annual_premium' ? '年間保険料' : '累計保険料',
                        ]}
                    />
                    <Legend
                        formatter={(value: string) =>
                            value === 'annual_premium' ? '年間保険料' : '累計保険料'
                        }
                        wrapperStyle={{ fontSize: '12px' }}
                    />
                    <Bar dataKey="annual_premium" fill="#15803d" barSize={20} />
                    <Line
                        type="monotone"
                        dataKey="cumulative_premium"
                        stroke="#166534"
                        strokeWidth={2}
                        dot={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default CashFlowChart;
