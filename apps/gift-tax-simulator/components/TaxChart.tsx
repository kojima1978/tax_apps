"use client";

import { useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    type TooltipItem,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { type CalculationResult } from '@/lib/tax-calculation';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const formatJPY = (value: number) => new Intl.NumberFormat('ja-JP').format(value);

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
                label: (context: TooltipItem<'bar'>) => {
                    const label = context.dataset.label || '';
                    const value = context.parsed.y;
                    return value !== null ? `${label}: ${formatJPY(value)} 円` : label;
                }
            }
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                callback: (value: number | string) =>
                    typeof value === 'number' ? formatJPY(value) : value
            }
        }
    }
} as const;

type Props = {
    results: CalculationResult[];
};

const TaxChart = ({ results }: Props) => {
    const data = useMemo(() => ({
        labels: results.map(r => r.name),
        datasets: [{
            label: 'トータル贈与税額',
            data: results.map(r => r.totalTax),
            backgroundColor: 'rgba(27, 94, 32, 0.8)',
            borderColor: '#1b5e20',
            borderWidth: 1,
        }],
    }), [results]);

    return (
        <div className="chart-container-custom">
            <Bar data={data} options={chartOptions} />
        </div>
    );
};

export default TaxChart;
