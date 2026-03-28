import { useCallback, useMemo } from 'react';
import { formatYen } from '@/lib/utils';
import { TrendingDown, Wallet, Printer } from 'lucide-react';

export interface ResultItem {
  label: string;
  value: number;
  isBold?: boolean;
  sub?: string;
  subs?: string[];
}

interface ResultSectionProps {
  type: 'salary' | 'bonus';
  items: ResultItem[];
  takeHomePay: number;
  grossAmount: number;
}

function TakeHomeRing({ rate }: { rate: number }) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (rate / 100) * circumference;

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-white/20 print:text-gray-200" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke="currentColor" strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-white print:text-gray-700 transition-all duration-500"
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="46" textAnchor="middle" className="fill-current text-white print:text-black text-xs font-bold">{rate.toFixed(1)}%</text>
      <text x="50" y="60" textAnchor="middle" className="fill-current text-blue-100 print:text-gray-500" style={{ fontSize: '8px' }}>手取り率</text>
    </svg>
  );
}

function DeductionBar({ label, amount, maxAmount }: { label: string; amount: number; maxAmount: number }) {
  const pct = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-gray-500 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden print:bg-gray-200">
        <div
          className="h-full bg-red-400 rounded-full transition-all duration-300 print:bg-gray-500"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="w-20 text-right font-mono text-gray-600 shrink-0">{formatYen(amount)}</span>
    </div>
  );
}

export function ResultSection({ type, items, takeHomePay, grossAmount }: ResultSectionProps) {
  const takeHomeRate = grossAmount > 0 ? (takeHomePay / grossAmount) * 100 : 0;
  const title = type === 'salary' ? '月額給与' : '賞与';

  const deductionItems = useMemo(() =>
    items.filter(item => item.value < 0 && !item.isBold),
    [items],
  );
  const maxDeduction = useMemo(() =>
    Math.max(...deductionItems.map(d => Math.abs(d.value)), 1),
    [deductionItems],
  );

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-gray-300">
      <div className="bg-[var(--color-primary-50)] px-6 py-4 border-b border-blue-100 flex items-center justify-between print:bg-white print:border-gray-300">
        <h3 className="text-lg font-bold text-[var(--color-primary-dark)] flex items-center gap-2 print:text-black">
          <TrendingDown size={20} className="print:hidden" />
          {title}の計算結果
        </h3>
        <button
          onClick={handlePrint}
          aria-label="結果を印刷"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--color-primary)] hover:bg-blue-100 rounded-lg transition cursor-pointer print:hidden"
        >
          <Printer size={16} />
          印刷
        </button>
      </div>

      <div className="p-6">
        {/* Take-home highlight */}
        <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] rounded-xl p-5 text-white mb-6 print:bg-gray-100 print:text-black print:border print:border-gray-300">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Wallet size={24} className="shrink-0 print:hidden" />
              <div className="min-w-0">
                <p className="text-sm text-blue-100 print:text-gray-500">手取り金額</p>
                <p className="text-3xl font-bold tracking-tight font-mono">{formatYen(takeHomePay)}</p>
              </div>
            </div>
            <TakeHomeRing rate={takeHomeRate} />
          </div>
        </div>

        {/* Deduction bar chart */}
        {deductionItems.length > 0 && (
          <div className="mb-6 space-y-1.5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">控除内訳</p>
            {deductionItems.map((item, i) => (
              <DeductionBar
                key={i}
                label={item.label}
                amount={Math.abs(item.value)}
                maxAmount={maxDeduction}
              />
            ))}
          </div>
        )}

        {/* Detail table */}
        <div className="space-y-1">
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
                {item.subs?.map((s, j) => (
                  <span key={j} className="block text-xs text-gray-400">{s}</span>
                ))}
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

        <p className="text-xs text-gray-400 mt-4 text-center">
          ※ 令和8年分の税額表・保険料率に基づく概算です。実際の金額とは異なる場合があります。
        </p>
      </div>
    </div>
  );
}
