import {
    ComposedChart, Area, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import type { DiagnosisResult } from '@/types';
import { formatMan } from '@/lib/utils';

type Props = {
    result: DiagnosisResult;
};

const AssetTransitionChart = ({ result }: Props) => {
    const data = result.cash_flow_table
        .filter((_, i) => i % 5 === 0 || i === result.cash_flow_table.length - 1)
        .map(row => ({
            age: `${row.age}歳`,
            cash_value: row.cash_value,
            cumulative_premium: row.cumulative_premium,
            return_rate: row.return_rate,
        }));

    if (data.length === 0) return null;

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-bold text-green-800 mb-3">資産推移グラフ</h4>
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
                            name === 'cash_value' ? '解約返戻金' : '累計保険料',
                        ]}
                    />
                    <Legend
                        formatter={(value: string) =>
                            value === 'cash_value' ? '解約返戻金' : '累計保険料'
                        }
                        wrapperStyle={{ fontSize: '12px' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="cash_value"
                        fill="#dcfce7"
                        stroke="#166534"
                        strokeWidth={2}
                        fillOpacity={0.4}
                    />
                    <Line
                        type="monotone"
                        dataKey="cumulative_premium"
                        stroke="#6b7280"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                    />
                    <ReferenceLine y={0} stroke="#000" />
                </ComposedChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-400 text-center mt-2">
                解約返戻金が累計保険料を超えた時点が損益分岐点です
            </p>
        </div>
    );
};

export default AssetTransitionChart;
