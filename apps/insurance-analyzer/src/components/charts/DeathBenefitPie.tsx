import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { DiagnosisResult } from '@/types';
import { formatCurrency } from '@/lib/utils';

const COLORS = ['#166534', '#15803d', '#22c55e', '#86efac'];

type Props = {
    result: DiagnosisResult;
};

const DeathBenefitPie = ({ result }: Props) => {
    const { coverage } = result.form_data;

    const data = [
        { name: '死亡保障（疾病）', value: coverage.death_benefit_disease },
        { name: '災害死亡上乗せ', value: Math.max(0, coverage.death_benefit_accident - coverage.death_benefit_disease) },
        { name: '入院保障（年換算）', value: coverage.hosp_day_disease * 365 },
        { name: '診断一時金', value: coverage.diagnosis_benefit },
    ].filter(d => d.value > 0);

    if (data.length === 0) return null;

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-bold text-green-800 mb-3">保障構成</h4>
            <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                    >
                        {data.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${formatCurrency(value)}円`} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default DeathBenefitPie;
