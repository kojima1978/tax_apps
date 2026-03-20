import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
    type TooltipItem,
} from 'chart.js';
import { formatCurrency } from './utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export const BASE_CHART_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
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

const formatTooltipYen = (context: TooltipItem<'bar'>) => {
    const label = context.dataset.label || '';
    const value = context.parsed.y;
    return value !== null ? `${label}: ${formatCurrency(value)} 円` : label;
};

export const CHART_OPTIONS = {
    ...BASE_CHART_OPTIONS,
    plugins: {
        ...BASE_CHART_OPTIONS.plugins,
        tooltip: { callbacks: { label: formatTooltipYen } },
    },
} as const;
