import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { type YearComparisonResult } from '@/lib/tax-calculation';
import { BASE_CHART_OPTIONS, formatTooltipYen } from '@/lib/chart-config';

const chartOptions = {
    ...BASE_CHART_OPTIONS,
    plugins: {
        ...BASE_CHART_OPTIONS.plugins,
        tooltip: { callbacks: { label: formatTooltipYen } },
    },
} as const;

type Props = {
    results: YearComparisonResult[];
};

const YearComparisonChart = ({ results }: Props) => {
    const data = useMemo(() => ({
        labels: results.map(r => `${r.years}年`),
        datasets: [{
            label: '合計税額',
            data: results.map(r => r.totalTax),
            backgroundColor: results.map(r =>
                r.optimal ? 'rgba(22, 101, 52, 0.9)' : 'rgba(22, 163, 74, 0.35)'
            ),
            borderColor: results.map(r =>
                r.optimal ? '#166534' : '#16a34a'
            ),
            borderWidth: 1,
        }],
    }), [results]);

    return (
        <div className="chart-container-custom">
            <Bar data={data} options={chartOptions} />
        </div>
    );
};

export default YearComparisonChart;
