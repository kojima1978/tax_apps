import { formatYen, formatPercent } from '@/lib/utils';
import type { TaxResult } from '@/lib/tax-calc';

interface Props {
  result: TaxResult;
}

const RESULT_ROWS: {
  symbol: string;
  label: string;
  getValue: (r: TaxResult) => number;
  format?: (r: TaxResult) => string;
  highlight?: boolean;
  color?: string;
}[] = [
  { symbol: '㉛', label: '課税される所得金額', getValue: r => r.taxableIncome, color: 'text-gray-900' },
  { symbol: '㉜', label: '上の㉛に対する税額', getValue: r => r.incomeTax, format: r => `${formatPercent(r.taxRate)} − ${formatYen(r.taxDeductionAmount)}円`, color: 'text-gray-900' },
  { symbol: '㊳', label: '復興特別所得税額', getValue: r => r.reconstructionTax, format: () => '所得税額 × 2.1%', color: 'text-gray-900' },
  { symbol: '㊴', label: '所得税及び復興特別所得税の額', getValue: r => r.totalTax, highlight: true, color: 'text-red-700' },
];

export default function Section3TaxCalc({ result }: Props) {
  return (
    <section className="animate-fade-in">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-red-800 text-white px-4 py-2.5">
          <h2 className="text-sm font-bold tracking-wide">税金の計算</h2>
        </div>
        <div className="px-4 py-2 divide-y divide-gray-100">
          {RESULT_ROWS.map(row => (
            <div
              key={row.symbol}
              className={`flex items-center justify-between py-3 ${row.highlight ? 'bg-red-50 -mx-4 px-4' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className={`field-label-symbol ${row.highlight ? 'bg-red-700 text-white' : 'bg-red-100 text-red-800'}`}>
                  {row.symbol}
                </span>
                <div>
                  <span className={`text-sm font-medium ${row.color}`}>{row.label}</span>
                  {row.format && (
                    <div className="text-xs text-gray-500">{row.format(result)}</div>
                  )}
                </div>
              </div>
              <div className={`font-mono-num text-right ${row.highlight ? 'text-lg font-bold' : 'text-sm font-medium'} ${row.color}`}>
                {formatYen(row.getValue(result))}<span className="text-xs font-normal text-gray-500 ml-0.5">円</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
