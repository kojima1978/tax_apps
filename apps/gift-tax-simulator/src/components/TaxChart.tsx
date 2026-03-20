import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { type CalculationResult } from '@/lib/tax-calculation';
import { CHART_OPTIONS } from '@/lib/chart-config';

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
            <Bar data={data} options={CHART_OPTIONS} />
        </div>
    );
};

export default TaxChart;
