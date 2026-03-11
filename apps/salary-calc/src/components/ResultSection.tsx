import { useCallback } from 'react';
import { formatYen } from '@/lib/utils';
import { TrendingDown, Wallet, Printer } from 'lucide-react';

export interface ResultItem {
  label: string;
  value: number;
  isBold?: boolean;
  sub?: string;
}

interface ResultSectionProps {
  type: 'salary' | 'bonus';
  items: ResultItem[];
  takeHomePay: number;
  grossAmount: number;
}

export function ResultSection({ type, items, takeHomePay, grossAmount }: ResultSectionProps) {
  const takeHomeRate = grossAmount > 0 ? ((takeHomePay / grossAmount) * 100).toFixed(1) : '0';
  const title = type === 'salary' ? '月額給与' : '賞与';

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-gray-300 print:mt-0">
      <div className="bg-[var(--color-primary-50)] px-6 py-4 border-b border-blue-100 flex items-center justify-between print:bg-white print:border-gray-300">
        <h3 className="text-lg font-bold text-[var(--color-primary-dark)] flex items-center gap-2 print:text-black">
          <TrendingDown size={20} className="print:hidden" />
          {title}の計算結果
        </h3>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--color-primary)] hover:bg-blue-100 rounded-lg transition cursor-pointer print:hidden"
        >
          <Printer size={16} />
          印刷
        </button>
      </div>

      <div className="p-6">
        <div className="space-y-2">
          {items.map((item, i) => (
            <div
              key={i}
              className={`flex items-center justify-between py-2 ${
                item.isBold
                  ? 'border-t border-gray-200 pt-3 mt-1'
                  : ''
              }`}
            >
              <div>
                <span className={`text-sm ${item.isBold ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
                  {item.label}
                </span>
                {item.sub && (
                  <span className="block text-xs text-gray-400">{item.sub}</span>
                )}
              </div>
              <span
                className={`font-mono text-sm ${
                  item.isBold ? 'font-bold' : ''
                } ${item.value < 0 ? 'text-red-600 print:text-black' : 'text-gray-800'}`}
              >
                {item.value < 0 ? '- ' : ''}{formatYen(Math.abs(item.value))}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] rounded-xl p-6 text-white print:bg-gray-100 print:text-black print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet size={28} className="print:hidden" />
              <div>
                <p className="text-sm text-blue-100 print:text-gray-500">手取り金額</p>
                <p className="text-3xl font-bold tracking-tight">{formatYen(takeHomePay)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-100 print:text-gray-500">手取り率</p>
              <p className="text-2xl font-bold">{takeHomeRate}%</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          ※ 令和8年分の税額表・保険料率に基づく概算です。実際の金額とは異なる場合があります。
        </p>
      </div>
    </div>
  );
}
