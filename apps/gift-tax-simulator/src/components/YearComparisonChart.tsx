import { useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    type TooltipItem,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { type YearComparisonResult } from '@/lib/tax-calculation';
import { formatCurrency } from '@/lib/utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
                label: (context: TooltipItem<'bar'>) => {
                    const value = context.parsed.y;
                    return `合計税額: ${formatCurrency(value)} 円`;
                },
            },
        },
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                callback: (value: number | string) =>
                    typeof value === 'number' ? formatCurrency(value) : value,
            },
        },
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
