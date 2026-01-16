"use client";

import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { CalculationResult } from '@/lib/tax-calculation';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

type Props = {
    results: CalculationResult[];
};

const TaxChart: React.FC<Props> = ({ results }) => {
    const labels = results.map(r => r.name);
    const taxes = results.map(r => r.totalTax);

    const data = {
        labels,
        datasets: [
            {
                label: 'トータル贈与税額',
                data: taxes,
                backgroundColor: 'rgba(27, 94, 32, 0.8)', // #1b5e20 の0.8
                borderColor: '#1b5e20',
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('ja-JP').format(context.parsed.y) + ' 円';
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value: any) {
                        return new Intl.NumberFormat('ja-JP').format(value);
                    }
                }
            }
        }
    };

    return (
        <div className="chart-container-custom">
            <Bar data={data} options={options} />
        </div>
    );
};

export default TaxChart;
